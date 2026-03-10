import { useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts'
import SelectDropdown from '../components/SelectDropdown'
import TimePickerModal from '../components/TimePickerModal'
import backIcon from '../assets/layout/back.svg'
import { useDeferredVisible } from '../hooks/useDeferredVisible'
import './AlertsModulePage.css'

const ALARM_NAME_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'high-pressure-protection', label: '高压保护报警' },
  { value: 'low-pressure-protection', label: '低压保护报警' },
  { value: 'compressor-overload', label: '压缩机过载保护' },
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

const ROWS_PER_PAGE = 8
const DATE_PICKER_YEARS = Array.from({ length: 11 }, (_, index) => 2021 + index)
const DATE_PICKER_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)
const DATE_PICKER_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)

const SYSTEM_ALARM_ROWS = [
  {
    id: 'system-1',
    deviceName: '空气源热泵 1#',
    alarmNameKey: 'high-pressure-protection',
    alarmName: '高压保护报警',
    level: '3',
    levelText: '三级',
    happenedAt: '2026-03-10 17:22:59',
    heatingSeason: '2026-03-10',
    suggestion: '检查冷凝器是否堵塞，并确认冷凝风机运行正常。',
  },
  {
    id: 'system-2',
    deviceName: '空气源热泵 2#',
    alarmNameKey: 'low-pressure-protection',
    alarmName: '低压保护报警',
    level: '3',
    levelText: '三级',
    happenedAt: '2026-03-10 16:48:12',
    heatingSeason: '2026-03-10',
    suggestion: '检查系统是否存在制冷剂泄漏，并确认蒸发器结霜情况。',
  },
  {
    id: 'system-3',
    deviceName: '空气源热泵 3#',
    alarmNameKey: 'compressor-overload',
    alarmName: '压缩机过载保护',
    level: '2',
    levelText: '二级',
    happenedAt: '2026-03-10 15:32:41',
    heatingSeason: '2026-03-09',
    suggestion: '检查压缩机电流、电压和回油情况。',
  },
  {
    id: 'system-4',
    deviceName: '空气源热泵 4#',
    alarmNameKey: 'outlet-sensor',
    alarmName: '出水温度传感器故障',
    level: '4',
    levelText: '四级',
    happenedAt: '2026-03-10 14:20:33',
    heatingSeason: '2026-03-08',
    suggestion: '检查传感器接线、信号及标定状态。',
  },
  {
    id: 'system-5',
    deviceName: '一次侧循环泵 A',
    alarmNameKey: 'pump-running',
    alarmName: '循环泵运行故障',
    level: '3',
    levelText: '三级',
    happenedAt: '2026-03-10 13:55:07',
    heatingSeason: '2026-03-07',
    suggestion: '检查水泵电源、控制信号和阀门开度。',
  },
  {
    id: 'system-6',
    deviceName: '一次侧循环泵 B',
    alarmNameKey: 'insufficient-flow',
    alarmName: '流量不足报警',
    level: '3',
    levelText: '三级',
    happenedAt: '2026-03-10 13:12:25',
    heatingSeason: '2026-03-06',
    suggestion: '检查过滤器、阀门开度和管路是否存在气堵。',
  },
]

const HISTORY_ALARM_ROWS = [
  {
    id: 'history-1',
    deviceName: '空气源热泵 5#',
    alarmNameKey: 'high-pressure-protection',
    alarmName: '高压保护报警',
    level: '2',
    levelText: '二级',
    happenedAt: '2026-03-08 09:41:12',
    heatingSeason: '2026-03-08',
    processedAt: '2026-03-08 10:05:02',
    suggestion: '已清洗冷凝器并复位。',
  },
  {
    id: 'history-2',
    deviceName: '空气源热泵 6#',
    alarmNameKey: 'outlet-sensor',
    alarmName: '出水温度传感器故障',
    level: '4',
    levelText: '四级',
    happenedAt: '2026-03-06 18:12:40',
    heatingSeason: '2026-03-06',
    processedAt: '2026-03-06 18:40:11',
    suggestion: '已更换传感器并校准。',
  },
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

function buildAppliedFilters(name = 'all', level = 'all', heatingSeason = '') {
  return { name, level, heatingSeason }
}

function matchAlarmRow(row, filters) {
  const matchesName = filters.name === 'all' || row.alarmNameKey === filters.name
  const matchesLevel = filters.level === 'all' || row.level === filters.level
  const matchesHeatingSeason = !filters.heatingSeason || row.heatingSeason === filters.heatingSeason
  return matchesName && matchesLevel && matchesHeatingSeason
}

function buildAnalysisSeed(value) {
  return String(value || 'default')
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function clampToMax100(value) {
  return Math.min(100, Math.max(1, Math.round(value)))
}

function buildDayTrendData(dateValue) {
  const seed = buildAnalysisSeed(dateValue)
  return Array.from({ length: 12 }, (_, index) => clampToMax100(((seed + index * 7) % 28) + (index % 4) * 3 + 6))
}

function buildMonthTrendData(startMonth, endMonth) {
  const startSeed = buildAnalysisSeed(startMonth)
  const endSeed = buildAnalysisSeed(endMonth)
  return Array.from({ length: 12 }, (_, index) =>
    clampToMax100(((startSeed + endSeed + index * 11) % 40) + (index % 3) * 6 + 12),
  )
}

function buildCategoryData(period, query) {
  const seed =
    period === 'day'
      ? buildAnalysisSeed(query.dayDate)
      : buildAnalysisSeed(`${query.monthStart}-${query.monthEnd}`)

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
  const baseSeed =
    period === 'day'
      ? buildAnalysisSeed(query.dayDate)
      : buildAnalysisSeed(`${query.monthStart}-${query.monthEnd}`)
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

function buildDevicePieData(period, query) {
  const seed =
    period === 'day'
      ? buildAnalysisSeed(query.dayDate)
      : buildAnalysisSeed(`${query.monthStart}-${query.monthEnd}`)

  const values = [
    clampToMax100((seed % 12) + 18),
    clampToMax100((seed % 15) + 14),
    clampToMax100((seed % 11) + 11),
    clampToMax100((seed % 9) + 8),
  ]

  return [
    { name: '末端 1# 水泵故障', value: values[0], color: '#1f99ea' },
    { name: '末端 2# 水泵故障', value: values[1], color: '#6840f4' },
    { name: '用户侧回水温感故障', value: values[2], color: '#20c7a2' },
    { name: '冷凝水管道温感故障', value: values[3], color: '#ec9b14' },
  ]
}

function buildScopedPieData(period, query, scope) {
  const seedOffsetMap = {
    'heat-pump': 3,
    system: 9,
    device: 15,
  }
  const baseSeed =
    period === 'day'
      ? buildAnalysisSeed(query.dayDate)
      : buildAnalysisSeed(`${query.monthStart}-${query.monthEnd}`)
  const seed = baseSeed + (seedOffsetMap[scope] ?? 0)

  const configMap = {
    'heat-pump': [
      { name: '热泵 1# 高压故障', color: '#1f99ea' },
      { name: '热泵 2# 低压故障', color: '#6840f4' },
      { name: '热泵 3# 除霜异常', color: '#20c7a2' },
      { name: '热泵 4# 传感器故障', color: '#ec9b14' },
    ],
    system: [
      { name: '一次泵系统故障', color: '#1f99ea' },
      { name: '二次泵系统故障', color: '#6840f4' },
      { name: '换热系统故障', color: '#20c7a2' },
      { name: '补水系统故障', color: '#ec9b14' },
    ],
    device: [
      { name: '末端 1# 水泵故障', color: '#1f99ea' },
      { name: '末端 2# 水泵故障', color: '#6840f4' },
      { name: '用户侧回水温感故障', color: '#20c7a2' },
      { name: '冷凝水管道温感故障', color: '#ec9b14' },
    ],
  }

  return (configMap[scope] ?? configMap.device).map((item, index) => ({
    ...item,
    value: clampToMax100(((seed + index * 9) % 18) + 10 + index * 4),
  }))
}

function buildSummary(period, query) {
  const trend = period === 'day' ? buildDayTrendData(query.dayDate) : buildMonthTrendData(query.monthStart, query.monthEnd)
  const categories = buildCategoryData(period, query)
  const total = clampToMax100(trend.reduce((sum, value) => sum + value, 0) / 6)
  const pending = clampToMax100(total * (period === 'day' ? 0.38 : 0.27))
  const hottestDevice = period === 'day' ? '空气源热泵 2#' : '一次侧循环泵 A'
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
}) {
  const [isOpen, setIsOpen] = useState(false)
  const isEmpty = !value
  const pickerValue = type === 'month' ? parseMonthValue(value) : parseDateValue(value)
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
        <span>{isEmpty ? placeholder : value}</span>
      </button>
      <TimePickerModal
        isOpen={isOpen}
        title={title ?? (type === 'month' ? '月份选择' : '日期选择')}
        columns={columns}
        value={pickerValue}
        onClose={() => setIsOpen(false)}
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
            <span>{row.code ? '故障代码' : '报警名称'}</span>
            <strong>{row.code ?? row.alarmName ?? '--'}</strong>
          </div>
          <div>
            <span>报警等级</span>
            <strong>{row.levelText ?? '--'}</strong>
          </div>
          <div>
            <span>{row.code ? '故障名称' : '发生时间'}</span>
            <strong>{row.code ? row.name : row.happenedAt}</strong>
          </div>
          {row.heatingSeason ? (
            <div>
              <span>采暖季</span>
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

function BarChart({ xData, seriesData, max = 100, className = '' }) {
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
          fontSize: isDenseAxis ? 12 : 18,
          interval: 0,
          rotate: isDenseAxis ? 45 : 0,
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
  }, [isDenseAxis, max, seriesData, shouldInitChart, xData])

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
        formatter: ({ name, value, percent }) => `${name}<br/>数量：${value}<br/>占比：${percent}%`,
        backgroundColor: 'rgba(15, 22, 34, 0.95)',
        borderColor: 'rgba(88, 109, 142, 0.72)',
        textStyle: { color: '#eaf1ff' },
      },
      series: [
        {
          type: 'pie',
          radius: ['46%', '70%'],
          avoidLabelOverlap: false,
          label: { show: false },
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
  const [isHistoryView, setIsHistoryView] = useState(false)
  const [liveRows, setLiveRows] = useState(SYSTEM_ALARM_ROWS)
  const [historyRows, setHistoryRows] = useState(HISTORY_ALARM_ROWS)
  const [detailRow, setDetailRow] = useState(null)
  const [liveFilters, setLiveFilters] = useState(() => buildAppliedFilters())
  const [historyFilters, setHistoryFilters] = useState(() => buildAppliedFilters())
  const [liveDraft, setLiveDraft] = useState(() => buildAppliedFilters())
  const [historyDraft, setHistoryDraft] = useState(() => buildAppliedFilters('', '', ''))
  const [livePage, setLivePage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)

  useEffect(() => {
    onDetailBreadcrumbChange?.(isHistoryView ? '历史报警' : '实时报警')
    return () => onDetailBreadcrumbChange?.(null)
  }, [isHistoryView, onDetailBreadcrumbChange])

  const filteredLiveRows = useMemo(() => liveRows.filter((row) => matchAlarmRow(row, liveFilters)), [liveFilters, liveRows])
  const filteredHistoryRows = useMemo(
    () => historyRows.filter((row) => matchAlarmRow(row, historyFilters)),
    [historyFilters, historyRows],
  )

  const liveTotalPages = Math.max(1, Math.ceil(filteredLiveRows.length / ROWS_PER_PAGE))
  const historyTotalPages = Math.max(1, Math.ceil(filteredHistoryRows.length / ROWS_PER_PAGE))

  const livePageRows = useMemo(
    () => filteredLiveRows.slice((livePage - 1) * ROWS_PER_PAGE, livePage * ROWS_PER_PAGE),
    [filteredLiveRows, livePage],
  )
  const historyPageRows = useMemo(
    () => filteredHistoryRows.slice((historyPage - 1) * ROWS_PER_PAGE, historyPage * ROWS_PER_PAGE),
    [filteredHistoryRows, historyPage],
  )

  useEffect(() => {
    setLivePage((previous) => Math.min(previous, liveTotalPages))
  }, [liveTotalPages])

  useEffect(() => {
    setHistoryPage((previous) => Math.min(previous, historyTotalPages))
  }, [historyTotalPages])

  const handleProcess = (row) => {
    setLiveRows((previous) => previous.filter((item) => item.id !== row.id))
    setHistoryRows((previous) => [
      {
        ...row,
        processedAt: formatDateTime(new Date()),
        suggestion: `${row.suggestion} 已执行处理并归档到历史报警。`,
      },
      ...previous,
    ])
  }

  return (
    <div className="alerts-page">
      {isHistoryView ? (
        <div className="alerts-page__history-header">
          <button type="button" className="alerts-icon-button" onClick={() => setIsHistoryView(false)}>
            <img src={backIcon} alt="返回" />
          </button>
          <h3>历史报警</h3>
        </div>
      ) : null}

      {isHistoryView ? (
        <div className="alerts-filter-panel">
          <div className="alerts-filter-panel__row">
            <LabeledFilterField label="名称">
              <SelectDropdown
                options={ALARM_NAME_OPTIONS}
                value={historyDraft.name}
                onChange={(value) => setHistoryDraft((previous) => ({ ...previous, name: value }))}
                triggerClassName="alerts-filter-field__trigger"
                dropdownClassName="alerts-filter-field__dropdown"
                optionClassName="alerts-filter-field__option"
                triggerAriaLabel="选择报警名称"
              />
            </LabeledFilterField>
            <LabeledFilterField label="报警等级">
              <SelectDropdown
                options={ALARM_LEVEL_OPTIONS}
                value={historyDraft.level}
                onChange={(value) => setHistoryDraft((previous) => ({ ...previous, level: value }))}
                triggerClassName="alerts-filter-field__trigger"
                dropdownClassName="alerts-filter-field__dropdown"
                optionClassName="alerts-filter-field__option"
                triggerAriaLabel="选择报警等级"
              />
            </LabeledFilterField>
          </div>
          <div className="alerts-filter-panel__row">
            <LabeledFilterField label="采暖季" className="alerts-filter-field--history-date">
              <DatePickerTrigger
                value={historyDraft.heatingSeason}
                onChange={(value) => setHistoryDraft((previous) => ({ ...previous, heatingSeason: value }))}
                className="alerts-filter-field__trigger"
                title="采暖季选择"
              />
            </LabeledFilterField>
            <button
              type="button"
              className="alerts-primary-btn"
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
              triggerAriaLabel="选择报警名称"
            />
          </LabeledFilterField>
          <LabeledFilterField label="报警等级">
            <SelectDropdown
              options={ALARM_LEVEL_OPTIONS}
              value={liveDraft.level}
              onChange={(value) => setLiveDraft((previous) => ({ ...previous, level: value }))}
              triggerClassName="alerts-filter-field__trigger"
              dropdownClassName="alerts-filter-field__dropdown"
              optionClassName="alerts-filter-field__option"
              triggerAriaLabel="选择报警等级"
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
            历史报警
          </button>
        </div>
      )}

      <div className="alerts-table-wrap">
        <table className="alerts-table">
          <thead>
            <tr>
              <th>设备名称</th>
              <th>报警名称</th>
              <th>报警等级</th>
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
                          onClick={() => setHistoryRows((previous) => previous.filter((item) => item.id !== row.id))}
                        >
                          删除
                        </button>
                      ) : (
                        <button type="button" className="alerts-primary-btn is-mini" onClick={() => handleProcess(row)}>
                          处理
                        </button>
                      )}
                      <button type="button" className="alerts-dark-btn" onClick={() => setDetailRow(row)}>
                        查询
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
          disabled={(isHistoryView ? historyPage : livePage) <= 1}
          onClick={() =>
            isHistoryView
              ? setHistoryPage((previous) => Math.max(1, previous - 1))
              : setLivePage((previous) => Math.max(1, previous - 1))
          }
        >
          上一页
        </button>
        <span className="alerts-pagination__info">
          {isHistoryView ? historyPage : livePage} / {isHistoryView ? historyTotalPages : liveTotalPages}
        </span>
        <button
          type="button"
          className="alerts-pagination__btn"
          disabled={(isHistoryView ? historyPage : livePage) >= (isHistoryView ? historyTotalPages : liveTotalPages)}
          onClick={() =>
            isHistoryView
              ? setHistoryPage((previous) => Math.min(historyTotalPages, previous + 1))
              : setLivePage((previous) => Math.min(liveTotalPages, previous + 1))
          }
        >
          下一页
        </button>
      </div>

      <DetailModal row={detailRow} onClose={() => setDetailRow(null)} />
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
        <LabeledFilterField label="报警等级">
          <SelectDropdown
            options={ALARM_LEVEL_OPTIONS}
            value={draftFilters.level}
            onChange={(value) => setDraftFilters((previous) => ({ ...previous, level: value }))}
            triggerClassName="alerts-filter-field__trigger"
            dropdownClassName="alerts-filter-field__dropdown"
            optionClassName="alerts-filter-field__option"
            triggerAriaLabel="选择报警等级"
          />
        </LabeledFilterField>
        <button
          type="button"
          className="alerts-primary-btn"
          onClick={() => {
            setFilters(draftFilters)
          }}
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
              <th>报警等级</th>
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
                  <tr key={`${group.code}-${index}`}>
                    {index === 0 ? <td rowSpan={group.reasons.length}>{group.code}</td> : null}
                    {index === 0 ? <td rowSpan={group.reasons.length}>{group.name}</td> : null}
                    {index === 0 ? <td rowSpan={group.reasons.length}>{group.levelText}</td> : null}
                    <td>{reason}</td>
                    <td>{group.plans[index] ?? group.plans[group.plans.length - 1] ?? '--'}</td>
                    {index === 0 ? (
                      <td rowSpan={group.reasons.length}>
                        <div className="alerts-actions">
                          <button type="button" className="alerts-dark-btn" onClick={() => setDetailRow(group)}>
                            查询
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
  const [period, setPeriod] = useState('day')
  const [mode, setMode] = useState('trend')
  const [categoryScope, setCategoryScope] = useState('system')
  const [pieScope, setPieScope] = useState('device')
  const [query, setQuery] = useState({
    dayDate: '2026-03-10',
    monthStart: '2026-01',
    monthEnd: '2026-03',
  })

  useEffect(() => {
    onDetailBreadcrumbChange?.(null)
    return () => onDetailBreadcrumbChange?.(null)
  }, [onDetailBreadcrumbChange])

  const trendData = useMemo(
    () => (period === 'day' ? buildDayTrendData(query.dayDate) : buildMonthTrendData(query.monthStart, query.monthEnd)),
    [period, query],
  )
  const trendXAxis = useMemo(
    () =>
      period === 'day'
        ? ['00时', '02时', '04时', '06时', '08时', '10时', '12时', '14时', '16时', '18时', '20时', '22时']
        : ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    [period],
  )
  const categoryData = useMemo(() => buildScopedCategoryData(period, query, categoryScope), [categoryScope, period, query])
  const pieData = useMemo(() => buildScopedPieData(period, query, pieScope), [period, pieScope, query])
  const summary = useMemo(() => buildSummary(period, query), [period, query])
  const pieTotal = pieData.reduce((sum, item) => sum + item.value, 0) || 1

  return (
    <div className="alerts-analysis">
      <div className="alerts-analysis__toolbar">
        {period === 'day' ? (
          <DatePickerTrigger
            value={query.dayDate}
            onChange={(value) => setQuery((previous) => ({ ...previous, dayDate: value }))}
            className="alerts-analysis__date-btn"
            title="日期选择"
          />
        ) : (
          <>
            <DatePickerTrigger
              value={query.monthStart}
              onChange={(value) => setQuery((previous) => ({ ...previous, monthStart: value }))}
              type="month"
              className="alerts-analysis__date-btn"
              title="开始月份选择"
            />
            <span className="alerts-analysis__range-separator">-</span>
            <DatePickerTrigger
              value={query.monthEnd}
              onChange={(value) => setQuery((previous) => ({ ...previous, monthEnd: value }))}
              type="month"
              className="alerts-analysis__date-btn"
              placeholder="请选择月份"
              title="结束月份选择"
            />
          </>
        )}

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
          <strong>{summary.total} 个</strong>
        </article>
        <article>
          <span>未处理告警数量</span>
          <strong>{summary.pending} 个</strong>
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
          options={TREND_TYPE_OPTIONS}
          value={mode}
          onChange={setMode}
          className="alerts-analysis__mode-select"
          triggerClassName="alerts-analysis__mode-trigger"
          dropdownClassName="alerts-analysis__mode-dropdown"
          optionClassName="alerts-analysis__mode-option"
        />
      </div>

      {mode === 'trend' ? (
        <BarChart xData={trendXAxis} seriesData={trendData} max={100} />
      ) : (
        <div className="alerts-analysis__category-grid">
          <div className="alerts-analysis__category-card">
            <div className="alerts-analysis__card-head">
              <div className="alerts-analysis__card-title">告警分类统计</div>
              <SelectDropdown
                options={ANALYSIS_SCOPE_OPTIONS}
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
              max={100}
              className="alerts-analysis__chart--compact"
            />
          </div>
          <div className="alerts-analysis__category-card">
            <div className="alerts-analysis__card-head">
              <div className="alerts-analysis__card-title">设备故障分布</div>
              <SelectDropdown
                options={ANALYSIS_SCOPE_OPTIONS}
                value={pieScope}
                onChange={setPieScope}
                className="alerts-analysis__card-select"
                triggerClassName="alerts-analysis__card-trigger"
                dropdownClassName="alerts-analysis__card-dropdown"
                optionClassName="alerts-analysis__card-option"
                triggerAriaLabel="选择设备故障分布范围"
              />
            </div>
            <div className="alerts-analysis__pie-wrap">
              <PieChart data={pieData} />
              <ul>
                {pieData.map((item) => {
                  const ratio = ((item.value / pieTotal) * 100).toFixed(1)
                  return (
                    <li key={item.name}>
                      <span style={{ background: item.color }} />
                      <em>{item.name}</em>
                      <strong>
                        {item.value} 个 / {ratio}%
                      </strong>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
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
