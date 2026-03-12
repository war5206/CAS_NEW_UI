const COMPARE_FACTORS = {
  none: 1,
  mom: 0.94,
  yoy: 1.07,
}

const DAY_BASE_VALUES = [
  580, 920, 390, 770, 560, 290, 380, 570, 350, 440, 380, 520, 520, 380, 500, 380,
  480, 380, 580, 590, 580, 480, 400, 520, 350, 250, 400, 480, 150, 180, 340,
]

const MONTH_BASE_VALUES = [2480, 2920, 2310, 3140, 2870, 2440, 2680, 3010, 2850, 2920, 2760, 3180]
const YEAR_BASE_VALUES = [12280, 13860, 14940, 15620, 14880, 16240]

const PAGE_CONFIGS = {
  water: {
    title: '用水量',
    titleOptions: [],
    accentColor: '#1FA8FF',
    legendName: '用水量',
    unit: 't',
    yAxisMaxDayMonth: 1000,
    yAxisIntervalDayMonth: 200,
    yAxisMaxYear: 20000,
    yAxisIntervalYear: 4000,
    gradientStops: [
      { offset: 0, color: '#1FA8FF' },
      { offset: 0.75, color: '#1FA8FF' },
      { offset: 1, color: 'rgba(31, 168, 255, 0)' },
    ],
    cardLabels: {
      day: ['当月总用水量（t）', '日均用水量（t）'],
      month: ['年度总用水量（t）', '日均用水量（t）'],
      year: ['区间总用水量（t）', '年均用水量（t）'],
    },
    summaryValues: {
      day: [655, 645.12],
      month: [3548.64, 645.12],
      year: [18645.52, 3245.16],
    },
    valueScale: 0.8,
  },
  heat: {
    title: '耗热量',
    titleOptions: [],
    accentColor: '#D247B1',
    legendName: '耗热量',
    unit: 'kWh',
    yAxisMaxDayMonth: 1000,
    yAxisIntervalDayMonth: 200,
    yAxisMaxYear: 20000,
    yAxisIntervalYear: 4000,
    gradientStops: [
      { offset: 0, color: '#D247B1' },
      { offset: 0.75, color: '#D247B1' },
      { offset: 1, color: 'rgba(210, 71, 177, 0)' },
    ],
    cardLabels: {
      day: ['当月总耗热量（kWh）', '日均耗热量（kWh）'],
      month: ['年度总耗热量（kWh）', '日均耗热量（kWh）'],
      year: ['区间总耗热量（kWh）', '年均耗热量（kWh）'],
    },
    summaryValues: {
      day: [655, 645.12],
      month: [3548.64, 645.12],
      year: [18645.52, 3245.16],
    },
    valueScale: 1,
  },
  cold: {
    title: '制冷量',
    titleOptions: [],
    accentColor: '#1E73FF',
    legendName: '制冷量',
    unit: 'kWh',
    yAxisMaxDayMonth: 1000,
    yAxisIntervalDayMonth: 200,
    yAxisMaxYear: 20000,
    yAxisIntervalYear: 4000,
    gradientStops: [
      { offset: 0, color: '#1E73FF' },
      { offset: 0.75, color: '#1E73FF' },
      { offset: 1, color: 'rgba(30, 115, 255, 0)' },
    ],
    cardLabels: {
      day: ['当月总制冷量（kWh）', '日均制冷量（kWh）'],
      month: ['年度总制冷量（kWh）', '日均制冷量（kWh）'],
      year: ['区间总制冷量（kWh）', '年均制冷量（kWh）'],
    },
    summaryValues: {
      day: [655, 645.12],
      month: [3548.64, 645.12],
      year: [18645.52, 3245.16],
    },
    valueScale: 1,
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
    yAxisMaxDayMonth: 1000,
    yAxisIntervalDayMonth: 200,
    yAxisMaxYear: 20000,
    yAxisIntervalYear: 4000,
    gradientStops: [
      { offset: 0, color: '#F0A216' },
      { offset: 0.75, color: '#F0A216' },
      { offset: 1, color: 'rgba(240, 162, 22, 0)' },
    ],
    cardLabels: {
      day: ['总费用（元）', '月均费用（元）'],
      month: ['年度总费用（元）', '月均费用（元）'],
      year: ['区间总费用（元）', '年均费用（元）'],
    },
    summaryValues: {
      day: [65555.12, 6177.21],
      month: [245880.42, 12876.22],
      year: [865420.66, 173084.13],
    },
    valueScale: 1,
  },
}

function scaleNumber(value, factor) {
  return Number((value * factor).toFixed(2))
}

function getMonthDays(monthValue) {
  const [year, month] = (monthValue || '2025-03').split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

function buildMonthRange(startMonthValue, endMonthValue) {
  const startValue = startMonthValue || endMonthValue || '2025-01'
  const endValue = endMonthValue || startMonthValue || startValue
  let [startYear, startMonth] = startValue.split('-').map(Number)
  let [endYear, endMonth] = endValue.split('-').map(Number)

  if (startYear > endYear || (startYear === endYear && startMonth > endMonth)) {
    ;[startYear, endYear] = [endYear, startYear]
    ;[startMonth, endMonth] = [endMonth, startMonth]
  }

  const months = []
  let year = startYear
  let month = startMonth

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({
      value: `${year}-${String(month).padStart(2, '0')}`,
      label: String(month).padStart(2, '0'),
      monthIndex: month - 1,
    })

    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }

    if (months.length >= 24) {
      break
    }
  }

  return months.length > 0
    ? months
    : [{ value: startValue, label: String(startMonth).padStart(2, '0'), monthIndex: startMonth - 1 }]
}

function formatValue(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function buildDayChart(config, range, factor) {
  const monthValue = range.month || '2025-03'
  const days = getMonthDays(monthValue)
  const labels = Array.from({ length: days }, (_, index) => String(index + 1).padStart(2, '0'))

  return {
    labels,
    tooltipLabels: labels.map((label) => `${monthValue}-${label}`),
    xAxisName: '日',
    yAxisMax: config.yAxisMaxDayMonth,
    yAxisInterval: config.yAxisIntervalDayMonth,
    series: [
      {
        name: config.legendName,
        data: DAY_BASE_VALUES.slice(0, days).map((value) => scaleNumber(value * config.valueScale, factor)),
      },
    ],
  }
}

function buildMonthChart(config, range, factor) {
  const monthRange = buildMonthRange(range.startMonth, range.endMonth)

  return {
    labels: monthRange.map((item) => item.label),
    tooltipLabels: monthRange.map((item) => item.value),
    xAxisName: '月',
    yAxisMax: config.yAxisMaxDayMonth,
    yAxisInterval: config.yAxisIntervalDayMonth,
    series: [
      {
        name: config.legendName,
        data: monthRange.map((item) =>
          scaleNumber((MONTH_BASE_VALUES[item.monthIndex] / 4) * Math.max(config.valueScale, 0.85), factor)
        ),
      },
    ],
  }
}

function buildYearChart(config, range, factor) {
  const startYear = Number(range.startYear || '2021')
  const endYear = Number(range.endYear || range.startYear || '2026')
  const labels = []

  for (let year = startYear; year <= endYear; year += 1) {
    labels.push(String(year))
  }

  const safeLabels = labels.length > 0 ? labels : ['2025']

  return {
    labels: safeLabels,
    tooltipLabels: safeLabels,
    xAxisName: '年',
    yAxisMax: config.yAxisMaxYear,
    yAxisInterval: config.yAxisIntervalYear,
    series: [
      {
        name: config.legendName,
        data: safeLabels.map((_, index) => scaleNumber(YEAR_BASE_VALUES[index % YEAR_BASE_VALUES.length], factor)),
      },
    ],
  }
}

function buildSummaryCards(config, period, factor) {
  const key = period === '日' ? 'day' : period === '月' ? 'month' : 'year'
  const values = config.summaryValues[key]
  const labels = config.cardLabels[key]

  return labels.map((label, index) => ({
    label,
    color: config.accentColor,
    value: formatValue(scaleNumber(values[index], factor)),
  }))
}

export function getResourceStatisticsPageConfig(pageType) {
  return PAGE_CONFIGS[pageType]
}

export function buildResourceStatisticsViewModel({ pageType, period, range, compareMode }) {
  const config = PAGE_CONFIGS[pageType]
  const factor = COMPARE_FACTORS[compareMode] ?? 1

  let chart
  if (period === '日') {
    chart = buildDayChart(config, range, factor)
  } else if (period === '月') {
    chart = buildMonthChart(config, range, factor)
  } else {
    chart = buildYearChart(config, range, factor)
  }

  return {
    pageConfig: config,
    summaryCards: buildSummaryCards(config, period, factor),
    chartModel: {
      variant: 'power-statistics',
      yAxisName: config.unit,
      labels: chart.labels,
      tooltipLabels: chart.tooltipLabels,
      xAxisName: chart.xAxisName,
      yAxisMax: chart.yAxisMax,
      yAxisInterval: chart.yAxisInterval,
      compareBasisData: chart.series[0].data,
      compareLegendNames: {
        mom: `上一周期${config.legendName}`,
        yoy: `去年同期${config.legendName}`,
      },
      legend: [{ name: config.legendName, color: config.accentColor }],
      series: chart.series.map((item) => ({
        ...item,
        type: 'bar',
        barWidth: period === '年' ? 42 : 26,
        gradientStops: config.gradientStops,
        tooltipColor: config.accentColor,
      })),
    },
  }
}
