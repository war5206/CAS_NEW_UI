import {
  enumerateMonthRange,
  formatMonthAxisLabel,
  getCurrentDateInfo,
  getMaxAvailableDay,
  getMonthDayCount,
} from '../utils/analysisFilterUtils'
import {
  getSegmentKey,
  getStoredEnergyPriceState,
  isMonthDayInRange,
  parseTimeToMinutes,
} from '../utils/energyPriceState'

const DEVICE_FACTORS = {
  'total-power': 1,
  'heat-pump': 1,
  'water-pump': 0.72,
  'coupling-energy': 0.48,
}

const DAY_BASE_VALUES = [
  580, 920, 390, 770, 560, 290, 380, 570, 350, 440, 380, 520, 520, 380, 500, 380,
  480, 380, 580, 590, 580, 480, 400, 520, 350, 250, 400, 480, 150, 180, 340,
]

const MONTH_TOTAL_VALUES = [580, 920, 500, 770, 560, 280, 380, 570, 350, 430, 380, 510]
const YEAR_BASE_VALUES = [2480, 2820, 3180, 3548.64, 3320, 3670]

const DEVICE_LABELS = {
  'total-power': '总用电',
  'heat-pump': '热泵',
  'water-pump': '水泵',
  'coupling-energy': '耦合能源',
}

const SUMMARY_COLOR = '#723DFD'
const TOTAL_BAR_COLOR = '#7A46FF'
const TOTAL_BAR_GRADIENT = [
  { offset: 0, color: '#723DFD' },
  { offset: 0.75, color: '#723DFD' },
  { offset: 1, color: 'rgba(114, 61, 253, 0)' },
]

const DAY_COMPARE_COLORS = {
  momLine: '#39C6E9',
  yoyBar: '#7C8CFF',
  yoyGradientStops: [
    { offset: 0, color: '#7C8CFF' },
    { offset: 0.72, color: '#7C8CFF' },
    { offset: 1, color: 'rgba(124, 140, 255, 0)' },
  ],
}

const DEFAULT_COMPARE_COLORS = {
  momLine: '#39C6E9',
  yoyBar: '#7C8CFF',
  yoyGradientStops: [
    { offset: 0, color: '#7C8CFF' },
    { offset: 0.72, color: '#7C8CFF' },
    { offset: 1, color: 'rgba(124, 140, 255, 0)' },
  ],
}

const UNCONFIGURED_SEGMENT = {
  key: 'unconfigured',
  label: '未配置时段',
  color: '#7D8597',
  start: '',
  end: '',
}

function roundNumber(value) {
  return Number(value.toFixed(2))
}

function formatValue(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function scaleNumber(value, factor) {
  return roundNumber(value * factor)
}

function getSegmentLabel(segment) {
  if (!segment.start || !segment.end) {
    return segment.label
  }

  return `${segment.start}-${segment.end}`
}

function getHourDemandFactor(hour) {
  if (hour < 6) return 0.62
  if (hour < 10) return 1.08
  if (hour < 14) return 1.26
  if (hour < 18) return 1.18
  if (hour < 22) return 0.96
  return 0.74
}

function buildSegmentLoadWeights(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return [UNCONFIGURED_SEGMENT]
  }

  return segments.map((segment) => {
    const startMinutes = parseTimeToMinutes(segment.start)
    const endMinutes = parseTimeToMinutes(segment.end)
    const durationHours = Math.max(1 / 60, (endMinutes - startMinutes) / 60)
    const midpointHour = (startMinutes + endMinutes) / 120

    return {
      key: segment.key ?? getSegmentKey(segment),
      label: segment.label ?? getSegmentLabel(segment),
      color: segment.color,
      weight: durationHours * getHourDemandFactor(midpointHour),
    }
  })
}

function resolveSegmentsByMonthDay(monthDay, energyPriceState) {
  const plans = energyPriceState?.electricPlans ?? []
  const matchedPlan = plans.find((plan) => isMonthDayInRange(monthDay, plan.startDate, plan.endDate))
  return matchedPlan?.segments?.length ? matchedPlan.segments : [UNCONFIGURED_SEGMENT]
}

function distributeValueByWeights(totalValue, weightedSegments) {
  if (totalValue == null) {
    return null
  }

  const normalizedSegments = weightedSegments.length > 0 ? weightedSegments : [{ ...UNCONFIGURED_SEGMENT, weight: 1 }]
  const totalWeight = normalizedSegments.reduce((sum, segment) => sum + segment.weight, 0) || 1
  let distributedTotal = 0

  return normalizedSegments.reduce((result, segment, index) => {
    const isLast = index === normalizedSegments.length - 1
    const nextValue = isLast ? roundNumber(totalValue - distributedTotal) : roundNumber((totalValue * segment.weight) / totalWeight)
    distributedTotal += nextValue

    result.set(segment.key, {
      key: segment.key,
      label: segment.label,
      color: segment.color,
      value: nextValue,
    })

    return result
  }, new Map())
}

function distributeValueAcrossSegments(totalValue, segments) {
  return distributeValueByWeights(totalValue, buildSegmentLoadWeights(segments))
}

function buildStackedSeries(labels, distributions, totals, xAxisName) {
  const segmentCatalog = new Map()

  distributions.forEach((distribution) => {
    distribution?.forEach((segment) => {
      if (!segmentCatalog.has(segment.key)) {
        segmentCatalog.set(segment.key, {
          key: segment.key,
          name: segment.label,
          color: segment.color,
        })
      }
    })
  })

  const catalog = Array.from(segmentCatalog.values())

  return {
    labels,
    tooltipLabels: labels,
    xAxisName,
    legend: catalog,
    totals,
    series: catalog.map((segment) => ({
      name: segment.name,
      type: 'bar',
      stack: 'power-usage-period',
      data: distributions.map((distribution) => {
        if (distribution == null) {
          return null
        }

        return distribution.get(segment.key)?.value ?? 0
      }),
      color: segment.color,
      barWidth: labels.length > 12 ? 18 : 28,
    })),
  }
}

function buildDaySeries(range, factor, energyPriceState) {
  const monthValue = range.month || '2026-03'
  const days = getMonthDayCount(monthValue)
  const maxAvailableDay = getMaxAvailableDay(monthValue, getCurrentDateInfo())
  const labels = Array.from({ length: days }, (_, index) => `${index + 1}日`)
  const tooltipLabels = Array.from({ length: days }, (_, index) => `${monthValue}-${String(index + 1).padStart(2, '0')}`)
  const totals = Array.from({ length: days }, (_, index) =>
    index + 1 <= maxAvailableDay ? scaleNumber(DAY_BASE_VALUES[index % DAY_BASE_VALUES.length], factor) : null,
  )
  const distributions = totals.map((total, index) => {
    if (total == null) {
      return null
    }

    const [, monthText] = monthValue.split('-')
    const monthDay = `${monthText}-${String(index + 1).padStart(2, '0')}`
    return distributeValueAcrossSegments(total, resolveSegmentsByMonthDay(monthDay, energyPriceState))
  })

  return {
    ...buildStackedSeries(labels, distributions, totals, '日'),
    tooltipLabels,
    yAxisMax: 1000,
    yAxisInterval: 200,
  }
}

function buildMonthSeries(range, factor) {
  const monthRange = enumerateMonthRange(range.startMonth, range.endMonth)
  const labels = monthRange.map((item) => formatMonthAxisLabel(item.value))
  const totals = monthRange.map((item) => scaleNumber(MONTH_TOTAL_VALUES[item.month - 1] ?? MONTH_TOTAL_VALUES[0], factor))

  return {
    labels,
    tooltipLabels: monthRange.map((item) => item.value),
    xAxisName: '月',
    yAxisMax: 1000,
    yAxisInterval: 200,
    legend: [{ name: '用电量', color: TOTAL_BAR_COLOR }],
    totals,
    series: [
      {
        name: '用电量',
        type: 'bar',
        data: totals,
        color: TOTAL_BAR_COLOR,
        gradientStops: TOTAL_BAR_GRADIENT,
        barWidth: labels.length > 12 ? 18 : 28,
      },
    ],
  }
}

function buildYearSeries(range, factor) {
  const startYear = Number(range.startYear || '2021')
  const endYear = Number(range.endYear || range.startYear || '2026')
  const labels = []

  for (let year = startYear; year <= endYear; year += 1) {
    labels.push(String(year))
  }

  const safeLabels = labels.length > 0 ? labels : ['2026']
  const totals = safeLabels.map((_, index) => scaleNumber(YEAR_BASE_VALUES[index % YEAR_BASE_VALUES.length], factor))

  return {
    labels: safeLabels,
    tooltipLabels: safeLabels,
    xAxisName: '年',
    yAxisMax: 4000,
    yAxisInterval: 800,
    legend: [{ name: '用电量', color: TOTAL_BAR_COLOR }],
    totals,
    series: [
      {
        name: '用电量',
        type: 'bar',
        data: totals,
        color: TOTAL_BAR_COLOR,
        gradientStops: TOTAL_BAR_GRADIENT,
        barWidth: 42,
      },
    ],
  }
}

function sumValues(values) {
  return values.reduce((sum, value) => sum + (value ?? 0), 0)
}

function countValidValues(values) {
  return values.filter((value) => value != null).length || 1
}

function buildSummaryCards(period, totals) {
  const totalValue = sumValues(totals)
  const averageValue = totalValue / countValidValues(totals)

  if (period === '日') {
    return [
      { label: '当前月总用电量（kWh）', value: formatValue(totalValue), color: SUMMARY_COLOR },
      { label: '日均用电量（kWh）', value: formatValue(averageValue), color: SUMMARY_COLOR },
    ]
  }

  if (period === '月') {
    return [
      { label: '区间总用电量（kWh）', value: formatValue(totalValue), color: SUMMARY_COLOR },
      { label: '月均用电量（kWh）', value: formatValue(averageValue), color: SUMMARY_COLOR },
    ]
  }

  return [
    { label: '区间总用电量（kWh）', value: formatValue(totalValue), color: SUMMARY_COLOR },
    { label: '年均用电量（kWh）', value: formatValue(averageValue), color: SUMMARY_COLOR },
  ]
}

export function getPowerTypeOptions() {
  return [
    { label: DEVICE_LABELS['total-power'], value: 'total-power' },
    { label: DEVICE_LABELS['heat-pump'], value: 'heat-pump' },
    { label: DEVICE_LABELS['water-pump'], value: 'water-pump' },
    { label: DEVICE_LABELS['coupling-energy'], value: 'coupling-energy' },
  ]
}

export function buildPowerStatisticsViewModel({ period, range, equipmentType, energyPriceState }) {
  const deviceFactor = DEVICE_FACTORS[equipmentType] ?? 1
  const resolvedEnergyPriceState = energyPriceState ?? getStoredEnergyPriceState()

  let chart
  if (period === '日') {
    chart = buildDaySeries(range, deviceFactor, resolvedEnergyPriceState)
  } else if (period === '月') {
    chart = buildMonthSeries(range, deviceFactor)
  } else {
    chart = buildYearSeries(range, deviceFactor)
  }

  return {
    summaryCards: buildSummaryCards(period, chart.totals),
    chartModel: {
      variant: 'power-statistics',
      yAxisName: 'kWh',
      valueSuffix: ' kWh',
      currentTotalLabel: period === '日' ? '当前总用电量' : '总用电量',
      currentSeriesNames: chart.series.map((item) => item.name),
      labels: chart.labels,
      tooltipLabels: chart.tooltipLabels,
      xAxisName: chart.xAxisName,
      yAxisMax: chart.yAxisMax,
      yAxisInterval: chart.yAxisInterval,
      compareBasisData: chart.totals,
      compareLegendNames: {
        mom: '上一周期用电量',
        yoy: '去年同期用电量',
      },
      compareColors: period === '日' ? DAY_COMPARE_COLORS : DEFAULT_COMPARE_COLORS,
      legend: chart.legend.map((item) => ({
        name: item.name,
        color: item.color,
      })),
      series: chart.series.map((item) => ({
        ...item,
        gradientStops: item.gradientStops,
        tooltipColor: item.color,
        itemStyleColor: item.color,
      })),
    },
  }
}
