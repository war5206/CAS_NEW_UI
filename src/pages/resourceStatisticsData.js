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

const COST_DEVICE_FACTORS = {
  'total-cost': 1,
  'heat-pump': 1,
  'water-pump': 0.72,
  'coupling-energy': 0.48,
}

const DAY_BASE_VALUES = [
  580, 920, 390, 770, 560, 290, 380, 570, 350, 440, 380, 520, 520, 380, 500, 380,
  480, 380, 580, 590, 580, 480, 400, 520, 350, 250, 400, 480, 150, 180, 340,
]

const YEAR_BASE_VALUES = [12280, 13860, 14940, 15620, 14880, 16240]

const DEFAULT_COMPARE_COLORS = {
  momLine: '#39C6E9',
  yoyBar: '#7C8CFF',
  yoyGradientStops: [
    { offset: 0, color: '#7C8CFF' },
    { offset: 0.72, color: '#7C8CFF' },
    { offset: 1, color: 'rgba(124, 140, 255, 0)' },
  ],
}

const DAY_COMPARE_COLORS = {
  momLine: '#39C6E9',
  yoyBar: '#7C8CFF',
  yoyGradientStops: [
    { offset: 0, color: '#7C8CFF' },
    { offset: 0.72, color: '#7C8CFF' },
    { offset: 1, color: 'rgba(124, 140, 255, 0)' },
  ],
}

const COOL_TONE_COMPARE_COLORS = {
  momLine: '#35D39A',
  yoyBar: '#FFB44D',
  yoyGradientStops: [
    { offset: 0, color: '#FFB44D' },
    { offset: 0.72, color: '#FFB44D' },
    { offset: 1, color: 'rgba(255, 180, 77, 0)' },
  ],
}

const PAGE_CONFIGS = {
  water: {
    title: '用水量',
    titleOptions: [],
    accentColor: '#1FA8FF',
    compareColors: COOL_TONE_COMPARE_COLORS,
    legendName: '用水量',
    unit: 't',
    valueSuffix: ' t',
    gradientStops: [
      { offset: 0, color: '#1FA8FF' },
      { offset: 0.75, color: '#1FA8FF' },
      { offset: 1, color: 'rgba(31, 168, 255, 0)' },
    ],
    cardLabels: {
      day: ['当前月总用水量（t）', '日均用水量（t）'],
      month: ['区间总用水量（t）', '月均用水量（t）'],
      year: ['区间总用水量（t）', '年均用水量（t）'],
    },
    summaryValues: {
      day: [655, 645.12],
      month: [3548.64, 645.12],
      year: [18645.52, 3245.16],
    },
    valueScale: 0.8,
    yAxisMaxDayMonth: 800,
    yAxisIntervalDayMonth: 200,
    yAxisMaxYear: 12000,
    yAxisIntervalYear: 4000,
  },
  heat: {
    title: '耗热量',
    titleOptions: [],
    accentColor: '#D247B1',
    legendName: '耗热量',
    unit: 'kWh',
    valueSuffix: ' kWh',
    gradientStops: [
      { offset: 0, color: '#D247B1' },
      { offset: 0.75, color: '#D247B1' },
      { offset: 1, color: 'rgba(210, 71, 177, 0)' },
    ],
    cardLabels: {
      day: ['当前月总耗热量（kWh）', '日均耗热量（kWh）'],
      month: ['区间总耗热量（kWh）', '月均耗热量（kWh）'],
      year: ['区间总耗热量（kWh）', '年均耗热量（kWh）'],
    },
    summaryValues: {
      day: [655, 645.12],
      month: [3548.64, 645.12],
      year: [18645.52, 3245.16],
    },
    valueScale: 1,
    yAxisMaxDayMonth: 800,
    yAxisIntervalDayMonth: 200,
    yAxisMaxYear: 12000,
    yAxisIntervalYear: 4000,
  },
  cold: {
    title: '制冷量',
    titleOptions: [],
    accentColor: '#1E73FF',
    compareColors: COOL_TONE_COMPARE_COLORS,
    legendName: '制冷量',
    unit: 'kWh',
    valueSuffix: ' kWh',
    gradientStops: [
      { offset: 0, color: '#1E73FF' },
      { offset: 0.75, color: '#1E73FF' },
      { offset: 1, color: 'rgba(30, 115, 255, 0)' },
    ],
    cardLabels: {
      day: ['当前月总制冷量（kWh）', '日均制冷量（kWh）'],
      month: ['区间总制冷量（kWh）', '月均制冷量（kWh）'],
      year: ['区间总制冷量（kWh）', '年均制冷量（kWh）'],
    },
    summaryValues: {
      day: [655, 645.12],
      month: [3548.64, 645.12],
      year: [18645.52, 3245.16],
    },
    valueScale: 1,
    yAxisMaxDayMonth: 800,
    yAxisIntervalDayMonth: 200,
    yAxisMaxYear: 12000,
    yAxisIntervalYear: 4000,
  },
  cost: {
    title: '总费用',
    titleOptions: [
      { label: '总费用', value: 'total-cost' },
      { label: '热泵', value: 'heat-pump' },
      { label: '水泵', value: 'water-pump' },
      { label: '耦合能源', value: 'coupling-energy' },
    ],
    accentColor: '#F0A216',
    legendName: '费用',
    unit: '元',
    valueSuffix: ' 元',
    gradientStops: [
      { offset: 0, color: '#F0A216' },
      { offset: 0.75, color: '#F0A216' },
      { offset: 1, color: 'rgba(240, 162, 22, 0)' },
    ],
    cardLabels: {
      day: ['当前月总费用（元）', '日均费用（元）'],
      month: ['区间总费用（元）', '月均费用（元）'],
      year: ['区间总费用（元）', '年均费用（元）'],
    },
  },
}

function roundNumber(value) {
  return Number(value.toFixed(2))
}

function scaleNumber(value, factor) {
  return roundNumber(value * factor)
}

function formatValue(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function getHourDemandFactor(hour) {
  if (hour < 6) return 0.62
  if (hour < 10) return 1.08
  if (hour < 14) return 1.26
  if (hour < 18) return 1.18
  if (hour < 22) return 0.96
  return 0.74
}

function getDayEnergyValue(monthValue, dayIndex, factor) {
  const maxAvailableDay = getMaxAvailableDay(monthValue, getCurrentDateInfo())
  if (dayIndex + 1 > maxAvailableDay) {
    return null
  }

  return scaleNumber(DAY_BASE_VALUES[dayIndex % DAY_BASE_VALUES.length], factor)
}

function buildSegmentWeights(segments) {
  return segments.map((segment) => {
    const startMinutes = parseTimeToMinutes(segment.start)
    const endMinutes = parseTimeToMinutes(segment.end)
    const durationHours = Math.max(1 / 60, (endMinutes - startMinutes) / 60)
    const midpointHour = (startMinutes + endMinutes) / 120

    return {
      key: getSegmentKey(segment),
      label: `${Number(segment.price || 0).toFixed(2)}元/kWh`,
      color: segment.color,
      price: Number(segment.price || 0),
      weight: durationHours * getHourDemandFactor(midpointHour),
    }
  })
}

function resolvePlanSegments(monthDay, energyPriceState) {
  const plans = energyPriceState?.electricPlans ?? []
  const matchedPlan = plans.find((plan) => isMonthDayInRange(monthDay, plan.startDate, plan.endDate))
  return matchedPlan?.segments?.length ? matchedPlan.segments : []
}

function distributeEnergyBySegments(totalEnergy, segments) {
  if (totalEnergy == null) {
    return null
  }

  const weightedSegments = buildSegmentWeights(segments)
  if (weightedSegments.length === 0) {
    return new Map()
  }

  const totalWeight = weightedSegments.reduce((sum, segment) => sum + segment.weight, 0) || 1
  let distributedTotal = 0

  const distributedBySegment = weightedSegments.reduce((result, segment, index) => {
    const isLast = index === weightedSegments.length - 1
    const energyValue = isLast ? roundNumber(totalEnergy - distributedTotal) : roundNumber((totalEnergy * segment.weight) / totalWeight)
    distributedTotal += energyValue

    const priceKey = `price-${segment.price.toFixed(4)}`
    const previous = result.get(priceKey)
    result.set(priceKey, {
      key: priceKey,
      label: segment.label,
      color: previous?.color ?? segment.color,
      price: segment.price,
      energyValue: roundNumber((previous?.energyValue ?? 0) + energyValue),
      value: roundNumber((previous?.value ?? 0) + roundNumber(energyValue * segment.price)),
    })

    return result
  }, new Map())

  return distributedBySegment
}

function buildCostDayChart(range, factor, energyPriceState) {
  const monthValue = range.month || '2026-03'
  const days = getMonthDayCount(monthValue)
  const labels = Array.from({ length: days }, (_, index) => `${index + 1}日`)
  const tooltipLabels = Array.from({ length: days }, (_, index) => `${monthValue}-${String(index + 1).padStart(2, '0')}`)
  const distributions = labels.map((_, index) => {
    const totalEnergy = getDayEnergyValue(monthValue, index, factor)
    if (totalEnergy == null) {
      return null
    }

    const [, monthText] = monthValue.split('-')
    const monthDay = `${monthText}-${String(index + 1).padStart(2, '0')}`
    return distributeEnergyBySegments(totalEnergy, resolvePlanSegments(monthDay, energyPriceState))
  })
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

  const legend = Array.from(segmentCatalog.values())
  const totals = distributions.map((distribution) =>
    distribution == null ? null : roundNumber(Array.from(distribution.values()).reduce((sum, item) => sum + item.value, 0)),
  )

  return {
    labels,
    tooltipLabels,
    xAxisName: '日',
    yAxisMax: 800,
    yAxisInterval: 200,
    legend,
    totals,
    series: legend.map((segment) => ({
      name: segment.name,
      type: 'bar',
      stack: 'cost-period',
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

function sumMonthDayCosts(monthValue, factor, energyPriceState) {
  const days = getMonthDayCount(monthValue)
  let totalCost = 0

  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    const totalEnergy = getDayEnergyValue(monthValue, dayIndex, factor)
    if (totalEnergy == null) {
      continue
    }

    const [, monthText] = monthValue.split('-')
    const monthDay = `${monthText}-${String(dayIndex + 1).padStart(2, '0')}`
    const distribution = distributeEnergyBySegments(totalEnergy, resolvePlanSegments(monthDay, energyPriceState))
    totalCost += Array.from(distribution.values()).reduce((sum, item) => sum + item.value, 0)
  }

  return roundNumber(totalCost)
}

function buildCostMonthChart(range, factor, energyPriceState) {
  const monthRange = enumerateMonthRange(range.startMonth, range.endMonth)
  const labels = monthRange.map((item) => formatMonthAxisLabel(item.value))
  const totals = monthRange.map((item) => sumMonthDayCosts(item.value, factor, energyPriceState))

  return {
    labels,
    tooltipLabels: monthRange.map((item) => item.value),
    xAxisName: '月',
    yAxisMax: 12000,
    yAxisInterval: 4000,
    legend: [{ name: '费用', color: PAGE_CONFIGS.cost.accentColor }],
    totals,
    series: [
      {
        name: '费用',
        type: 'bar',
        data: totals,
        color: PAGE_CONFIGS.cost.accentColor,
        gradientStops: PAGE_CONFIGS.cost.gradientStops,
        barWidth: labels.length > 12 ? 18 : 28,
      },
    ],
  }
}

function buildCostYearChart(range, factor, energyPriceState) {
  const startYear = Number(range.startYear || '2021')
  const endYear = Number(range.endYear || range.startYear || '2026')
  const labels = []

  for (let year = startYear; year <= endYear; year += 1) {
    labels.push(String(year))
  }

  const safeLabels = labels.length > 0 ? labels : ['2026']
  const currentDateInfo = getCurrentDateInfo()
  const totals = safeLabels.map((yearLabel, yearIndex) => {
    const year = Number(yearLabel)
    let totalCost = 0

    for (let month = 1; month <= 12; month += 1) {
      if (year > currentDateInfo.year || (year === currentDateInfo.year && month > currentDateInfo.month)) {
        continue
      }

      const monthValue = `${year}-${String(month).padStart(2, '0')}`
      totalCost += sumMonthDayCosts(monthValue, factor, energyPriceState)
    }

    if (totalCost <= 0) {
      return scaleNumber(YEAR_BASE_VALUES[yearIndex % YEAR_BASE_VALUES.length], factor)
    }

    return roundNumber(totalCost)
  })

  return {
    labels: safeLabels,
    tooltipLabels: safeLabels,
    xAxisName: '年',
    yAxisMax: 120000,
    yAxisInterval: 40000,
    legend: [{ name: '费用', color: PAGE_CONFIGS.cost.accentColor }],
    totals,
    series: [
      {
        name: '费用',
        type: 'bar',
        data: totals,
        color: PAGE_CONFIGS.cost.accentColor,
        gradientStops: PAGE_CONFIGS.cost.gradientStops,
        barWidth: 42,
      },
    ],
  }
}

function buildGenericChart(config, period, range, factor) {
  if (period === '日') {
    const monthValue = range.month || '2026-03'
    const days = getMonthDayCount(monthValue)
    const labels = Array.from({ length: days }, (_, index) => `${index + 1}日`)

    return {
      labels,
      tooltipLabels: Array.from({ length: days }, (_, index) => `${monthValue}-${String(index + 1).padStart(2, '0')}`),
      xAxisName: '日',
      yAxisMax: config.yAxisMaxDayMonth,
      yAxisInterval: config.yAxisIntervalDayMonth,
      totals: Array.from({ length: days }, (_, index) => {
        const maxAvailableDay = getMaxAvailableDay(monthValue, getCurrentDateInfo())
        return index + 1 <= maxAvailableDay ? scaleNumber(DAY_BASE_VALUES[index % DAY_BASE_VALUES.length] * config.valueScale, factor) : null
      }),
    }
  }

  if (period === '月') {
    const monthRange = enumerateMonthRange(range.startMonth, range.endMonth)
    return {
      labels: monthRange.map((item) => formatMonthAxisLabel(item.value)),
      tooltipLabels: monthRange.map((item) => item.value),
      xAxisName: '月',
      yAxisMax: config.yAxisMaxDayMonth,
      yAxisInterval: config.yAxisIntervalDayMonth,
      totals: monthRange.map((item) => scaleNumber((DAY_BASE_VALUES[item.month % DAY_BASE_VALUES.length] * 4) * config.valueScale, factor)),
    }
  }

  const startYear = Number(range.startYear || '2021')
  const endYear = Number(range.endYear || range.startYear || '2026')
  const labels = []

  for (let year = startYear; year <= endYear; year += 1) {
    labels.push(String(year))
  }

  const safeLabels = labels.length > 0 ? labels : ['2026']
  return {
    labels: safeLabels,
    tooltipLabels: safeLabels,
    xAxisName: '年',
    yAxisMax: config.yAxisMaxYear,
    yAxisInterval: config.yAxisIntervalYear,
    totals: safeLabels.map((_, index) => scaleNumber(YEAR_BASE_VALUES[index % YEAR_BASE_VALUES.length] * config.valueScale, factor)),
  }
}

function buildSummaryCardsFromTotals(config, period, totals) {
  const key = period === '日' ? 'day' : period === '月' ? 'month' : 'year'
  const labels = config.cardLabels[key]
  const totalValue = totals.reduce((sum, value) => sum + (value ?? 0), 0)
  const averageValue = totalValue / Math.max(1, totals.filter((value) => value != null).length)

  return [
    {
      label: labels[0],
      color: config.accentColor,
      value: formatValue(totalValue),
    },
    {
      label: labels[1],
      color: config.accentColor,
      value: formatValue(averageValue),
    },
  ]
}

export function getResourceStatisticsPageConfig(pageType) {
  return PAGE_CONFIGS[pageType]
}

export function buildResourceStatisticsViewModel({ pageType, period, range, titleValue, energyPriceState }) {
  const config = PAGE_CONFIGS[pageType]
  if (pageType !== 'cost') {
    const chart = buildGenericChart(config, period, range, 1)

    return {
      pageConfig: config,
      summaryCards: buildSummaryCardsFromTotals(config, period, chart.totals),
      chartModel: {
        variant: 'power-statistics',
        yAxisName: config.unit,
        valueSuffix: config.valueSuffix,
        currentTotalLabel: period === '日' ? `当前总${config.legendName}` : `总${config.legendName}`,
        currentSeriesNames: [config.legendName],
        labels: chart.labels,
        tooltipLabels: chart.tooltipLabels,
        xAxisName: chart.xAxisName,
        yAxisMax: chart.yAxisMax,
        yAxisInterval: chart.yAxisInterval,
        compareBasisData: chart.totals,
        compareLegendNames: {
          mom: `上一周期${config.legendName}`,
          yoy: `去年同期${config.legendName}`,
        },
        compareColors: config.compareColors ?? DEFAULT_COMPARE_COLORS,
        legend: [{ name: config.legendName, color: config.accentColor }],
        series: [
          {
            name: config.legendName,
            type: 'bar',
            data: chart.totals,
            barWidth: period === '年' ? 42 : 26,
            gradientStops: config.gradientStops,
            tooltipColor: config.accentColor,
            itemStyleColor: config.accentColor,
          },
        ],
      },
    }
  }

  const resolvedEnergyPriceState = energyPriceState ?? getStoredEnergyPriceState()
  const deviceFactor = COST_DEVICE_FACTORS[titleValue || 'total-cost'] ?? 1

  let chart
  if (period === '日') {
    chart = buildCostDayChart(range, deviceFactor, resolvedEnergyPriceState)
  } else if (period === '月') {
    chart = buildCostMonthChart(range, deviceFactor, resolvedEnergyPriceState)
  } else {
    chart = buildCostYearChart(range, deviceFactor, resolvedEnergyPriceState)
  }

  return {
    pageConfig: config,
    summaryCards: buildSummaryCardsFromTotals(config, period, chart.totals),
    chartModel: {
      variant: 'power-statistics',
      yAxisName: config.unit,
      valueSuffix: config.valueSuffix,
      currentTotalLabel: period === '日' ? '当前总费用' : '总费用',
      currentSeriesNames: chart.series.map((item) => item.name),
      labels: chart.labels,
      tooltipLabels: chart.tooltipLabels,
      xAxisName: chart.xAxisName,
      yAxisMax: chart.yAxisMax,
      yAxisInterval: chart.yAxisInterval,
      compareBasisData: chart.totals,
      compareLegendNames: {
        mom: '上一周期费用',
        yoy: '去年同期费用',
      },
      breakdownTitle: '电价',
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
