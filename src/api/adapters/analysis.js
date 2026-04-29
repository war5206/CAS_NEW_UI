function toText(value, fallback = '') {
  if (value == null || value === '') {
    return fallback
  }
  return String(value)
}

function toNumberOrFallback(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function splitMetricValue(rawValue) {
  const [valuePart = '', trendPart = ''] = toText(rawValue).split('_')
  return {
    value: valuePart || '--',
    trend: trendPart || null,
  }
}

function normalizeList(values) {
  if (!Array.isArray(values)) {
    return []
  }
  return values.map((value) => {
    if (value === '' || value == null) {
      return null
    }
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : null
  })
}

function resolveYMaxAndInterval(values) {
  const validMax = values.reduce((max, value) => {
    if (value == null) {
      return max
    }
    return Math.max(max, Math.abs(value))
  }, 0)
  const safeMax = validMax > 0 ? validMax : 10
  const rawInterval = Math.ceil(safeMax / 5)
  const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(rawInterval)))
  const interval = Math.max(1, Math.ceil(rawInterval / magnitude) * magnitude)
  return {
    yAxisMax: interval * 5,
    yAxisInterval: interval,
  }
}

function unwrapData(rawData) {
  const responseData = rawData?.data ?? rawData
  return responseData?.data ?? responseData ?? {}
}

export function createDefaultAnalysisOverviewSummary() {
  return {
    seasonLabel: '本采暖季（-- - --）',
    metrics: [],
  }
}

export function adaptAnalysisOverviewSummary(rawData) {
  const source = unwrapData(rawData)
  const cop = splitMetricValue(source.cop)
  const heat = splitMetricValue(source.grl)
  const feeRate = splitMetricValue(source.jfb)
  const electricity = splitMetricValue(source.hdl)
  const unitElectricity = splitMetricValue(source.dpmydl)
  const unitFee = splitMetricValue(source.dpmfy)

  return {
    seasonLabel: `本采暖季（${toText(source.startHeatingSeason, '--')} - ${toText(source.endHeatingSeason, '--')}）`,
    metrics: [
      { title: 'COP', color: '#FF5A36', value: cop.value, trend: cop.trend },
      { title: '总供热量（kWh）', color: '#6B3DFF', value: heat.value, trend: heat.trend },
      { title: '节费比（%）', color: '#F4AE21', value: feeRate.value, trend: feeRate.trend },
      { title: '耗电量（kWh）', color: '#22A8FF', value: electricity.value, trend: electricity.trend },
      { title: '单平米用电量', color: '#D749C7', value: unitElectricity.value, trend: unitElectricity.trend },
      { title: '单平米费用', color: '#62F96D', value: unitFee.value, trend: unitFee.trend },
    ],
  }
}

export function createDefaultAnalysisOverviewChart() {
  return {
    variant: 'power-statistics',
    yAxisName: 'COP',
    valueSuffix: '',
    currentTotalLabel: '当前总 COP',
    currentSeriesNames: ['COP'],
    labels: [],
    tooltipLabels: [],
    xAxisName: '日',
    yAxisMax: 5,
    yAxisInterval: 1,
    compareBasisData: [],
    compareLegendNames: { mom: '上一周期 COP', yoy: '去年同期 COP' },
    legend: [{ name: 'COP', color: '#E74828' }],
    series: [{ name: 'COP', type: 'bar', data: [], barWidth: 22, itemStyleColor: '#E74828' }],
  }
}

export function adaptAnalysisOverviewChart(rawData, xAxisName = '日') {
  const source = unwrapData(rawData)
  const labels = Array.isArray(source.xList) ? source.xList : []
  const values = normalizeList(source?.yMap?.y1CurrentList)
  const axis = resolveYMaxAndInterval(values)

  return {
    ...createDefaultAnalysisOverviewChart(),
    labels,
    tooltipLabels: labels,
    xAxisName,
    yAxisMax: axis.yAxisMax,
    yAxisInterval: axis.yAxisInterval,
    compareBasisData: values,
    series: [
      {
        name: 'COP',
        type: 'bar',
        data: values,
        barWidth: labels.length > 12 ? 18 : 22,
        gradientStops: [
          { offset: 0, color: '#E74828' },
          { offset: 0.75, color: '#E74828' },
          { offset: 1, color: 'rgba(231,72,40,0)' },
        ],
        itemStyleColor: '#E74828',
        tooltipColor: '#E74828',
      },
    ],
  }
}

export function createDefaultAnalysisTrendViewModel(cardLabels = ['总值', '均值'], unit = '') {
  return {
    summaryCards: [
      { label: cardLabels[0], value: '0', color: '#723DFD' },
      { label: cardLabels[1], value: '0', color: '#723DFD' },
    ],
    chartModel: {
      variant: 'power-statistics',
      yAxisName: unit,
      valueSuffix: unit ? ` ${unit}` : '',
      currentTotalLabel: '当前总值',
      currentSeriesNames: ['当前值'],
      labels: [],
      tooltipLabels: [],
      xAxisName: '日',
      yAxisMax: 10,
      yAxisInterval: 2,
      compareBasisData: [],
      compareLegendNames: { mom: '上一周期', yoy: '去年同期' },
      legend: [{ name: '当前值', color: '#7A46FF' }],
      series: [{ name: '当前值', type: 'bar', data: [], barWidth: 22, itemStyleColor: '#7A46FF' }],
    },
  }
}

export function adaptAnalysisTrendViewModel(rawData, options) {
  const {
    cardLabels,
    unit,
    color,
    legendName,
    xAxisName,
    currentTotalLabel,
    compareNames,
    summaryValueOrder = 'all-avg',
    seriesColorsByKey,
  } = options

  const source = unwrapData(rawData)
  const labels = Array.isArray(source.xList) ? source.xList : []
  const yMap = source.yMap ?? {}
  const summaryAll = toNumberOrFallback(source.allValue, 0)
  const summaryAvg = toNumberOrFallback(source.avgValue, 0)

  let series = []
  let compareBasisData = []

  if (yMap?.y1CurrentMap && typeof yMap.y1CurrentMap === 'object') {
    const currentMap = yMap.y1CurrentMap
    const mapKeys = Object.keys(currentMap)
    const resolvedKeys = options?.selectedSeriesKeys?.length ? options.selectedSeriesKeys : mapKeys
    const selectedKeys = resolvedKeys.filter((key) => Array.isArray(currentMap[key]))
    const rows = selectedKeys.map((key) => ({
      key,
      data: normalizeList(currentMap[key]),
    }))
    compareBasisData = labels.map((_, index) => rows.reduce((sum, row) => sum + (row.data[index] ?? 0), 0))
    series = rows.map((row) => {
      const seriesColor = seriesColorsByKey?.[row.key] ?? color
      return {
        name: row.key,
        type: 'bar',
        stack: selectedKeys.length > 1 ? 'analysis-stacked' : undefined,
        data: row.data,
        barWidth: labels.length > 12 ? 18 : 26,
        color: seriesColor,
        itemStyleColor: seriesColor,
        tooltipColor: seriesColor,
      }
    })
  } else if (yMap?.y1CurrentList && typeof yMap.y1CurrentList === 'object' && !Array.isArray(yMap.y1CurrentList)) {
    const priceMap = yMap.y1CurrentList
    const priceKeys = Object.keys(priceMap)
    const rows = priceKeys.map((key) => ({
      key,
      data: normalizeList(priceMap[key]),
    }))
    compareBasisData = labels.map((_, index) => rows.reduce((sum, row) => sum + (row.data[index] ?? 0), 0))
    series = rows.map((row) => ({
      name: row.key,
      type: 'bar',
      stack: 'analysis-expense',
      data: row.data,
      color,
      barWidth: labels.length > 12 ? 18 : 24,
      itemStyleColor: color,
      tooltipColor: color,
    }))
  } else {
    const values = normalizeList(yMap?.y1CurrentList)
    compareBasisData = values
    series = [
      {
        name: legendName,
        type: 'bar',
        data: values,
        barWidth: labels.length > 12 ? 18 : 26,
        gradientStops: [
          { offset: 0, color },
          { offset: 0.75, color },
          { offset: 1, color: 'rgba(0,0,0,0)' },
        ],
        itemStyleColor: color,
        tooltipColor: color,
      },
    ]
  }

  const axis = resolveYMaxAndInterval(compareBasisData)
  const [firstSummaryValue, secondSummaryValue] =
    summaryValueOrder === 'avg-all' ? [summaryAvg, summaryAll] : [summaryAll, summaryAvg]

  return {
    summaryCards: [
      { label: cardLabels[0], color, value: String(firstSummaryValue) },
      { label: cardLabels[1], color, value: String(secondSummaryValue) },
    ],
    chartModel: {
      variant: 'power-statistics',
      yAxisName: unit,
      valueSuffix: unit ? ` ${unit}` : '',
      currentTotalLabel,
      currentSeriesNames: series.map((item) => item.name),
      labels,
      tooltipLabels: labels,
      xAxisName,
      yAxisMax: axis.yAxisMax,
      yAxisInterval: axis.yAxisInterval,
      compareBasisData,
      compareLegendNames: compareNames,
      legend: series.map((item) => ({ name: item.name, color: item.color || color })),
      series,
    },
  }
}
