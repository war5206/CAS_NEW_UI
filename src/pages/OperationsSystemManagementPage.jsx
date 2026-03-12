import { useEffect, useMemo, useState } from 'react'
import SelectDropdown from '../components/SelectDropdown'
import TimePickerModal from '../components/TimePickerModal'
import dateIcon from '../assets/icons/date.svg'
import closeIcon from '../assets/icons/close.svg'
import './OperationsSystemManagementPage.css'

const DATETIME_YEARS = Array.from({ length: 11 }, (_, index) => 2020 + index)
const DATETIME_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)
const DATETIME_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)
const DATETIME_HOURS = Array.from({ length: 24 }, (_, index) => index)
const DATETIME_MINUTES = Array.from({ length: 60 }, (_, index) => index)

const SETTING_OPTIONS = [{ value: 'mode-select', label: '模式选择' }]
const UNIT_OPTIONS = Array.from({ length: 33 }, (_, index) => ({
  value: `heat-pump-${index + 1}`,
  label: `热泵${index + 1}`,
}))

const SYSTEM_STATUS_ITEMS = [
  { key: 'hp-pump-1', label: '热泵1号水泵运行反馈', value: '开机', unit: 'state', chartType: 'state' },
  { key: 'hp-pump-2', label: '热泵2号水泵运行反馈', value: '开机', unit: 'state', chartType: 'state' },
  { key: 'hp-pump-3', label: '热泵3号水泵运行反馈', value: '关机', unit: 'state', chartType: 'state' },
  { key: 'hp-pump-4', label: '热泵4号水泵运行反馈', value: '关机', unit: 'state', chartType: 'state' },
  { key: 'terminal-pump-1', label: '末端1号水泵运行反馈', value: '关机', unit: 'state', chartType: 'state' },
  { key: 'terminal-pump-2', label: '末端2号水泵运行反馈', value: '关机', unit: 'state', chartType: 'state' },
  { key: 'terminal-pump-3', label: '末端3号水泵运行反馈', value: '关机', unit: 'state', chartType: 'state' },
  { key: 'terminal-pump-4', label: '末端4号水泵运行反馈', value: '关机', unit: 'state', chartType: 'state' },
  { key: 'liquid-pump-1', label: '补液泵1运行反馈', value: '关机', unit: 'state', chartType: 'state' },
  { key: 'liquid-pump-2', label: '补液泵2运行反馈', value: '关机', unit: 'state', chartType: 'state' },
  { key: 'supply-pressure', label: '供水压力', value: '185.2 kPa', unit: 'kPa', chartType: 'pressure' },
  { key: 'return-pressure', label: '回水压力', value: '235.2 kPa', unit: 'kPa', chartType: 'pressure' },
  { key: 'primary-temp', label: '一次侧供水总管温度', value: '3271.6 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'user-supply-temp', label: '用户侧供水总管温度', value: '32.7 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'user-return-temp', label: '用户测回水总管温度', value: '32.3 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'condense-pipe-temp', label: '冷凝水管道温度', value: '42 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'temperature', label: '温度', value: '0.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'humidity', label: '湿度', value: '0.0 %', unit: '%', chartType: 'humidity' },
  { key: 'noise', label: '噪声', value: '0.0 db', unit: 'db', chartType: 'noise' },
  { key: 'wind-level', label: '风向档位', value: '0.0', unit: '', chartType: 'gear' },
  { key: 'wind-angle', label: '风向角度', value: '0.0 °', unit: '°', chartType: 'angle' },
]

const SYSTEM_SETTING_ITEMS = [
  { key: 'run-mode', label: '系统运行模式', value: '智能模式', unit: 'mode', chartType: 'mode' },
  { key: 'weather-comp', label: '气候补偿功能', value: '开启', unit: 'switch', chartType: 'switch' },
  { key: 'timer-mode', label: '智能定时模式', value: '开启', unit: 'switch', chartType: 'switch' },
  { key: 'smart-start', label: '智能启停功能', value: '关闭', unit: 'switch', chartType: 'switch' },
  { key: 'peak-valley', label: '峰谷调节功能', value: '开启', unit: 'switch', chartType: 'switch' },
  { key: 'coupling-energy', label: '耦合能源功能', value: '关闭', unit: 'switch', chartType: 'switch' },
  { key: 'terminal-linkage', label: '末端联动功能', value: '开启', unit: 'switch', chartType: 'switch' },
  { key: 'protect-mode', label: '热泵长时间运行保护功能', value: '关闭', unit: 'switch', chartType: 'switch' },
  { key: 'heat-pump-mode', label: '热泵总运行模式', value: '制热模式', unit: 'mode', chartType: 'mode' },
]

const UNIT_ITEMS = [
  { key: 'communication', label: '通讯状态', value: '开启', unit: 'switch', chartType: 'switch' },
  { key: 'fault-code', label: '总故障代码', value: '0.0', unit: '', chartType: 'fault' },
  { key: 'inlet-temp', label: '进水温度', value: '30.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'outlet-temp', label: '出水温度', value: '30.0℃', unit: '℃', chartType: 'temperature' },
  { key: 'ambient-temp', label: '环境温度', value: '18.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'exhaust-temp-1', label: '排气温度1', value: '24.0℃', unit: '℃', chartType: 'temperature' },
  { key: 'return-air-temp-1', label: '回气温度1', value: '13.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'outer-coil-temp-1', label: '外盘管温度1', value: '12.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'inner-coil-temp-1', label: '内盘管温度1', value: '21.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'eco-in-temp-1', label: '经济器进口温度1', value: '18.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'eco-out-temp-1', label: '经济器出口温度1', value: '18.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'compressor-current-1', label: '压缩机1电流', value: '0.0 A', unit: 'A', chartType: 'current' },
  { key: 'main-valve-open-1', label: '主阀1开度', value: '0.0', unit: '', chartType: 'opening' },
  { key: 'main-valve-open-2', label: '主阀1开度', value: '15.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'aux-valve-open-1', label: '辅阀1开度', value: '0.0', unit: '', chartType: 'opening' },
  { key: 'exhaust-temp-2', label: '排气温度2', value: '24.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'return-air-temp-2', label: '回气温度2', value: '13.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'outer-coil-temp-2', label: '外盘管温度2', value: '18.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'inner-coil-temp-2', label: '内盘管温度2', value: '23.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'eco-in-temp-2', label: '经济器进口温度2', value: '17.0 ℃', unit: '℃', chartType: 'temperature' },
]

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function parseDateTime(value) {
  if (!value) {
    return [2024, 6, 1, 17, 50]
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

function normalizeDateTime(value) {
  const [year, month, day, hour, minute] = parseDateTime(value)
  return `${year}-${padNumber(month)}-${padNumber(day)} ${padNumber(hour)}:${padNumber(minute)}`
}

function createRandomSeries(metric, rangeStart, rangeEnd) {
  const startDate = new Date(rangeStart.replace(' ', 'T'))
  const endDate = new Date(rangeEnd.replace(' ', 'T'))
  const total = 9
  const totalSpan = Math.max(1, endDate.getTime() - startDate.getTime())
  const points = []

  const ranges = {
    temperature: { min: 18, max: 45, decimals: 1 },
    pressure: { min: 160, max: 260, decimals: 1 },
    humidity: { min: 25, max: 95, decimals: 1 },
    noise: { min: 20, max: 70, decimals: 1 },
    current: { min: 0, max: 25, decimals: 1 },
    opening: { min: 0, max: 100, decimals: 1 },
    angle: { min: 0, max: 360, decimals: 1 },
    gear: { min: 0, max: 5, decimals: 0 },
    fault: { min: 0, max: 8, decimals: 0 },
    state: { min: 0, max: 1, decimals: 0 },
    switch: { min: 0, max: 1, decimals: 0 },
    mode: { min: 0, max: 2, decimals: 0 },
  }

  const range = ranges[metric.chartType] ?? { min: 0, max: 50, decimals: 1 }

  for (let index = 0; index < total; index += 1) {
    const ratio = total === 1 ? 0 : index / (total - 1)
    const timestamp = new Date(startDate.getTime() + totalSpan * ratio)
    const rawValue = range.min + Math.random() * (range.max - range.min)
    const value =
      range.decimals === 0 ? Math.round(rawValue) : Number(rawValue.toFixed(range.decimals))

    points.push({
      label: `${padNumber(timestamp.getMonth() + 1)}-${padNumber(timestamp.getDate())}`,
      value,
    })
  }

  return points
}

function getMetricPresentation(metric) {
  if (metric.chartType === 'state') {
    return {
      lineLabel: metric.label,
      yAxisLabel: '状态',
      ticks: [1, 0.5, 0],
      min: 0,
      max: 1,
      formatter: (value) => (value >= 0.5 ? '开机' : '关机'),
      tooltipFormatter: (value) => (value >= 0.5 ? '开机' : '关机'),
    }
  }

  if (metric.chartType === 'switch') {
    return {
      lineLabel: metric.label,
      yAxisLabel: '开关',
      ticks: [1, 0.5, 0],
      min: 0,
      max: 1,
      formatter: (value) => (value >= 0.5 ? '开启' : '关闭'),
      tooltipFormatter: (value) => (value >= 0.5 ? '开启' : '关闭'),
    }
  }

  if (metric.chartType === 'mode') {
    return {
      lineLabel: metric.label,
      yAxisLabel: '模式',
      ticks: [2, 1, 0],
      min: 0,
      max: 2,
      formatter: (value) => ['制冷模式', '智能模式', '制热模式'][Math.round(value)] ?? '智能模式',
      tooltipFormatter: (value) => ['制冷模式', '智能模式', '制热模式'][Math.round(value)] ?? '智能模式',
    }
  }

  return {
    lineLabel: metric.label,
    yAxisLabel: metric.unit || '数值',
    ticks: [50, 40, 30, 20, 10, 0],
    min: 0,
    max:
      metric.chartType === 'pressure'
        ? 300
        : metric.chartType === 'humidity'
          ? 100
          : metric.chartType === 'noise'
            ? 80
            : metric.chartType === 'current'
              ? 30
              : metric.chartType === 'angle'
                ? 360
                : metric.chartType === 'opening'
                  ? 100
                  : metric.chartType === 'fault'
                    ? 10
                    : metric.chartType === 'gear'
                      ? 5
                      : 50,
    formatter: (value) => `${value}`,
    tooltipFormatter: (value) => `${value}${metric.unit ? ` ${metric.unit}` : ''}`,
  }
}

function buildChartGeometry(series, presentation) {
  const width = 1120
  const height = 430
  const left = 46
  const right = 36
  const top = 36
  const bottom = 50
  const innerWidth = width - left - right
  const innerHeight = height - top - bottom

  const points = series.map((item, index) => {
    const x = left + (innerWidth * index) / Math.max(1, series.length - 1)
    const y = top + innerHeight - ((item.value - presentation.min) / Math.max(1, presentation.max - presentation.min)) * innerHeight
    return [x, Math.min(top + innerHeight, Math.max(top, y))]
  })

  const linePath = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  const areaPath = `${linePath} L ${points.at(-1)?.[0] ?? 0} ${top + innerHeight} L ${points[0]?.[0] ?? 0} ${top + innerHeight} Z`

  return { points, linePath, areaPath }
}

function TrendModal({ metric, startTime, endTime, onStartTimeChange, onEndTimeChange, onSearch, chartData, onClose }) {
  const [pickerField, setPickerField] = useState(null)

  const presentation = useMemo(() => getMetricPresentation(metric), [metric])
  const geometry = useMemo(() => buildChartGeometry(chartData, presentation), [chartData, presentation])
  const tooltipPoint = geometry.points[3] ?? geometry.points[0] ?? [0, 0]
  const tooltipValue = chartData[3]?.value ?? chartData[0]?.value ?? 0

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
              <div className="ops-trend-modal__grid">
                {presentation.ticks.map((tick) => (
                  <div key={tick} className="ops-trend-modal__grid-row">
                    <span>{presentation.formatter(tick)}</span>
                    <i />
                  </div>
                ))}
              </div>

              <svg viewBox="0 0 1120 430" className="ops-trend-modal__svg" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="ops-area-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255,95,52,0.42)" />
                    <stop offset="100%" stopColor="rgba(255,95,52,0.04)" />
                  </linearGradient>
                </defs>
                <path d={geometry.areaPath} fill="url(#ops-area-gradient)" />
                <path d={geometry.linePath} fill="none" stroke="#ff5c2f" strokeWidth="2.5" />
                {tooltipPoint ? (
                  <>
                    <circle cx={tooltipPoint[0]} cy={tooltipPoint[1]} r="8" fill="#ff5c2f" />
                    <g transform={`translate(${tooltipPoint[0] + 22} ${tooltipPoint[1] - 12})`}>
                      <rect width="236" height="66" rx="10" fill="#1e2734" stroke="rgba(77,110,153,0.45)" />
                      <circle cx="28" cy="33" r="7" fill="#ff5c2f" />
                      <text x="54" y="40" fill="#ffffff" fontSize="22">{chartData[3]?.label ?? chartData[0]?.label ?? '--'}</text>
                      <text x="138" y="40" fill="#ffffff" fontSize="22">{presentation.tooltipFormatter(tooltipValue)}</text>
                    </g>
                  </>
                ) : null}
              </svg>

              <div className="ops-trend-modal__xaxis">
                {chartData.map((item) => (
                  <span key={item.label}>{item.label}</span>
                ))}
                <span>时间</span>
              </div>
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
        onClose={() => setPickerField(null)}
        onConfirm={(nextValue) => {
          const normalized = normalizeDateTime(formatDateTimeParts(nextValue).replace(/\./g, '-').replace(':00', ''))
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

function MetricCard({ item, onClick }) {
  return (
    <button type="button" className="ops-system-card" onClick={() => onClick(item)}>
      <span className="ops-system-card__label">{item.label}</span>
      <strong className="ops-system-card__value">{item.value}</strong>
    </button>
  )
}

function OperationsSystemManagementPage({ tabId }) {
  const [activeSetting, setActiveSetting] = useState(SETTING_OPTIONS[0].value)
  const [activeUnit, setActiveUnit] = useState(UNIT_OPTIONS[0].value)
  const [activeMetric, setActiveMetric] = useState(null)
  const [startTime, setStartTime] = useState('2024-06-01 17:50')
  const [endTime, setEndTime] = useState('2024-06-09 17:50')
  const [chartData, setChartData] = useState([])

  const selectedUnit = useMemo(
    () => UNIT_OPTIONS.find((item) => item.value === activeUnit) ?? UNIT_OPTIONS[0],
    [activeUnit],
  )

  const viewConfig = useMemo(() => {
    if (tabId === 'status-data') {
      return {
        selector: null,
        tip: '点击卡片查看历史状态数据曲线图',
        items: SYSTEM_STATUS_ITEMS,
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
        items: SYSTEM_SETTING_ITEMS,
      }
    }

    const unitNumber = Number(activeUnit.replace('heat-pump-', '')) || 1
    return {
      selector: (
        <SelectDropdown
          className="ops-system-page__select"
          triggerClassName="ops-system-page__select-trigger"
          dropdownClassName="ops-system-page__select-menu"
          optionClassName="ops-system-page__select-option"
          options={UNIT_OPTIONS}
          value={activeUnit}
          onChange={setActiveUnit}
          triggerAriaLabel="选择热泵机组"
          listAriaLabel="热泵机组选项"
        />
      ),
      tip: '点击卡片查看历史状态数据曲线图',
      items: UNIT_ITEMS.map((item, index) => {
        if (!item.unit || item.unit === 'switch') {
          return item
        }

        if (item.chartType === 'temperature') {
          const nextValue = 12 + ((unitNumber + index * 2) % 24)
          return { ...item, value: `${nextValue.toFixed(1)} ℃` }
        }

        if (item.chartType === 'current') {
          const nextValue = ((unitNumber + index) % 8) + 0.5
          return { ...item, value: `${nextValue.toFixed(1)} A` }
        }

        if (item.chartType === 'opening') {
          const nextValue = (unitNumber * 7 + index * 9) % 100
          return { ...item, value: `${nextValue.toFixed(1)}` }
        }

        return item
      }).map((item) =>
        item.label === '通讯状态'
          ? { ...item, value: unitNumber % 3 === 0 ? '关闭' : '开启' }
          : item.label === '总故障代码'
            ? { ...item, value: `${unitNumber % 4}` }
            : item,
      ),
      currentTitle: selectedUnit.label,
    }
  }, [activeSetting, activeUnit, selectedUnit.label, tabId])

  useEffect(() => {
    if (!activeMetric) {
      return
    }
    setChartData(createRandomSeries(activeMetric, startTime, endTime))
  }, [activeMetric, endTime, startTime])

  const handleOpenMetric = (item) => {
    setActiveMetric(item)
    setChartData(createRandomSeries(item, startTime, endTime))
  }

  const handleSearch = () => {
    if (!activeMetric) {
      return
    }
    setChartData(createRandomSeries(activeMetric, startTime, endTime))
  }

  return (
    <>
      <main className="ops-system-page">
        {viewConfig.selector ? <div className="ops-system-page__toolbar">{viewConfig.selector}</div> : null}

        <p className="ops-system-page__tip">{viewConfig.tip}</p>

        <section className="ops-system-page__grid">
          {viewConfig.items.map((item) => (
            <MetricCard key={item.key} item={item} onClick={handleOpenMetric} />
          ))}
        </section>
      </main>

      {activeMetric ? (
        <TrendModal
          metric={activeMetric}
          startTime={startTime}
          endTime={endTime}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
          onSearch={handleSearch}
          chartData={chartData}
          onClose={() => setActiveMetric(null)}
        />
      ) : null}
    </>
  )
}

export default OperationsSystemManagementPage
