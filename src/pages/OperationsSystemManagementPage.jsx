import { useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts'
import AttentionModal from '../components/AttentionModal'
import SelectDropdown from '../components/SelectDropdown'
import TimePickerModal from '../components/TimePickerModal'
import dateIcon from '../assets/icons/date.svg'
import closeIcon from '../assets/icons/close.svg'
import {
  useOpsCurveQuery,
  useOpsHeatPumpListQuery,
  useOpsHeatPumpSingleQuery,
  useOpsSystemConfigQuery,
  useOpsSystemStateQuery,
} from '@/features/operations/hooks/useOperationsQueries'
import { useMeterConfig } from '@/features/operations/store/meterConfigStore'
import './OperationsSystemManagementPage.css'

const DATETIME_YEARS = Array.from({ length: 11 }, (_, index) => 2020 + index)
const DATETIME_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)
const DATETIME_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)
const DATETIME_HOURS = Array.from({ length: 24 }, (_, index) => index)
const DATETIME_MINUTES = Array.from({ length: 60 }, (_, index) => index)
const HOUR_IN_MS = 60 * 60 * 1000
const DAY_IN_MS = 24 * HOUR_IN_MS
/** 运维历史曲线查询范围上限：最长 3 天（含） */
const MAX_TREND_RANGE_MS = 3 * DAY_IN_MS

const SETTING_OPTIONS = [
  { value: 'mode-select', label: '模式选择' },
  { value: 'climate-compensation', label: '气候补偿' },
  { value: 'smart-timer', label: '智能定时' },
  { value: 'smart-start-stop', label: '智能启停' },
  { value: 'peak-valley', label: '热电协同' },
  { value: 'coupling-energy', label: '耦合能源' },
  { value: 'heat-pump', label: '热泵' },
  { value: 'water-pump', label: '水泵' },
  { value: 'constant-pressure-pump', label: '定压泵' },
  { value: 'heat-trace', label: '伴热带' },
  { value: 'drain-valve', label: '排污阀' },
  { value: 'relief-valve', label: '泄压阀' },
  { value: 'project-system-type', label: '项目系统类型' },
  { value: 'energy-price', label: '能源价格' },
  { value: 'system', label: '系统' },
  { value: 'heat-pump-meter', label: '热泵电表' },
  { value: 'water-pump-meter', label: '水泵电表' },
  { value: 'coupling-energy-meter', label: '耦合能源电表' },
  { value: 'water-meter', label: '水表' },
  { value: 'heat-meter', label: '热表' },
]

/**
 * 电表组设置项：选中后按配置数量展示电表卡片（数量存 meterConfigStore，受后端支持范围约束），
 * 点击卡片才调接口取数。single 表示后端仅支持一个点位，code 不带序号（如水表）。
 */
const METER_GROUP_SETTING_MAP = {
  'heat-pump-meter': { prefix: '热泵电表', configKey: 'heatPumpMeterCount' },
  'water-pump-meter': { prefix: '水泵电表', configKey: 'waterPumpMeterCount' },
  'coupling-energy-meter': { prefix: '耦合能源电表', configKey: 'couplingMeterCount' },
  'water-meter': { prefix: '水表', configKey: 'waterMeterCount', single: true },
  'heat-meter': { prefix: '热表', configKey: 'heatMeterCount' },
}

function createMeterGroupCards({ prefix, count, single = false }) {
  return Array.from({ length: count }, (_, index) => {
    const meterCode = single ? prefix : `${prefix}${index + 1}`
    return { key: `meter-${meterCode}`, label: meterCode, value: '', meterCode }
  })
}
function padNumber(value) {
  return String(value).padStart(2, '0')
}

function getCurrentDateTimeParts() {
  const now = new Date()
  return [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()]
}

function getDefaultTrendTimeRange() {
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - HOUR_IN_MS)

  return {
    startTime: normalizeDateTime(
      `${startDate.getFullYear()}-${padNumber(startDate.getMonth() + 1)}-${padNumber(startDate.getDate())} ${padNumber(startDate.getHours())}:${padNumber(startDate.getMinutes())}`,
    ),
    endTime: normalizeDateTime(
      `${endDate.getFullYear()}-${padNumber(endDate.getMonth() + 1)}-${padNumber(endDate.getDate())} ${padNumber(endDate.getHours())}:${padNumber(endDate.getMinutes())}`,
    ),
  }
}

function parseDateTime(value) {
  if (!value) {
    return getCurrentDateTimeParts()
  }

  const [datePart = '', timePart = '00:00'] = value.split(' ')
  const [year = 2024, month = 6, day = 1] = datePart.split('-').map(Number)
  const [hour = 0, minute = 0] = timePart.split(':').map(Number)
  return [year, month, day, hour, minute]
}

function formatDateTimeParts(value) {
  const [year, month, day, hour, minute] = value
  return `${year}.${padNumber(month)}.${padNumber(day)} ${padNumber(hour)}:${padNumber(minute)}:00`
}

/** 运维历史曲线接口要求 yyyy-MM-dd HH:mm:ss */
function normalizeDateTime(value) {
  const [year, month, day, hour, minute] = parseDateTime(value)
  return `${year}-${padNumber(month)}-${padNumber(day)} ${padNumber(hour)}:${padNumber(minute)}:00`
}

/** 将 yyyy-MM-dd HH:mm(:ss) 时间串平移指定毫秒后重新规范化 */
function shiftDateTime(value, offsetMs) {
  const [year, month, day, hour, minute] = parseDateTime(value)
  const shifted = new Date(new Date(year, month - 1, day, hour, minute).getTime() + offsetMs)
  return normalizeDateTime(
    `${shifted.getFullYear()}-${padNumber(shifted.getMonth() + 1)}-${padNumber(shifted.getDate())} ${padNumber(shifted.getHours())}:${padNumber(shifted.getMinutes())}`,
  )
}

function formatTimePointValue(totalMinutes) {
  const safeMinutes = Math.min(24 * 60, Math.max(0, Math.round(Number(totalMinutes) || 0)))
  const hour = Math.floor(safeMinutes / 60)
  const minute = safeMinutes % 60
  return `${padNumber(hour)}:${padNumber(minute)}`
}

const DISCRETE_CHART_TYPES = ['enum', 'state', 'switch', 'fault', 'gear']

const CONTINUOUS_CHART_FALLBACK_MAX = {
  pressure: 300,
  humidity: 100,
  noise: 80,
  current: 30,
  voltage: 450,
  energy: 1600,
  power: 8000,
  flow: 100,
  count: 40,
  price: 2,
  duration: 180,
  frequency: 60,
  percentage: 100,
  angle: 360,
  opening: 100,
  temperature: 50,
  number: 50,
}

function isFaultCodeNormal(value) {
  return Math.round(Number(value)) === -1
}

function formatFaultCodeTooltip(value) {
  const code = Math.round(Number(value))
  if (!Number.isFinite(code)) {
    return '--'
  }
  if (isFaultCodeNormal(code)) {
    return '正常'
  }
  return `故障 ${code}`
}

function extractChartValues(chartData = []) {
  return chartData.map((item) => Number(item.value)).filter((value) => Number.isFinite(value))
}

function getNiceStep(span, targetTicks = 5) {
  if (span <= 0) {
    return 1
  }

  const rough = span / Math.max(1, targetTicks - 1)
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalized = rough / magnitude
  let nice = 10

  if (normalized <= 1) {
    nice = 1
  } else if (normalized <= 2) {
    nice = 2
  } else if (normalized <= 5) {
    nice = 5
  }

  return nice * magnitude
}

function buildAxisTicks(min, max, interval, maxTicks = 6) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [max, min]
  }

  if (!Number.isFinite(interval) || interval <= 0) {
    return [max, min]
  }

  const ticks = []
  for (let value = max; value >= min - interval * 0.001 && ticks.length < maxTicks; value -= interval) {
    ticks.push(Number(value.toFixed(4)))
  }

  if (!ticks.length || ticks.at(-1) > min) {
    ticks.push(min)
  }

  return [...new Set(ticks)].sort((left, right) => right - left)
}

function buildContinuousAxisRange(values, { floorAtZero = true, minSpan = 1 } = {}) {
  if (!values.length) {
    return null
  }

  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  let dataMin = rawMin
  let dataMax = rawMax

  if (dataMin === dataMax) {
    const pad = Math.max(minSpan, Math.abs(dataMin) * 0.1, 1)
    dataMin -= pad / 2
    dataMax += pad / 2
  } else {
    const padding = (dataMax - dataMin) * 0.08
    dataMin -= padding
    dataMax += padding
  }

  if (floorAtZero && rawMin >= 0 && dataMin > 0) {
    dataMin = 0
  }

  const step = getNiceStep(dataMax - dataMin)
  const min = Math.floor(dataMin / step) * step
  const max = Math.ceil(dataMax / step) * step

  return {
    min,
    max,
    interval: step,
  }
}

function buildFaultAxisRange(values) {
  if (!values.length) {
    return { min: -2, max: 2, interval: 1 }
  }

  const codes = values.map((value) => Math.round(value))
  const dataMin = Math.min(...codes)
  const dataMax = Math.max(...codes)
  const min = dataMin - 1
  const max = dataMax + 1
  const span = max - min
  const interval = span <= 8 ? 1 : getNiceStep(span, 5)

  return { min, max, interval }
}

function shouldFloorAtZero(chartType) {
  return [
    'temperature',
    'pressure',
    'humidity',
    'noise',
    'current',
    'voltage',
    'energy',
    'power',
    'flow',
    'count',
    'percentage',
    'opening',
    'angle',
    'duration',
    'frequency',
    'gear',
    'number',
  ].includes(chartType)
}

function isLikelyContinuousEnum(metric, values) {
  if (metric.chartType !== 'enum' || metric.chartStates?.length) {
    return false
  }

  if (!values.length) {
    return false
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  return max - min > 1 || max > 1 || min < 0
}

function resolveValueDecimals(values, chartType) {
  if (chartType === 'price') {
    return 2
  }

  if (values.every((value) => Number.isInteger(value))) {
    return 0
  }

  return 1
}

function applyDataDrivenPresentation(base, chartData, metric) {
  const values = extractChartValues(chartData)
  if (!values.length) {
    return base
  }

  if (metric.chartType === 'fault') {
    const range = buildFaultAxisRange(values)
    const ticks = buildAxisTicks(range.min, range.max, range.interval)

    return {
      ...base,
      min: range.min,
      max: range.max,
      visualMin: range.min - range.interval * 0.15,
      visualMax: range.max + range.interval * 0.15,
      ticks,
      yAxisInterval: range.interval,
      formatter: (value) => `${Math.round(value)}`,
      tooltipFormatter: formatFaultCodeTooltip,
    }
  }

  if (DISCRETE_CHART_TYPES.includes(metric.chartType) && !isLikelyContinuousEnum(metric, values)) {
    if (metric.chartType === 'gear') {
      const range = buildContinuousAxisRange(values, { floorAtZero: true, minSpan: 1 })
      if (range) {
        const ticks = buildAxisTicks(range.min, range.max, range.interval)
        return {
          ...base,
          min: range.min,
          max: range.max,
          visualMin: range.min,
          visualMax: range.max,
          ticks,
          yAxisInterval: range.interval,
        }
      }
    }

    return base
  }

  const range = buildContinuousAxisRange(values, {
    floorAtZero: shouldFloorAtZero(metric.chartType),
    minSpan: metric.chartType === 'price' ? 0.1 : 1,
  })

  if (!range) {
    return base
  }

  const ticks = buildAxisTicks(range.min, range.max, range.interval)
  const decimals = resolveValueDecimals(values, metric.chartType)
  const formatter =
    decimals === 0
      ? (value) => `${Math.round(value)}`
      : (value) => `${Number(value).toFixed(decimals)}`

  return {
    ...base,
    min: range.min,
    max: range.max,
    visualMin: range.min,
    visualMax: range.max,
    ticks,
    yAxisInterval: range.interval,
    formatter,
  }
}

function getMetricPresentation(metric) {
  if (metric.chartType === 'enum') {
    const states = metric.chartStates?.length ? metric.chartStates : ['状态0', '状态1']
    const max = Math.max(1, states.length - 1)

    return {
      lineLabel: metric.label,
      yAxisLabel: metric.unit || '状态',
      ticks: Array.from({ length: max + 1 }, (_, index) => max - index),
      min: 0,
      max,
      visualMin: -0.2,
      visualMax: max + 0.2,
      formatter: (value) => `${Math.round(value)}`,
      tooltipFormatter: (value) => states[Math.round(value)] ?? states[0],
    }
  }

  if (metric.chartType === 'state') {
    return {
      lineLabel: metric.label,
      yAxisLabel: '状态',
      ticks: [1, 0],
      min: 0,
      max: 1,
      visualMin: -0.2,
      visualMax: 1.2,
      formatter: (value) => `${Math.round(value)}`,
      tooltipFormatter: (value) => (value >= 0.5 ? '运行' : '待机'),
    }
  }

  if (metric.chartType === 'switch') {
    return {
      lineLabel: metric.label,
      yAxisLabel: '开关',
      ticks: [1, 0],
      min: 0,
      max: 1,
      visualMin: -0.2,
      visualMax: 1.2,
      formatter: (value) => `${Math.round(value)}`,
      tooltipFormatter: (value) => (value >= 0.5 ? '开启' : '关闭'),
    }
  }

  if (metric.chartType === 'timepoint') {
    return {
      lineLabel: metric.label,
      yAxisLabel: '时间',
      ticks: [1440, 1080, 720, 360, 0],
      min: 0,
      max: 24 * 60,
      visualMin: -30,
      visualMax: 24 * 60 + 30,
      formatter: (value) => formatTimePointValue(value),
      tooltipFormatter: (value) => formatTimePointValue(value),
    }
  }

  if (metric.chartType === 'fault') {
    return {
      lineLabel: metric.label,
      yAxisLabel: metric.unit || '故障代码',
      ticks: [2, 0, -2],
      min: -2,
      max: 10,
      visualMin: -2.2,
      visualMax: 10.2,
      yAxisInterval: 1,
      formatter: (value) => `${Math.round(value)}`,
      tooltipFormatter: formatFaultCodeTooltip,
    }
  }

  const fallbackMax = CONTINUOUS_CHART_FALLBACK_MAX[metric.chartType] ?? 50
  const fallbackInterval = getChartAxisInterval(metric)

  return {
    lineLabel: metric.label,
    yAxisLabel: metric.unit || '数值',
    ticks: buildAxisTicks(0, fallbackMax, fallbackInterval),
    min: 0,
    max: fallbackMax,
    yAxisInterval: fallbackInterval,
    formatter: (value) => `${value}`,
    tooltipFormatter: (value) => `${value}${metric.unit ? ` ${metric.unit}` : ''}`,
  }
}

function getChartAxisInterval(metric) {
  switch (metric.chartType) {
    case 'pressure':
      return 50
    case 'voltage':
      return 10
    case 'humidity':
    case 'noise':
    case 'opening':
    case 'percentage':
      return 20
    case 'current':
      return 5
    case 'flow':
      return 10
    case 'energy':
      return 200
    case 'power':
      return 1000
    case 'price':
      return 0.2
    case 'duration':
      return 30
    case 'frequency':
      return 5
    case 'count':
      return 5
    case 'timepoint':
      return 360
    case 'angle':
      return 60
    case 'fault':
      return 2
    case 'gear':
    case 'state':
    case 'switch':
    case 'mode':
    case 'enum':
      return 1
    default:
      return 10
  }
}

function TrendChart({ metric, chartData, presentation }) {
  const chartRef = useRef(null)

  useEffect(() => {
    if (!chartRef.current || !chartData.length) {
      return undefined
    }

    const existingChart = echarts.getInstanceByDom(chartRef.current)
    if (existingChart) {
      existingChart.dispose()
    }

    const chart = echarts.init(chartRef.current)
    const axisInterval = chartData.length > 12 ? Math.ceil(chartData.length / 8) - 1 : 0
    const yAxisInterval = presentation.yAxisInterval ?? getChartAxisInterval(metric)
    const isDiscreteChart = DISCRETE_CHART_TYPES.includes(metric.chartType)

    chart.setOption({
      animation: false,
      tooltip: {
        trigger: 'axis',
        triggerOn: 'mousemove|click',
        appendToBody: true,
        backgroundColor: 'rgba(30, 39, 52, 0.96)',
        borderColor: 'rgba(77, 110, 153, 0.45)',
        borderWidth: 1,
        padding: [12, 14],
        textStyle: {
          color: '#ffffff',
          fontSize: 16,
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: 'rgba(181, 196, 220, 0.48)',
            width: 1,
          },
        },
        formatter: (params) => {
          const point = Array.isArray(params) ? params[0] : params
          if (!point) {
            return ''
          }

          return `${point.axisValue}<br/>${point.marker}${presentation.lineLabel} ${presentation.tooltipFormatter(point.data)}`
        },
      },
      grid: {
        top: 12,
        left: 18,
        right: 24,
        bottom: 54,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        name: '时间',
        nameLocation: 'end',
        nameGap: 18,
        data: chartData.map((item) => item.label),
        axisLine: {
          lineStyle: {
            color: 'rgba(121, 139, 163, 0.55)',
          },
        },
        axisTick: { show: false },
        axisLabel: {
          color: '#a9b5c4',
          fontSize: 16,
          margin: 14,
          hideOverlap: true,
          interval: axisInterval,
        },
      },
      yAxis: {
        type: 'value',
        min: presentation.min,
        max: presentation.max,
        interval: yAxisInterval,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#a9b5c4',
          fontSize: 16,
          formatter: (value) => presentation.formatter(value),
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(198, 213, 238, 0.68)',
            type: 'dashed',
          },
        },
      },
      series: [
        {
          name: presentation.lineLabel,
          type: 'line',
          smooth: false,
          step: isDiscreteChart ? 'middle' : false,
          symbol: 'circle',
          showSymbol: true,
          symbolSize: 8,
          clip: false,
          data: chartData.map((item) => item.value),
          lineStyle: {
            width: 2.5,
            color: '#ff5c2f',
          },
          itemStyle: {
            color: '#ff5c2f',
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(255, 95, 52, 0.42)' },
              { offset: 1, color: 'rgba(255, 95, 52, 0.04)' },
            ]),
          },
        },
      ],
    })

    const resizeObserver = new ResizeObserver(() => {
      chart.resize()
    })
    resizeObserver.observe(chartRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.dispose()
    }
  }, [chartData, metric, presentation])

  return <div ref={chartRef} className="ops-trend-modal__echart" />
}

function TrendModal({
  metric,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  onSearch,
  chartData,
  isCurveLoading = false,
  isCurveError = false,
  onClose,
}) {
  const [pickerField, setPickerField] = useState(null)
  const basePresentation = useMemo(() => getMetricPresentation(metric), [metric])
  const presentation = useMemo(
    () => applyDataDrivenPresentation(basePresentation, chartData, metric),
    [basePresentation, chartData, metric],
  )
  const chartStatusMessage = useMemo(() => {
    if (isCurveLoading) {
      return '正在加载历史数据...'
    }
    if (isCurveError) {
      return '历史数据加载失败，请调整时间后重试'
    }
    if (!chartData.length) {
      return '所选时间范围内暂无历史数据'
    }
    return null
  }, [chartData.length, isCurveError, isCurveLoading])
  const showChartLayers = !chartStatusMessage

  return (
    <>
      <div className="ops-trend-modal__backdrop" onClick={onClose}>
        <div className="ops-trend-modal" onClick={(event) => event.stopPropagation()}>
          <header className="ops-trend-modal__header">
            <h3>{metric.label}</h3>
            <button type="button" onClick={onClose} aria-label="关闭">
              <img src={closeIcon} alt="" aria-hidden="true" />
            </button>
          </header>

          <div className="ops-trend-modal__toolbar">
            <span>时间范围</span>
            <button type="button" className="ops-trend-modal__date" onClick={() => setPickerField('start')}>
              <span>{formatDateTimeParts(parseDateTime(startTime))}</span>
              <img src={dateIcon} alt="" aria-hidden="true" />
            </button>
            <em>-</em>
            <button type="button" className="ops-trend-modal__date" onClick={() => setPickerField('end')}>
              <span>{formatDateTimeParts(parseDateTime(endTime))}</span>
              <img src={dateIcon} alt="" aria-hidden="true" />
            </button>
            <button type="button" className="ops-trend-modal__search" onClick={onSearch}>查询</button>
          </div>

          <div className="ops-trend-modal__content">
            <div className="ops-trend-modal__caption">{metric.label}变化曲线</div>
            <div className="ops-trend-modal__ylabel">{presentation.yAxisLabel}</div>

            <div className="ops-trend-modal__chart">
              {showChartLayers ? <TrendChart metric={metric} chartData={chartData} presentation={presentation} /> : null}

              {chartStatusMessage ? (
                <div className="ops-trend-modal__chart-overlay" role="status">
                  {chartStatusMessage}
                </div>
              ) : null}
            </div>

            <div className="ops-trend-modal__legend">
              <i />
              <span>{presentation.lineLabel}</span>
            </div>
          </div>

          <footer className="ops-trend-modal__footer">
            <button type="button" onClick={onClose}>关闭</button>
          </footer>
        </div>
      </div>

      <TimePickerModal
        isOpen={Boolean(pickerField)}
        title="时间选择"
        columns={[
          { key: 'year', options: DATETIME_YEARS, formatter: (value) => `${value}年` },
          { key: 'month', options: DATETIME_MONTHS, formatter: (value) => `${padNumber(value)}月` },
          { key: 'day', options: DATETIME_DAYS, formatter: (value) => `${padNumber(value)}日` },
          { key: 'hour', options: DATETIME_HOURS, formatter: (value) => padNumber(value) },
          { key: 'minute', options: DATETIME_MINUTES, formatter: (value) => padNumber(value) },
        ]}
        value={parseDateTime(pickerField === 'start' ? startTime : endTime)}
        showBackdrop={false}
        onClose={() => setPickerField(null)}
        onConfirm={(nextValue) => {
          // 天数选项固定 1-31，按年月钳制掉 2月31日 这类非法日期
          const [year, month, day, hour, minute] = nextValue
          const maxDay = new Date(year, month, 0).getDate()
          const clamped = [year, month, Math.min(day, maxDay), hour, minute]
          const normalized = normalizeDateTime(formatDateTimeParts(clamped).replace(/\./g, '-'))
          if (pickerField === 'start') {
            onStartTimeChange(normalized)
          } else {
            onEndTimeChange(normalized)
          }
          setPickerField(null)
        }}
      />
    </>
  )
}

function formatOpsMetricCardValue(item) {
  const value = item?.value ?? '--'
  const unit = String(item?.unit ?? '').trim()
  if (!unit || value === '--') {
    return value
  }

  const text = String(value)
  if (text.endsWith(unit) || text.includes(` ${unit}`)) {
    return text
  }

  return `${text} ${unit}`
}

function MetricCard({ item, onClick }) {
  // 电表组卡片没有数值，不渲染空的 value 元素，保证名称垂直居中
  const hasValue = item.value !== '' && item.value !== null && item.value !== undefined
  return (
    <button type="button" className="ops-system-card" onClick={() => onClick(item)}>
      <span className="ops-system-card__label">{item.label}</span>
      {hasValue ? <strong className="ops-system-card__value">{formatOpsMetricCardValue(item)}</strong> : null}
    </button>
  )
}

function OperationsSystemManagementPage({ tabId }) {
  const [activeSetting, setActiveSetting] = useState(SETTING_OPTIONS[0].value)
  const [activeHeatPumpUnit, setActiveHeatPumpUnit] = useState('No1')
  const [activeMetric, setActiveMetric] = useState(null)
  const [activeMeter, setActiveMeter] = useState(null)
  const [curveNoticeMessage, setCurveNoticeMessage] = useState('')
  const defaultTrendTimeRange = useMemo(() => getDefaultTrendTimeRange(), [])
  const [startTime, setStartTime] = useState(defaultTrendTimeRange.startTime)
  const [endTime, setEndTime] = useState(defaultTrendTimeRange.endTime)
  // 已生效的查询范围：只有点击「查询」时才从草稿时间同步，驱动曲线请求
  const [appliedRange, setAppliedRange] = useState(defaultTrendTimeRange)
  const isUnitDataTab = tabId === 'unit-data-heat-pump'
  const { data: unitOptions = [] } = useOpsHeatPumpListQuery({
    enabled: isUnitDataTab,
  })
  const activeUnit = activeHeatPumpUnit
  const setActiveUnit = setActiveHeatPumpUnit
  const { data: unitMetrics = [] } = useOpsHeatPumpSingleQuery(activeUnit, {
    enabled: isUnitDataTab,
  })
  const selectedSettingLabel = useMemo(
    () => SETTING_OPTIONS.find((item) => item.value === activeSetting)?.label ?? SETTING_OPTIONS[0].label,
    [activeSetting],
  )
  const meterGroup = METER_GROUP_SETTING_MAP[activeSetting] ?? null
  const meterConfig = useMeterConfig()
  const meterGroupCards = useMemo(() => {
    if (!meterGroup) {
      return []
    }
    return createMeterGroupCards({ ...meterGroup, count: meterConfig[meterGroup.configKey] })
  }, [meterGroup, meterConfig])
  const { data: stateMetrics = [] } = useOpsSystemStateQuery({
    enabled: tabId === 'status-data',
  })
  const { data: configMetrics = [] } = useOpsSystemConfigQuery(selectedSettingLabel, {
    enabled: tabId === 'setting-data' && !meterGroup,
  })
  // 电表详情页：按电表名称（如「热泵电表1」）查询该电表的数据卡片
  const { data: meterDetailMetrics = [] } = useOpsSystemConfigQuery(activeMeter?.meterCode ?? '', {
    enabled: Boolean(activeMeter),
  })
  const {
    data: chartData = [],
    refetch: refetchCurve,
    isFetching: isCurveFetching,
    isPending: isCurvePending,
    isError: isCurveError,
  } = useOpsCurveQuery({
    longName: activeMetric?.longName,
    startTime: appliedRange.startTime,
    endTime: appliedRange.endTime,
    enabled: Boolean(activeMetric?.longName),
  })
  const isCurveLoading = Boolean(activeMetric?.longName) && (isCurveFetching || isCurvePending)

  useEffect(() => {
    setActiveMetric(null)
    setActiveMeter(null)
  }, [activeSetting, activeUnit, tabId])

  useEffect(() => {
    if (!isUnitDataTab || !unitOptions.length) return
    const exists = unitOptions.some((item) => item.value === activeUnit)
    if (!exists) {
      setActiveUnit(unitOptions[0].value)
    }
  }, [activeUnit, isUnitDataTab, setActiveUnit, unitOptions])

  const viewConfig = useMemo(() => {
    if (tabId === 'status-data') {
      return {
        selector: null,
        tip: '点击卡片查看历史状态数据曲线图',
        items: stateMetrics,
      }
    }

    if (tabId === 'setting-data') {
      return {
        selector: (
          <SelectDropdown
            className="ops-system-page__select"
            triggerClassName="ops-system-page__select-trigger"
            dropdownClassName="ops-system-page__select-menu"
            optionClassName="ops-system-page__select-option"
            options={SETTING_OPTIONS}
            value={activeSetting}
            onChange={setActiveSetting}
            triggerAriaLabel="选择系统设置数据"
            listAriaLabel="系统设置数据选项"
          />
        ),
        tip: '点击卡片查看历史状态数据曲线图',
        items: meterGroup ? meterGroupCards : configMetrics,
      }
    }
    const unitSelectorLabel = '热泵机组'
    return {
      selector: (
        <SelectDropdown
          className="ops-system-page__select"
          triggerClassName="ops-system-page__select-trigger"
          dropdownClassName="ops-system-page__select-menu"
          optionClassName="ops-system-page__select-option"
          options={unitOptions}
          value={activeUnit}
          onChange={setActiveUnit}
          triggerAriaLabel={`选择${unitSelectorLabel}`}
          listAriaLabel={`${unitSelectorLabel}选项`}
        />
      ),
      tip: '点击卡片查看历史状态数据曲线图',
      items: unitMetrics,
    }
  }, [
    activeSetting,
    activeUnit,
    configMetrics,
    meterGroupCards,
    meterGroup,
    setActiveUnit,
    stateMetrics,
    tabId,
    unitMetrics,
    unitOptions,
  ])

  const openMetricTrend = (metric) => {
    if (!String(metric?.longName ?? '').trim()) {
      setCurveNoticeMessage('该数据点暂无历史曲线')
      return
    }
    const nextRange = getDefaultTrendTimeRange()
    setStartTime(nextRange.startTime)
    setEndTime(nextRange.endTime)
    setAppliedRange(nextRange)
    setActiveMetric(metric)
  }

  const handleOpenMetric = (item) => {
    // 电表组卡片：进入该电表的数据详情页，再点数据卡片才打开历史曲线
    if (item?.meterCode) {
      setActiveMeter(item)
      return
    }
    openMetricTrend(item)
  }

  const handleStartTimeChange = (nextValue) => {
    setStartTime(nextValue)
    if (nextValue > endTime) {
      setEndTime(nextValue)
      return
    }
    const maxEndTime = shiftDateTime(nextValue, MAX_TREND_RANGE_MS)
    if (endTime > maxEndTime) {
      setEndTime(maxEndTime)
    }
  }

  const handleEndTimeChange = (nextValue) => {
    setEndTime(nextValue)
    if (nextValue < startTime) {
      setStartTime(nextValue)
      return
    }
    const minStartTime = shiftDateTime(nextValue, -MAX_TREND_RANGE_MS)
    if (startTime < minStartTime) {
      setStartTime(minStartTime)
    }
  }

  const handleSearch = () => {
    if (!activeMetric?.longName) {
      return
    }
    if (appliedRange.startTime === startTime && appliedRange.endTime === endTime) {
      refetchCurve()
      return
    }
    setAppliedRange({ startTime, endTime })
  }

  return (
    <>
      <main className="ops-system-page">
        {activeMeter ? (
          <>
            <div className="ops-system-page__toolbar">
              <button type="button" className="ops-system-page__back" onClick={() => setActiveMeter(null)}>
                返回
              </button>
              <span className="ops-system-page__meter-title">{activeMeter.label}</span>
            </div>

            <p className="ops-system-page__tip">点击卡片查看历史状态数据曲线图</p>

            <section className="ops-system-page__grid">
              {meterDetailMetrics.map((item) => (
                <MetricCard key={item.key} item={item} onClick={handleOpenMetric} />
              ))}
            </section>
          </>
        ) : (
          <>
            {viewConfig.selector ? <div className="ops-system-page__toolbar">{viewConfig.selector}</div> : null}

            <p className="ops-system-page__tip">{viewConfig.tip}</p>

            <section className="ops-system-page__grid">
              {viewConfig.items.map((item) => (
                <MetricCard key={item.key} item={item} onClick={handleOpenMetric} />
              ))}
            </section>
          </>
        )}
      </main>

      {activeMetric ? (
        <TrendModal
          metric={activeMetric}
          startTime={startTime}
          endTime={endTime}
          onStartTimeChange={handleStartTimeChange}
          onEndTimeChange={handleEndTimeChange}
          onSearch={handleSearch}
          chartData={chartData}
          isCurveLoading={isCurveLoading}
          isCurveError={isCurveError}
          onClose={() => setActiveMetric(null)}
        />
      ) : null}

      <AttentionModal
        isOpen={Boolean(curveNoticeMessage)}
        title="提示"
        message={curveNoticeMessage}
        confirmText="确认"
        showCancel={false}
        onClose={() => setCurveNoticeMessage('')}
        onConfirm={() => setCurveNoticeMessage('')}
        zIndex={300}
      />
    </>
  )
}

export default OperationsSystemManagementPage
