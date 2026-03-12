const DEVICE_FACTORS = {
  'heat-pump': 1,
  'water-pump': 0.72,
  'coupling-energy': 0.48,
}

const COMPARE_FACTORS = {
  none: 1,
  mom: 0.93,
  yoy: 1.08,
}

const DAY_BASE_VALUES = [
  580, 920, 390, 770, 560, 290, 380, 570, 350, 440, 380, 520, 520, 380, 500, 380,
  480, 380, 580, 590, 580, 480, 400, 520, 350, 250, 400, 480, 150, 180, 340,
]

const MONTH_HEATING_VALUES = [580, 920, 500, 770, null, null, null, null, 350, 430, 380, 510]
const MONTH_COOLING_VALUES = [null, null, null, null, 560, 280, 380, 570, null, null, null, null]
const YEAR_BASE_VALUES = [2480, 2820, 3180, 3548.64, 3320, 3670]

const DEVICE_LABELS = {
  'total-power': '总电量',
  'heat-pump': '热泵',
  'water-pump': '水泵',
  'coupling-energy': '耦合能源',
}

const SERIES_COLORS = {
  purple: {
    stops: [
      { offset: 0, color: '#723DFD' },
      { offset: 0.75, color: '#723DFD' },
      { offset: 1, color: 'rgba(114, 61, 253, 0)' },
    ],
    legendColor: '#7a46ff',
  },
  heating: {
    stops: [
      { offset: 0, color: '#CC3DAB' },
      { offset: 0.75, color: '#CC3DAB' },
      { offset: 1, color: 'rgba(114, 61, 253, 0)' },
    ],
    legendColor: '#d346b0',
  },
  cooling: {
    stops: [
      { offset: 0, color: '#0066FF' },
      { offset: 0.75, color: '#0066FF' },
      { offset: 1, color: 'rgba(61, 61, 253, 0)' },
    ],
    legendColor: '#1f7bff',
  },
}

function scaleNumber(value, factor) {
  return Number((value * factor).toFixed(2))
}

function scaleNullableValue(value, factor) {
  if (value == null) {
    return null
  }

  return scaleNumber(value, factor)
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

function buildDaySeries(range, factor) {
  const monthValue = range.month || '2025-03'
  const days = getMonthDays(monthValue)
  const labels = Array.from({ length: days }, (_, index) => String(index + 1).padStart(2, '0'))
  const tooltipLabels = labels.map((label) => `${monthValue}-${label}`)
  const values = DAY_BASE_VALUES.slice(0, days).map((value) => scaleNumber(value, factor))

  return {
    labels,
    tooltipLabels,
    xAxisName: '日',
    yAxisMax: 1000,
    yAxisInterval: 200,
    legend: [{ name: '用电量', colorKey: 'purple' }],
    series: [
      {
        name: '用电量',
        type: 'bar',
        data: values,
        colorKey: 'purple',
        barWidth: 26,
      },
    ],
  }
}

function buildMonthSeries(range, factor) {
  const monthRange = buildMonthRange(range.startMonth, range.endMonth)

  return {
    labels: monthRange.map((item) => item.label),
    tooltipLabels: monthRange.map((item) => item.value),
    xAxisName: '月',
    yAxisMax: 1000,
    yAxisInterval: 200,
    legend: [
      { name: '采暖耗电', colorKey: 'heating' },
      { name: '制冷耗电', colorKey: 'cooling' },
    ],
    series: [
      {
        name: '采暖耗电',
        type: 'bar',
        data: monthRange.map((item) => scaleNullableValue(MONTH_HEATING_VALUES[item.monthIndex], factor)),
        colorKey: 'heating',
        barWidth: 26,
      },
      {
        name: '制冷耗电',
        type: 'bar',
        data: monthRange.map((item) => scaleNullableValue(MONTH_COOLING_VALUES[item.monthIndex], factor)),
        colorKey: 'cooling',
        barWidth: 26,
      },
    ],
  }
}

function buildYearSeries(range, factor) {
  const startYear = Number(range.startYear || '2021')
  const endYear = Number(range.endYear || range.startYear || '2025')
  const labels = []

  for (let year = startYear; year <= endYear; year += 1) {
    labels.push(String(year))
  }

  const fallbackLabels = labels.length > 0 ? labels : ['2025']
  const values = fallbackLabels.map((_, index) => {
    const baseValue = YEAR_BASE_VALUES[index % YEAR_BASE_VALUES.length]
    return scaleNumber(baseValue, factor)
  })

  return {
    labels: fallbackLabels,
    tooltipLabels: fallbackLabels,
    xAxisName: '年',
    yAxisMax: 4000,
    yAxisInterval: 800,
    legend: [{ name: '用电量', colorKey: 'purple' }],
    series: [
      {
        name: '用电量',
        type: 'bar',
        data: values,
        colorKey: 'purple',
        barWidth: 42,
      },
    ],
  }
}

function buildSummaryCards(period, equipmentType, compareMode) {
  const deviceFactor = DEVICE_FACTORS[equipmentType] ?? 1
  const compareFactor = COMPARE_FACTORS[compareMode] ?? 1
  const factor = deviceFactor * compareFactor

  if (period === '日') {
    return [
      {
        label: '当月总用电量（kWh）',
        value: String(Math.round(scaleNumber(655, factor))),
        color: '#723DFD',
      },
      {
        label: '日均用电量（kWh）',
        value: scaleNumber(6.12, factor).toFixed(2),
        color: '#723DFD',
      },
    ]
  }

  if (period === '月') {
    return [
      {
        label: '年度总用电量（kWh）',
        value: scaleNumber(3548.64, factor).toFixed(2),
        color: '#723DFD',
      },
      {
        label: '日均用电量（kWh）',
        value: scaleNumber(5.12, factor).toFixed(2),
        color: '#723DFD',
      },
    ]
  }

  return [
    {
      label: '区间总用电量（kWh）',
      value: scaleNumber(12860.52, factor).toFixed(2),
      color: '#723DFD',
    },
    {
      label: '年均用电量（kWh）',
      value: scaleNumber(2572.1, factor).toFixed(2),
      color: '#723DFD',
    },
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

export function buildPowerStatisticsViewModel({ period, range, compareMode, equipmentType }) {
  const deviceFactor = DEVICE_FACTORS[equipmentType] ?? 1
  const compareFactor = COMPARE_FACTORS[compareMode] ?? 1
  const factor = deviceFactor * compareFactor

  let chart
  if (period === '日') {
    chart = buildDaySeries(range, factor)
  } else if (period === '月') {
    chart = buildMonthSeries(range, factor)
  } else {
    chart = buildYearSeries(range, factor)
  }

  return {
    summaryCards: buildSummaryCards(period, equipmentType, compareMode),
    chartModel: {
      variant: 'power-statistics',
      yAxisName: 'kWh',
      labels: chart.labels,
      tooltipLabels: chart.tooltipLabels,
      xAxisName: chart.xAxisName,
      yAxisMax: chart.yAxisMax,
      yAxisInterval: chart.yAxisInterval,
      compareBasisData:
        period === '月'
          ? chart.series[0].data.map((value, index) => value ?? chart.series[1].data[index] ?? 0)
          : chart.series[0].data,
      compareLegendNames: {
        mom: '上一周期用电量',
        yoy: '去年同期用电量',
      },
      legend: chart.legend.map((item) => ({
        ...item,
        color: SERIES_COLORS[item.colorKey].legendColor,
      })),
      series: chart.series.map((item) => ({
        ...item,
        gradientStops: SERIES_COLORS[item.colorKey].stops,
        tooltipColor: SERIES_COLORS[item.colorKey].legendColor,
      })),
    },
  }
}
