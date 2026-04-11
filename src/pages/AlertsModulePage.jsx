import { useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts'
import SelectDropdown from '../components/SelectDropdown'
import TimePickerModal from '../components/TimePickerModal'
import backIcon from '../assets/layout/back.svg'
import dateIcon from '../assets/icons/date.svg'
import { HEAT_PUMP_GRID_ITEMS } from '../config/homeHeatPumps'
import { useActionConfirm } from '../hooks/useActionConfirm'
import { useDeferredVisible } from '../hooks/useDeferredVisible'
import { deleteHistoryAlarm, processLiveAlarm, useAlertsStore } from '@/features/alerts/store/alertsStore'
import './AlertsModulePage.css'

const ALARM_NAME_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'high-pressure-protection', label: '高压保护报警' },
  { value: 'low-pressure-protection', label: '低压保护报警' },
  { value: 'compressor-overload', label: '压缩机过载保护报警' },
  { value: 'outlet-sensor', label: '出水温度传感器故障' },
  { value: 'pump-running', label: '循环泵运行故障' },
  { value: 'insufficient-flow', label: '流量不足报警' },
]

const ALARM_LEVEL_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '1', label: '一级' },
  { value: '2', label: '二级' },
  { value: '3', label: '三级' },
  { value: '4', label: '四级' },
]

const FAULT_CODE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'E01', label: 'E01' },
  { value: 'E02', label: 'E02' },
  { value: 'E03', label: 'E03' },
]

const TREND_TYPE_OPTIONS = [
  { value: 'trend', label: '告警趋势' },
  { value: 'category', label: '告警分类统计' },
]

const ANALYSIS_SCOPE_OPTIONS = [
  { value: 'heat-pump', label: '热泵' },
  { value: 'system', label: '系统' },
  { value: 'device', label: '设备' },
]

const HEAT_PUMP_FILTER_OPTIONS = [
  { value: 'all', label: '全部' },
  ...HEAT_PUMP_GRID_ITEMS.filter((item) => item.id).map((item) => ({
    value: `hp-${item.id}`,
    label: `热泵${item.id}`,
  })),
]

const ROWS_PER_PAGE = 8
const DATE_PICKER_YEARS = Array.from({ length: 11 }, (_, index) => 2021 + index)
const DATE_PICKER_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)
const DATE_PICKER_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)

const ANALYSIS_TREND_OPTIONS = [
  { value: 'trend', label: '告警趋势' },
  { value: 'category', label: '告警分类统计' },
]

const ANALYSIS_SCOPE_LABEL_OPTIONS = [
  { value: 'heat-pump', label: '热泵' },
  { value: 'system', label: '系统' },
  { value: 'device', label: '设备' },
]

const FAULT_TREE_ROWS = [
  {
    code: 'E01',
    name: '错相保护',
    level: '4',
    levelText: '四级',
    reasons: ['380V 主电源相序错误', '相序检测板接线错误', '相序检测板故障'],
    plans: ['调整三相电源接线', '复核相序检测板接线', '更换相序检测板'],
  },
  {
    code: 'E02',
    name: '缺相保护',
    level: '3',
    levelText: '三级',
    reasons: ['主供电 380V 三相缺相', '主供电空气开关损坏'],
    plans: ['检查供电电缆及开关触点', '更换损坏的空气开关'],
  },
  {
    code: 'E03',
    name: '水流开关保护',
    level: '2',
    levelText: '二级',
    reasons: ['循环水泵流量不足', '循环水泵发生气堵'],
    plans: ['清洗过滤器并检查阀门开度', '排气并恢复系统循环'],
  },
]

function formatDateTime(value) {
  if (!value) {
    return '--'
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function parseDateValue(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return [2026, 3, 10]
  }

  const [year, month, day] = value.split('-').map(Number)
  return [year, month, day]
}

function formatDateValue(year, month, day) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseMonthValue(value) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return [2026, 3]
  }

  const [year, month] = value.split('-').map(Number)
  return [year, month]
}

function formatMonthValue(year, month) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
}

function formatDateTriggerLabel(value, type = 'date') {
  if (!value) {
    return ''
  }

  if (type === 'month') {
    const [year, month] = value.split('-')
    if (!year || !month) {
      return value
    }
    return `${year}.${month}`
  }

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) {
    return value
  }
  return `${year}.${month}.${day}`
}

function buildAppliedFilters(name = 'all', level = 'all', startDate = '', endDate = '') {
  return { name, level, startDate, endDate }
}

function matchAlarmRow(row, filters) {
  const matchesName = filters.name === 'all' || row.alarmNameKey === filters.name
  const matchesLevel = filters.level === 'all' || row.level === filters.level
  const matchesStartDate = !filters.startDate || row.heatingSeason >= filters.startDate
  const matchesEndDate = !filters.endDate || row.heatingSeason <= filters.endDate
  return matchesName && matchesLevel && matchesStartDate && matchesEndDate
}

function buildAnalysisSeed(value) {
  return String(value || 'default')
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function clampToMax100(value) {
  return Math.min(100, Math.max(1, Math.round(value)))
}

function getMonthDayCount(year, month) {
  return new Date(year, month, 0).getDate()
}

function parseMonthParts(value) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return { year: 2026, month: 3 }
  }

  const [year, month] = value.split('-').map(Number)
  return { year, month }
}

function compareMonthValue(left, right) {
  const leftParts = parseMonthParts(left)
  const rightParts = parseMonthParts(right)

  if (leftParts.year !== rightParts.year) {
    return leftParts.year - rightParts.year
  }

  return leftParts.month - rightParts.month
}

function enumerateMonthRange(startMonth, endMonth) {
  if (compareMonthValue(startMonth, endMonth) > 0) {
    return []
  }

  const { year: startYear, month: startMonthValue } = parseMonthParts(startMonth)
  const { year: endYear, month: endMonthValue } = parseMonthParts(endMonth)
  const months = []

  let cursorYear = startYear
  let cursorMonth = startMonthValue

  while (cursorYear < endYear || (cursorYear === endYear && cursorMonth <= endMonthValue)) {
    months.push(formatMonthValue(cursorYear, cursorMonth))
    cursorMonth += 1

    if (cursorMonth > 12) {
      cursorMonth = 1
      cursorYear += 1
    }
  }

  return months
}

function formatMonthAxisLabel(value) {
  if (!value) {
    return ''
  }

  const [year, month] = value.split('-')
  return `${year}.${month}`
}

function getCurrentDateInfo() {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  }
}

function buildDayTrendData(monthValue, currentDateInfo) {
  const seed = buildAnalysisSeed(monthValue)
  const { year, month } = parseMonthParts(monthValue)
  const daysInMonth = getMonthDayCount(year, month)
  const isCurrentMonth = currentDateInfo.year === year && currentDateInfo.month === month
  const isFutureMonth =
    year > currentDateInfo.year || (year === currentDateInfo.year && month > currentDateInfo.month)
  const maxAvailableDay = isFutureMonth ? 0 : isCurrentMonth ? currentDateInfo.day - 1 : daysInMonth

  return Array.from({ length: daysInMonth }, (_, index) =>
    index + 1 <= maxAvailableDay ? clampToMax100(((seed + index * 7) % 28) + (index % 4) * 3 + 6) : null,
  )
}

function buildMonthTrendData(startMonth, endMonth) {
  const monthRange = enumerateMonthRange(startMonth, endMonth)
  const startSeed = buildAnalysisSeed(startMonth)
  const endSeed = buildAnalysisSeed(endMonth)
  return monthRange.map((_, index) =>
    clampToMax100(((startSeed + endSeed + index * 11) % 40) + (index % 3) * 6 + 12),
  )
}

function buildPeriodSeed(period, query) {
  return period === 'day'
    ? buildAnalysisSeed(query.dayMonth)
    : buildAnalysisSeed(`${query.monthStart}-${query.monthEnd}`)
}

function buildCategoryData(period, query) {
  const seed = buildPeriodSeed(period, query)

  return [
    { name: '高压类故障', value: clampToMax100((seed % 25) + 18) },
    { name: '低压类故障', value: clampToMax100((seed % 19) + 14) },
    { name: '传感器故障', value: clampToMax100((seed % 17) + 10) },
    { name: '水系统故障', value: clampToMax100((seed % 21) + 16) },
  ]
}

function buildScopedCategoryData(period, query, scope) {
  const seedOffsetMap = {
    'heat-pump': 5,
    system: 11,
    device: 17,
  }
  const baseSeed = buildPeriodSeed(period, query)
  const seed = baseSeed + (seedOffsetMap[scope] ?? 0)

  const configMap = {
    'heat-pump': Array.from({ length: 33 }, (_, index) => `热泵${index + 1}`),
    system: ['高压类故障', '低压类故障', '传感器故障', '水系统故障'],
    device: ['主板故障', '水泵故障', '阀门故障', '通讯故障'],
  }

  return (configMap[scope] ?? configMap.system).map((name, index) => ({
    name,
    value:
      scope === 'heat-pump'
        ? clampToMax100(((seed + index * 5) % 16) + (index % 6) + 1)
        : clampToMax100(((seed + index * 13) % 24) + 12 + index * 3),
  }))
}

function buildScopedPieData(period, query, scope, heatPumpFilter = 'all') {
  const seedOffsetMap = {
    'heat-pump': 3,
    system: 9,
    device: 15,
  }
  const baseSeed = buildPeriodSeed(period, query)
  const seed = baseSeed + (seedOffsetMap[scope] ?? 0)

  const configMap = {
    'heat-pump': [
      { name: '热泵 1 高压故障', color: '#1f99ea' },
      { name: '热泵 2 低压故障', color: '#6840f4' },
      { name: '热泵 3 除霜异常', color: '#20c7a2' },
    ],
    system: [
      { name: '一次系统故障', color: '#1f99ea' },
      { name: '换热系统故障', color: '#20c7a2' },
      { name: '补水系统故障', color: '#ec9b14' },
    ],
    device: [
      { name: '热泵循环泵故障', color: '#6840f4' },
      { name: '用户侧回水温感故障', color: '#20c7a2' },
      { name: '冷凝水管道温感故障', color: '#ec9b14' },
    ],
  }

  if (scope === 'heat-pump' && heatPumpFilter !== 'all') {
    const pumpNumber = Number.parseInt(String(heatPumpFilter).replace('hp-', ''), 10) || 1
    const heatPumpSeed = seed + pumpNumber * 17

    return [
      { name: `热泵 ${pumpNumber} 高压故障`, color: '#1f99ea' },
      { name: `热泵 ${pumpNumber} 低压故障`, color: '#6840f4' },
      { name: `热泵 ${pumpNumber} 回水温异常`, color: '#20c7a2' },
      { name: `热泵 ${pumpNumber} 通讯故障`, color: '#ec9b14' },
    ].map((item, index) => ({
      ...item,
      value: clampToMax100(((heatPumpSeed + index * 11) % 16) + 8 + index * 3),
    }))
  }

  return (configMap[scope] ?? configMap.device).map((item, index) => ({
    ...item,
    value: clampToMax100(((seed + index * 9) % 18) + 10 + index * 4),
  }))
}
function buildSummary(period, query, currentDateInfo) {
  const trend =
    period === 'day'
      ? buildDayTrendData(query.dayMonth, currentDateInfo)
      : buildMonthTrendData(query.monthStart, query.monthEnd)
  const categories = buildCategoryData(period, query)
  const numericTrend = trend.filter((value) => typeof value === 'number')
  if (numericTrend.length === 0) {
    return {
      total: 0,
      pending: 0,
      hottestDevice: period === 'day' ? '空气源热泵2' : '热泵循环泵',
      commonAlarm: categories.sort((a, b) => b.value - a.value)[0]?.name ?? '--',
    }
  }
  const divisor = period === 'day' ? Math.max(1, numericTrend.length * 0.42) : Math.max(1, numericTrend.length * 0.6)
  const total = clampToMax100(numericTrend.reduce((sum, value) => sum + value, 0) / divisor)
  const pending = clampToMax100(total * (period === 'day' ? 0.38 : 0.27))
  const hottestDevice = period === 'day' ? '空气源热泵2' : '热泵循环泵'
  const commonAlarm = categories.sort((a, b) => b.value - a.value)[0]?.name ?? '--'

  return {
    total,
    pending,
    hottestDevice,
    commonAlarm,
  }
}

function LabeledFilterField({ label, children, className = '' }) {
  return (
    <div className={`labeled-select-row alerts-filter-field ${className}`.trim()}>
      <div className="labeled-select-row__content">
        <div className="labeled-select-row__label">{label}</div>
      </div>
      <div className="labeled-select-row__control">{children}</div>
    </div>
  )
}

function DatePickerTrigger({
  value,
  onChange,
  type = 'date',
  className = '',
  placeholder = '请选择时间',
  title,
  confirmConfig,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const isEmpty = !value
  const pickerValue = type === 'month' ? parseMonthValue(value) : parseDateValue(value)
  const displayValue = isEmpty ? placeholder : formatDateTriggerLabel(value, type)
  const columns =
    type === 'month'
      ? [
          { key: 'year', options: DATE_PICKER_YEARS, formatter: (next) => `${next}年` },
          { key: 'month', options: DATE_PICKER_MONTHS, formatter: (next) => `${String(next).padStart(2, '0')}月` },
        ]
      : [
          { key: 'year', options: DATE_PICKER_YEARS, formatter: (next) => `${next}年` },
          { key: 'month', options: DATE_PICKER_MONTHS, formatter: (next) => `${String(next).padStart(2, '0')}月` },
          { key: 'day', options: DATE_PICKER_DAYS, formatter: (next) => `${String(next).padStart(2, '0')}日` },
        ]

  return (
    <>
      <button
        type="button"
        className={`alerts-date-trigger ${className} ${isEmpty ? 'is-placeholder' : ''}`.trim()}
        onClick={() => setIsOpen(true)}
      >
        <span>{displayValue}</span>
        <img src={dateIcon} alt="" aria-hidden="true" className="alerts-date-trigger__icon" />
      </button>
      <TimePickerModal
        isOpen={isOpen}
        title={title ?? (type === 'month' ? '月份选择' : '日期选择')}
        columns={columns}
        value={pickerValue}
        onClose={() => setIsOpen(false)}
        confirmConfig={confirmConfig}
        onConfirm={(nextValue) => {
          if (type === 'month') {
            const [year, month] = nextValue
            onChange?.(formatMonthValue(year, month))
          } else {
            const [year, month, day] = nextValue
            onChange?.(formatDateValue(year, month, day))
          }
          setIsOpen(false)
        }}
      />
    </>
  )
}

function DetailModal({ row, extraFields = [], onClose }) {
  if (!row) {
    return null
  }

  return (
    <div className="alerts-detail-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="alerts-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label="告警详情"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="alerts-detail-modal__header">
          <h3>告警详情</h3>
          <button type="button" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="alerts-detail-modal__grid">
          <div>
            <span>设备名称</span>
            <strong>{row.deviceName ?? row.code ?? '--'}</strong>
          </div>
          <div>
            <span>{row.code ? '故障代码' : '告警名称'}</span>
            <strong>{row.code ?? row.alarmName ?? '--'}</strong>
          </div>
          <div>
            <span>告警等级</span>
            <strong>{row.levelText ?? '--'}</strong>
          </div>
          <div>
            <span>{row.code ? '故障名称' : '发生时间'}</span>
            <strong>{row.code ? row.name : row.happenedAt}</strong>
          </div>
          {row.heatingSeason ? (
            <div>
              <span>时间范围</span>
              <strong>{row.heatingSeason}</strong>
            </div>
          ) : null}
          {row.processedAt ? (
            <div>
              <span>处理时间</span>
              <strong>{row.processedAt}</strong>
            </div>
          ) : null}
          {extraFields.map((field) => (
            <div key={field.label} className={field.fullWidth ? 'is-full' : ''}>
              <span>{field.label}</span>
              <strong>{field.value}</strong>
            </div>
          ))}
          {row.suggestion ? (
            <div className="is-full">
              <span>处理建议</span>
              <strong>{row.suggestion}</strong>
            </div>
          ) : null}
        </div>
        <div className="alerts-detail-modal__actions">
          <button type="button" className="alerts-primary-btn" onClick={onClose}>
            关闭
          </button>
        </div>
      </section>
    </div>
  )
}

function EmptyRow({ colSpan = 1, text = '暂无数据' }) {
  return (
    <tr>
      <td className="alerts-table__empty" colSpan={colSpan}>
        {text}
      </td>
    </tr>
  )
}

function BarChart({
  xData,
  seriesData,
  max = 100,
  className = '',
  xAxisLabelInterval,
  xAxisLabelRotate,
  xAxisLabelFontSize,
}) {
  const chartRef = useRef(null)
  const shouldInitChart = useDeferredVisible(chartRef)
  const isDenseAxis = xData.length > 20

  useEffect(() => {
    if (!shouldInitChart || !chartRef.current) {
      return undefined
    }

    const chart = echarts.init(chartRef.current)
    chart.setOption({
      backgroundColor: 'transparent',
      grid: { left: 54, right: 30, top: 30, bottom: 46 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 22, 34, 0.95)',
        borderColor: 'rgba(88, 109, 142, 0.72)',
        textStyle: { color: '#eaf1ff' },
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLine: { lineStyle: { color: 'rgba(154, 170, 196, 0.54)' } },
        axisTick: { show: false },
        axisLabel: {
          color: 'rgba(164, 179, 202, 0.92)',
          margin: 20,
          fontSize: xAxisLabelFontSize ?? (isDenseAxis ? 12 : 18),
          interval: xAxisLabelInterval ?? 0,
          rotate: xAxisLabelRotate ?? (isDenseAxis ? 45 : 0),
        },
      },
      yAxis: {
        type: 'value',
        max,
        splitNumber: 5,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: 'rgba(164, 179, 202, 0.92)', fontSize: 16, margin: 16 },
        splitLine: { lineStyle: { color: 'rgba(181, 197, 219, 0.36)', type: 'dashed' } },
      },
      series: [
        {
          name: '告警数量',
          type: 'bar',
          data: seriesData,
          barMaxWidth: isDenseAxis ? 18 : 56,
          itemStyle: {
            borderRadius: [14, 14, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(177, 209, 11, 0.95)' },
              { offset: 0.72, color: 'rgba(170, 199, 12, 0.92)' },
              { offset: 1, color: 'rgba(92, 105, 38, 0.26)' },
            ]),
          },
        },
      ],
    })

    const resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(chartRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.dispose()
    }
  }, [isDenseAxis, max, seriesData, shouldInitChart, xAxisLabelFontSize, xAxisLabelInterval, xAxisLabelRotate, xData])

  return <div ref={chartRef} className={`alerts-analysis__chart ${className}`.trim()} />
}

function PieChart({ data }) {
  const chartRef = useRef(null)
  const shouldInitChart = useDeferredVisible(chartRef)

  useEffect(() => {
    if (!shouldInitChart || !chartRef.current) {
      return undefined
    }

    const chart = echarts.init(chartRef.current)
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: ({ name, value, percent }) => name + '<br/>数量：' + value + '<br/>占比：' + percent + '%',
        backgroundColor: 'rgba(15, 22, 34, 0.95)',
        borderColor: 'rgba(88, 109, 142, 0.72)',
        textStyle: { color: '#eaf1ff' },
      },
      series: [
        {
          type: 'pie',
          radius: ['34%', '68%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderWidth: 0,
          },
          label: {
            show: true,
            position: 'inside',
            formatter: ({ value }) => value,
            color: '#FFFFFF',
            fontSize: 18,
            fontWeight: 500,
          },
          labelLine: { show: false },
          emphasis: {
            scale: false,
          },
          data: data.map((item) => ({
            value: item.value,
            name: item.name,
            itemStyle: { color: item.color },
          })),
        },
      ],
    })

    chart.on('click', (params) => {
      if (typeof params.dataIndex === 'number') {
        chart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: params.dataIndex })
      }
    })

    const resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(chartRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.dispose()
    }
  }, [data, shouldInitChart])

  return <div ref={chartRef} className="alerts-analysis__pie-chart" />
}

function SystemAlarmPage({ onDetailBreadcrumbChange }) {
  const { requestConfirm, confirmModal } = useActionConfirm()
  const { liveRows, historyRows } = useAlertsStore()
  const [isHistoryView, setIsHistoryView] = useState(false)
  const [detailRow, setDetailRow] = useState(null)
  const [liveFilters, setLiveFilters] = useState(() => buildAppliedFilters())
  const [historyFilters, setHistoryFilters] = useState(() => buildAppliedFilters())
  const [liveDraft, setLiveDraft] = useState(() => buildAppliedFilters())
  const [historyDraft, setHistoryDraft] = useState(() => buildAppliedFilters())
  const [livePage, setLivePage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)

  useEffect(() => {
    onDetailBreadcrumbChange?.(isHistoryView ? '历史告警' : '实时告警')
    return () => onDetailBreadcrumbChange?.(null)
  }, [isHistoryView, onDetailBreadcrumbChange])

  const filteredLiveRows = useMemo(() => liveRows.filter((row) => matchAlarmRow(row, liveFilters)), [liveFilters, liveRows])
  const filteredHistoryRows = useMemo(
    () => historyRows.filter((row) => matchAlarmRow(row, historyFilters)),
    [historyFilters, historyRows],
  )

  const liveTotalPages = Math.max(1, Math.ceil(filteredLiveRows.length / ROWS_PER_PAGE))
  const historyTotalPages = Math.max(1, Math.ceil(filteredHistoryRows.length / ROWS_PER_PAGE))
  const currentLivePage = Math.min(livePage, liveTotalPages)
  const currentHistoryPage = Math.min(historyPage, historyTotalPages)

  const livePageRows = useMemo(
    () => filteredLiveRows.slice((currentLivePage - 1) * ROWS_PER_PAGE, currentLivePage * ROWS_PER_PAGE),
    [currentLivePage, filteredLiveRows],
  )
  const historyPageRows = useMemo(
    () => filteredHistoryRows.slice((currentHistoryPage - 1) * ROWS_PER_PAGE, currentHistoryPage * ROWS_PER_PAGE),
    [currentHistoryPage, filteredHistoryRows],
  )

  const handleProcess = (row) => {
    processLiveAlarm({
      ...row,
      processedAt: formatDateTime(new Date()),
      suggestion: row.suggestion + ' 已执行处理并归档到历史告警。',
    })
  }

  return (
    <div className="alerts-page">
      {isHistoryView ? (
        <div className="alerts-page__history-header">
          <button type="button" className="alerts-icon-button" onClick={() => setIsHistoryView(false)}>
            <img src={backIcon} alt="返回" />
          </button>
          <h3>历史告警</h3>
        </div>
      ) : null}

      {isHistoryView ? (
        <div className="alerts-filter-panel">
          <div className="alerts-filter-panel__row">
            <LabeledFilterField label="名称" className="alerts-filter-field--history-select">
              <SelectDropdown
                options={ALARM_NAME_OPTIONS}
                value={historyDraft.name}
                onChange={(value) => setHistoryDraft((previous) => ({ ...previous, name: value }))}

                triggerClassName="alerts-filter-field__trigger"
                dropdownClassName="alerts-filter-field__dropdown"
                optionClassName="alerts-filter-field__option"
                triggerAriaLabel="选择告警名称"
              />
            </LabeledFilterField>
            <LabeledFilterField label="告警等级" className="alerts-filter-field--history-select">
              <SelectDropdown
                options={ALARM_LEVEL_OPTIONS}
                value={historyDraft.level}
                onChange={(value) => setHistoryDraft((previous) => ({ ...previous, level: value }))}

                triggerClassName="alerts-filter-field__trigger"
                dropdownClassName="alerts-filter-field__dropdown"
                optionClassName="alerts-filter-field__option"
                triggerAriaLabel="选择告警等级"
              />
            </LabeledFilterField>
          </div>
          <div className="alerts-filter-panel__row">
            <div className="alerts-filter-range-field">
              <span className="alerts-filter-range-field__label">时间范围</span>
              <div className="alerts-filter-panel__range-group">
                <DatePickerTrigger
                  value={historyDraft.startDate}
                  onChange={(value) => setHistoryDraft((previous) => ({ ...previous, startDate: value }))}
                  className="alerts-filter-field__trigger alerts-filter-field--history-date"
                  title="开始日期选择"
                />
                <span className="alerts-filter-panel__range-sep">-</span>
                <DatePickerTrigger
                  value={historyDraft.endDate}
                  onChange={(value) => setHistoryDraft((previous) => ({ ...previous, endDate: value }))}
                  className="alerts-filter-field__trigger alerts-filter-field--history-date"
                  title="结束日期选择"
                />
              </div>
            </div>
            <button
              type="button"
              className="alerts-primary-btn alerts-filter-panel__query-btn"
              onClick={() => {
                setHistoryFilters(historyDraft)
                setHistoryPage(1)
              }}


            >
              查询
            </button>
          </div>
        </div>
      ) : (
        <div className="alerts-filter-bar">
          <LabeledFilterField label="名称">
            <SelectDropdown
              options={ALARM_NAME_OPTIONS}
              value={liveDraft.name}
              onChange={(value) => setLiveDraft((previous) => ({ ...previous, name: value }))}

              triggerClassName="alerts-filter-field__trigger"
              dropdownClassName="alerts-filter-field__dropdown"
              optionClassName="alerts-filter-field__option"
              triggerAriaLabel="选择告警名称"
            />
          </LabeledFilterField>
          <LabeledFilterField label="告警等级">
            <SelectDropdown
              options={ALARM_LEVEL_OPTIONS}
              value={liveDraft.level}
              onChange={(value) => setLiveDraft((previous) => ({ ...previous, level: value }))}

              triggerClassName="alerts-filter-field__trigger"
              dropdownClassName="alerts-filter-field__dropdown"
              optionClassName="alerts-filter-field__option"
              triggerAriaLabel="选择告警等级"
            />
          </LabeledFilterField>
          <button
            type="button"
            className="alerts-primary-btn"
            onClick={() => {
              setLiveFilters(liveDraft)
              setLivePage(1)
            }}


          >
            查询
          </button>
          <button type="button" className="alerts-link-btn" onClick={() => setIsHistoryView(true)}>
            历史告警
          </button>
        </div>
      )}

      <div className="alerts-table-wrap">
        <table className="alerts-table">
          <thead>
            <tr>
              <th>设备名称</th>
              <th>告警名称</th>
              <th>告警等级</th>
              <th>发生时间</th>
              {isHistoryView ? <th>处理时间</th> : null}
              <th>处理建议</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {(isHistoryView ? historyPageRows : livePageRows).length === 0 ? (
              <EmptyRow colSpan={isHistoryView ? 7 : 6} />
            ) : (
              (isHistoryView ? historyPageRows : livePageRows).map((row) => (
                <tr key={row.id}>
                  <td>{row.deviceName}</td>
                  <td>{row.alarmName}</td>
                  <td>{row.levelText}</td>
                  <td>{row.happenedAt}</td>
                  {isHistoryView ? <td>{row.processedAt ?? '--'}</td> : null}
                  <td className="alerts-table__multiline">{row.suggestion}</td>
                  <td>
                    <div className="alerts-actions">
                      {isHistoryView ? (
                        <button
                          type="button"
                          className="alerts-primary-btn is-mini is-danger"
                          onClick={() => requestConfirm({ message: '确认删除告警 ' + row.alarmName + ' 吗？' }, () => deleteHistoryAlarm(row.id))}
                        >
                          删除
                        </button>
                      ) : (
                        <button type="button" className="alerts-primary-btn is-mini" onClick={() => requestConfirm({ message: '确认处理告警 ' + row.alarmName + ' 吗？' }, () => handleProcess(row))}>
                          处理
                        </button>
                      )}
                      <button type="button" className="alerts-dark-btn" onClick={() => setDetailRow(row)}>
                        查看
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="alerts-pagination">
        <button
          type="button"
          className="alerts-pagination__btn"
          disabled={(isHistoryView ? currentHistoryPage : currentLivePage) <= 1}
          onClick={() =>
            isHistoryView
              ? setHistoryPage(Math.max(1, currentHistoryPage - 1))
              : setLivePage(Math.max(1, currentLivePage - 1))
          }
        >
          上一页
        </button>
        <span className="alerts-pagination__info">
          {isHistoryView ? currentHistoryPage : currentLivePage} / {isHistoryView ? historyTotalPages : liveTotalPages}
        </span>
        <button
          type="button"
          className="alerts-pagination__btn"
          disabled={(isHistoryView ? currentHistoryPage : currentLivePage) >= (isHistoryView ? historyTotalPages : liveTotalPages)}
          onClick={() =>
            isHistoryView
              ? setHistoryPage(Math.min(historyTotalPages, currentHistoryPage + 1))
              : setLivePage(Math.min(liveTotalPages, currentLivePage + 1))
          }
        >
          下一页
        </button>
      </div>

      <DetailModal row={detailRow} onClose={() => setDetailRow(null)} />
      {confirmModal}
    </div>
  )
}

function FaultTreePage({ onDetailBreadcrumbChange }) {
  const [filters, setFilters] = useState({ code: 'all', level: 'all' })
  const [draftFilters, setDraftFilters] = useState({ code: 'all', level: 'all' })
  const [detailRow, setDetailRow] = useState(null)

  useEffect(() => {
    onDetailBreadcrumbChange?.(null)
    return () => onDetailBreadcrumbChange?.(null)
  }, [onDetailBreadcrumbChange])

  const filteredGroups = useMemo(
    () =>
      FAULT_TREE_ROWS.filter((row) => {
        const matchesCode = filters.code === 'all' || row.code === filters.code
        const matchesLevel = filters.level === 'all' || row.level === filters.level
        return matchesCode && matchesLevel
      }),
    [filters],
  )

  return (
    <div className="alerts-page">
      <div className="alerts-filter-bar">
        <LabeledFilterField label="故障代码">
          <SelectDropdown
            options={FAULT_CODE_OPTIONS}
            value={draftFilters.code}
            onChange={(value) => setDraftFilters((previous) => ({ ...previous, code: value }))}

            triggerClassName="alerts-filter-field__trigger"
            dropdownClassName="alerts-filter-field__dropdown"
            optionClassName="alerts-filter-field__option"
            triggerAriaLabel="选择故障代码"
          />
        </LabeledFilterField>
        <LabeledFilterField label="告警等级">
          <SelectDropdown
            options={ALARM_LEVEL_OPTIONS}
            value={draftFilters.level}
            onChange={(value) => setDraftFilters((previous) => ({ ...previous, level: value }))}

            triggerClassName="alerts-filter-field__trigger"
            dropdownClassName="alerts-filter-field__dropdown"
            optionClassName="alerts-filter-field__option"
            triggerAriaLabel="选择告警等级"
          />
        </LabeledFilterField>
        <button
          type="button"
          className="alerts-primary-btn"
          onClick={() => setFilters(draftFilters)}




        >
          查询
        </button>
      </div>

      <div className="alerts-table-wrap">
        <table className="alerts-table alerts-table--fault-tree">
          <thead>
            <tr>
              <th>故障代码</th>
              <th>故障名称</th>
              <th>告警等级</th>
              <th>原因分析</th>
              <th>解决方案</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.length === 0 ? (
              <EmptyRow colSpan={6} />
            ) : (
              filteredGroups.map((group) =>
                group.reasons.map((reason, index) => (
                  <tr key={group.code + '-' + index}>
                    {index === 0 ? <td rowSpan={group.reasons.length}>{group.code}</td> : null}
                    {index === 0 ? <td rowSpan={group.reasons.length}>{group.name}</td> : null}
                    {index === 0 ? <td rowSpan={group.reasons.length}>{group.levelText}</td> : null}
                    <td>{reason}</td>
                    <td>{group.plans[index] ?? group.plans[group.plans.length - 1] ?? '--'}</td>
                    {index === 0 ? (
                      <td rowSpan={group.reasons.length}>
                        <div className="alerts-actions">
                          <button type="button" className="alerts-dark-btn" onClick={() => setDetailRow(group)}>
                            查看
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                )),
              )
            )}
          </tbody>
        </table>
      </div>

      <DetailModal
        row={detailRow}
        extraFields={[
          { label: '原因分析', value: detailRow?.reasons?.join('；') ?? '--', fullWidth: true },
          { label: '解决方案', value: detailRow?.plans?.join('；') ?? '--', fullWidth: true },
        ]}
        onClose={() => setDetailRow(null)}
      />

    </div>
  )
}

function AlarmAnalysisPage({ onDetailBreadcrumbChange }) {
  const { requestConfirm, confirmModal } = useActionConfirm()
  const [period, setPeriod] = useState('day')
  const [mode, setMode] = useState('trend')
  const [categoryScope, setCategoryScope] = useState('system')
  const [pieScope, setPieScope] = useState('device')
  const [selectedHeatPump, setSelectedHeatPump] = useState('all')
  const [currentDateInfo, setCurrentDateInfo] = useState(() => getCurrentDateInfo())
  const [query, setQuery] = useState({
    dayMonth: '2026-03',
    monthStart: '2026-01',
    monthEnd: '2026-03',
  })
  const [draftQuery, setDraftQuery] = useState({
    dayMonth: '2026-03',
    monthStart: '2026-01',
    monthEnd: '2026-03',
  })

  useEffect(() => {
    onDetailBreadcrumbChange?.(null)
    return () => onDetailBreadcrumbChange?.(null)
  }, [onDetailBreadcrumbChange])

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentDateInfo(getCurrentDateInfo()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const dayXAxis = useMemo(() => {
    const { year, month } = parseMonthParts(query.dayMonth)
    const daysInMonth = getMonthDayCount(year, month)
    return Array.from({ length: daysInMonth }, (_, index) => `${index + 1}号`)
  }, [query.dayMonth])

  const monthXAxis = useMemo(
    () => enumerateMonthRange(query.monthStart, query.monthEnd).map((value) => formatMonthAxisLabel(value)),
    [query.monthEnd, query.monthStart],
  )

  const trendData = useMemo(
    () =>
      period === 'day'
        ? buildDayTrendData(query.dayMonth, currentDateInfo)
        : buildMonthTrendData(query.monthStart, query.monthEnd),
    [currentDateInfo, period, query],
  )
  const trendXAxis = useMemo(
    () => (period === 'day' ? dayXAxis : monthXAxis),
    [dayXAxis, monthXAxis, period],
  )
  const categoryData = useMemo(() => buildScopedCategoryData(period, query, categoryScope), [categoryScope, period, query])
  const activeHeatPump = pieScope === 'heat-pump' ? selectedHeatPump : 'all'
  const pieData = useMemo(
    () => buildScopedPieData(period, query, pieScope, activeHeatPump),
    [activeHeatPump, period, pieScope, query],
  )
  const summary = useMemo(() => buildSummary(period, query, currentDateInfo), [currentDateInfo, period, query])

  const handleAnalysisQuery = () => {
    if (period === 'month' && compareMonthValue(draftQuery.monthStart, draftQuery.monthEnd) > 0) {
      requestConfirm(
        {
          title: '提示',
          message: '结束时间必须大于等于开始时间。',
          confirmText: '知道了',
          showCancel: false,
        },
        undefined,
      )
      return
    }

    setQuery(draftQuery)
  }

  return (
    <div className="alerts-analysis">
      <div className="alerts-analysis__toolbar">
        <div className="alerts-analysis__range-field">
          <span className="alerts-analysis__range-label">{period === 'day' ? '年月' : '时间范围'}</span>
          <div className="alerts-analysis__range-group">
            {period === 'day' ? (
              <DatePickerTrigger
                value={draftQuery.dayMonth}
                onChange={(value) => setDraftQuery((previous) => ({ ...previous, dayMonth: value }))}
                type="month"
                className="alerts-analysis__date-btn alerts-analysis__date-btn--single"
                title="年月选择"
              />
            ) : (
              <>
                <DatePickerTrigger
                  value={draftQuery.monthStart}
                  onChange={(value) => setDraftQuery((previous) => ({ ...previous, monthStart: value }))}

                  type="month"
                  className="alerts-analysis__date-btn"
                  title="开始月份选择"
                />
                <span className="alerts-analysis__range-separator">-</span>
                <DatePickerTrigger
                  value={draftQuery.monthEnd}
                  onChange={(value) => setDraftQuery((previous) => ({ ...previous, monthEnd: value }))}

                  type="month"
                  className="alerts-analysis__date-btn"
                  placeholder="请选择月份"
                  title="结束月份选择"
                />
              </>
            )}
          </div>
          <button
            type="button"
            className="alerts-primary-btn"
            onClick={handleAnalysisQuery}
          >
            查询
          </button>
        </div>

        <div className="alerts-analysis__period-switch">
          <button type="button" className={period === 'day' ? 'is-active' : ''} onClick={() => setPeriod('day')}>
            日
          </button>
          <button type="button" className={period === 'month' ? 'is-active' : ''} onClick={() => setPeriod('month')}>
            月
          </button>
        </div>
      </div>

      <div className="alerts-analysis__summary">
        <article>
          <span>系统故障数量</span>
          <strong>{summary.total} 条</strong>
        </article>
        <article>
          <span>未处理告警数量</span>
          <strong>{summary.pending} 条</strong>
        </article>
        <article>
          <span>高故障率设备</span>
          <strong>{summary.hottestDevice}</strong>
        </article>
        <article>
          <span>常见故障</span>
          <strong>{summary.commonAlarm}</strong>
        </article>
      </div>

      <div className="alerts-analysis__mode-row">
        <SelectDropdown
          options={ANALYSIS_TREND_OPTIONS}
          value={mode}
          onChange={setMode}

          className="alerts-analysis__mode-select"
          triggerClassName="alerts-analysis__mode-trigger"
          dropdownClassName="alerts-analysis__mode-dropdown"
          optionClassName="alerts-analysis__mode-option"
        />
      </div>

      {mode === 'trend' ? (
        <BarChart xData={trendXAxis} seriesData={trendData} max={60} />
      ) : (
        <div className="alerts-analysis__category-grid">
          <div className="alerts-analysis__category-card">
            <div className="alerts-analysis__card-head">
              <div className="alerts-analysis__card-title">告警分类统计</div>
              <SelectDropdown
                options={ANALYSIS_SCOPE_LABEL_OPTIONS}
                value={categoryScope}
                onChange={setCategoryScope}

                className="alerts-analysis__card-select"
                triggerClassName="alerts-analysis__card-trigger"
                dropdownClassName="alerts-analysis__card-dropdown"
                optionClassName="alerts-analysis__card-option"
                triggerAriaLabel="选择告警分类统计范围"
              />
            </div>
            <BarChart
              xData={categoryData.map((item) => item.name)}
              seriesData={categoryData.map((item) => item.value)}
              max={40}
              className="alerts-analysis__chart--compact"
              xAxisLabelInterval={categoryScope === 'heat-pump' ? (index) => index === 0 || (index + 1) % 5 === 0 : 0}
              xAxisLabelRotate={categoryScope === 'heat-pump' ? 0 : undefined}
              xAxisLabelFontSize={categoryScope === 'heat-pump' ? 14 : undefined}
            />
          </div>
          <div className="alerts-analysis__category-card alerts-analysis__category-card--distribution">
            <div className="alerts-analysis__card-head alerts-analysis__card-head--distribution">
              <div className="alerts-analysis__card-title alerts-analysis__card-title--distribution">设备故障分布</div>
              <div className="alerts-analysis__card-controls">
                <SelectDropdown
                  options={ANALYSIS_SCOPE_LABEL_OPTIONS}
                  value={pieScope}
                  onChange={setPieScope}

                  className="alerts-analysis__card-select alerts-analysis__card-select--distribution"
                  triggerClassName="alerts-analysis__card-trigger alerts-analysis__card-trigger--distribution"
                  dropdownClassName="alerts-analysis__card-dropdown"
                  optionClassName="alerts-analysis__card-option"
                  triggerAriaLabel="选择告警占比统计范围"
                />
                {pieScope === 'heat-pump' ? (
                  <SelectDropdown
                    options={HEAT_PUMP_FILTER_OPTIONS}
                    value={selectedHeatPump}
                    onChange={setSelectedHeatPump}

                    className="alerts-analysis__card-select alerts-analysis__card-select--distribution alerts-analysis__card-select--heat-pump"
                    triggerClassName="alerts-analysis__card-trigger alerts-analysis__card-trigger--distribution"
                    dropdownClassName="alerts-analysis__card-dropdown"
                    optionClassName="alerts-analysis__card-option"
                    triggerAriaLabel="选择热泵"
                  />
                ) : null}
              </div>
            </div>
            <div className="alerts-analysis__pie-wrap alerts-analysis__pie-wrap--distribution">
              <PieChart data={pieData} />
              <ul className="alerts-analysis__pie-legend">
                {pieData.map((item) => (
                  <li key={item.name}>
                    <span style={{ background: item.color }} />
                    <em>{item.name}</em>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {confirmModal}
    </div>
  )
}
function AlertsModulePage({ sectionId, onDetailBreadcrumbChange }) {
  if (sectionId === 'system-alarm') {
    return <SystemAlarmPage onDetailBreadcrumbChange={onDetailBreadcrumbChange} />
  }

  if (sectionId === 'fault-tree') {
    return <FaultTreePage onDetailBreadcrumbChange={onDetailBreadcrumbChange} />
  }

  if (sectionId === 'alarm-analysis') {
    return <AlarmAnalysisPage onDetailBreadcrumbChange={onDetailBreadcrumbChange} />
  }

  return null
}

export default AlertsModulePage

