import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts'

function createOverviewDayDataset(range) {
  const monthValue = range.month || '2026-03'
  const [year, month] = monthValue.split('-')
  const monthNumber = Number(month)
  const pointCount = 12

  const labels = Array.from({ length: pointCount }, (_, index) =>
    `${String(monthNumber).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`
  )

  const currentData = labels.map((_, index) =>
    Number((1.2 + ((monthNumber + index * 0.37) % 11) * 0.11 + index * 0.03).toFixed(2))
  )
  const prevData = currentData.map((value, index) => Number((value - 0.18 + (index % 3) * 0.05).toFixed(2)))
  const yoyData = currentData.map((value, index) => Number((value - 0.32 + (index % 4) * 0.04).toFixed(2)))

  return {
    title: `${year}年${monthNumber}月日趋势`,
    labels,
    currentData,
    prevData,
    yoyData,
  }
}

function createOverviewMonthDataset(range) {
  const start = range.startMonth || '2025-11'
  const end = range.endMonth || start
  const [startYear, startMonth] = start.split('-').map(Number)
  const [endYear, endMonth] = end.split('-').map(Number)
  const labels = []

  let year = startYear
  let month = startMonth

  while (year < endYear || (year === endYear && month <= endMonth)) {
    labels.push(`${year}.${String(month).padStart(2, '0')}`)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
    if (labels.length >= 12) {
      break
    }
  }

  const safeLabels = labels.length > 0 ? labels : [start.replace('-', '.')]
  const currentData = safeLabels.map((_, index) =>
    Number((1.6 + index * 0.14 + ((startMonth + index) % 4) * 0.09).toFixed(2))
  )
  const prevData = currentData.map((value, index) => Number((value - 0.16 + (index % 2) * 0.06).toFixed(2)))
  const yoyData = currentData.map((value, index) => Number((value - 0.28 + (index % 3) * 0.08).toFixed(2)))

  return {
    title: '月度趋势',
    labels: safeLabels,
    currentData,
    prevData,
    yoyData,
  }
}

function createOverviewYearDataset(range) {
  const startYear = Number(range.startYear || '2024')
  const endYear = Number(range.endYear || range.startYear || '2024')
  const labels = []

  for (let year = startYear; year <= endYear && labels.length < 10; year += 1) {
    labels.push(`${year}`)
  }

  const safeLabels = labels.length > 0 ? labels : [String(startYear)]
  const currentData = safeLabels.map((_, index) =>
    Number((1.8 + index * 0.21 + ((startYear + index) % 3) * 0.12).toFixed(2))
  )
  const prevData = currentData.map((value, index) => Number((value - 0.2 + (index % 2) * 0.07).toFixed(2)))
  const yoyData = currentData.map((value, index) => Number((value - 0.35 + (index % 4) * 0.05).toFixed(2)))

  return {
    title: '年度趋势',
    labels: safeLabels,
    currentData,
    prevData,
    yoyData,
  }
}

function buildOverviewDataset(period, range) {
  if (period === '日') {
    return createOverviewDayDataset(range)
  }

  if (period === '月') {
    return createOverviewMonthDataset(range)
  }

  return createOverviewYearDataset(range)
}

function createGradient(stops) {
  return new echarts.graphic.LinearGradient(0, 0, 0, 1, stops)
}

function formatChartValue(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return '-'
  }

  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2)
}

function resolveMarkerColor(item, chartModel, seriesColorMap) {
  if (typeof item.color === 'string') {
    return item.color
  }

  if (seriesColorMap?.[item.seriesName]) {
    return seriesColorMap[item.seriesName]
  }

  return chartModel?.series.find((seriesItem) => seriesItem.name === item.seriesName)?.tooltipColor ?? '#7a46ff'
}

function buildSharedTooltipContent({ axisLabel, params, yoyPercentage, chartModel = null, seriesColorMap = null }) {
  const rows = params
    .filter((item) => item.value !== '-' && item.value != null)
    .map((item) => {
      const markerColor = resolveMarkerColor(item, chartModel, seriesColorMap)

      return `
        <div style="display:flex;align-items:center;gap:12px;min-width:220px;margin-top:12px;">
          <span style="width:12px;height:12px;border-radius:999px;background:${markerColor};display:inline-block;flex:none;"></span>
          <span style="color:rgba(255,255,255,0.78);">${item.seriesName}</span>
          <span style="margin-left:auto;">${formatChartValue(item.value)}</span>
        </div>
      `
    })

  if (rows.length === 0) {
    return ''
  }

  const percentageRow =
    yoyPercentage == null
      ? ''
      : `
        <div style="display:flex;align-items:center;gap:12px;min-width:220px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.12);">
          <span style="color:rgba(255,255,255,0.78);">同比占比</span>
          <span style="margin-left:auto;color:${yoyPercentage >= 0 ? '#ff5d3a' : '#34ddbb'};">
            ${yoyPercentage >= 0 ? '+' : ''}${yoyPercentage.toFixed(1)}%
          </span>
        </div>
      `

  return `
    <div style="min-width:220px;">
      <div style="font-size:18px;color:#FFFFFF;">${axisLabel}</div>
      ${rows.join('')}
      ${percentageRow}
    </div>
  `
}

function buildComparisonSeriesData(sourceData = []) {
  const normalized = sourceData.map((value, index) => {
    const numeric = Number(value ?? 0)
    return Number((numeric * (0.82 + (index % 4) * 0.03)).toFixed(2))
  })

  return {
    prevData: normalized.map((value, index) => Number((value * (0.92 + (index % 3) * 0.015)).toFixed(2))),
    yoyData: normalized.map((value, index) => Number((value * (0.78 + (index % 5) * 0.018)).toFixed(2))),
  }
}

function buildPowerStatisticsOption(chartModel, compareMode) {
  const baseSeries = chartModel.series.map((item) => ({
    name: item.name,
    type: item.type,
    data: item.data.map((value) => (value == null ? '-' : value)),
    barWidth: item.barWidth ?? 24,
    barGap: item.type === 'bar' ? '-100%' : undefined,
    itemStyle: {
      color: createGradient(item.gradientStops),
      borderRadius: [12, 12, 0, 0],
    },
  }))

  const compareBasisData =
    chartModel.compareBasisData?.map((value) => (value == null ? 0 : Number(value))) ??
    chartModel.series[0]?.data.map((value) => (value == null ? 0 : Number(value))) ??
    []

  const { prevData, yoyData } = buildComparisonSeriesData(compareBasisData)
  const yoyPercentages = compareBasisData.map((value, index) =>
    Number((((value - yoyData[index]) / (yoyData[index] || 1)) * 100).toFixed(1))
  )
  const seriesColorMap = Object.fromEntries(chartModel.legend.map((item) => [item.name, item.color]))

  if (compareMode === 'mom') {
    seriesColorMap[chartModel.compareLegendNames?.mom ?? '涓婁竴鍛ㄦ湡'] = '#FACC25'
  }

  if (compareMode === 'yoy') {
    seriesColorMap[chartModel.compareLegendNames?.yoy ?? '鍘诲勾鍚屾湡'] = '#FACC25'
  }

  const series = [...baseSeries]
  const legendData = chartModel.legend.map((item) => ({
    name: item.name,
    itemStyle: { color: item.color },
  }))

  if (compareMode === 'mom') {
    series.push({
      name: chartModel.compareLegendNames?.mom ?? '上一周期',
      type: 'line',
      data: prevData,
      smooth: false,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { color: '#FACC25', width: 2 },
      itemStyle: { color: '#FACC25' },
      z: 3,
    })

    legendData.push({
      name: chartModel.compareLegendNames?.mom ?? '上一周期',
      itemStyle: { color: '#FACC25' },
    })
  }

  if (compareMode === 'yoy') {
    series.push({
      name: chartModel.compareLegendNames?.yoy ?? '去年同期',
      type: 'bar',
      data: yoyData,
      barWidth: 16,
      itemStyle: {
        color: createGradient([
          { offset: 0, color: '#FACC25' },
          { offset: 0.75, color: '#FACC25' },
          { offset: 1, color: 'rgba(250, 204, 37, 0)' },
        ]),
        borderRadius: [12, 12, 0, 0],
      },
      z: 2,
    })

    legendData.push({
      name: chartModel.compareLegendNames?.yoy ?? '去年同期',
      itemStyle: { color: '#FACC25' },
    })
  }

  return {
    animation: false,
    grid: { left: 76, right: 28, top: 76, bottom: 62 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#22262D',
      borderColor: 'rgba(92, 111, 135, 0.44)',
      borderWidth: 1,
      padding: [18, 22],
      textStyle: { color: '#FFFFFF', fontSize: 18 },
      axisPointer: {
        type: 'shadow',
        shadowStyle: { color: 'rgba(123, 123, 123, 0.34)' },
      },
      formatter: (params) => {
        const activeItem = params.find((item) => item.value !== '-' && item.value != null) ?? params[0]
        if (!activeItem) {
          return ''
        }

        const labelIndex = activeItem.dataIndex
        const axisLabel = chartModel.tooltipLabels?.[labelIndex] ?? activeItem.axisValueLabel
        const percentage = compareMode === 'yoy' ? yoyPercentages[labelIndex] : null

        return buildSharedTooltipContent({
          axisLabel,
          params,
          yoyPercentage: percentage,
          chartModel,
          seriesColorMap,
        })
      },
    },
    legend: {
      top: 8,
      right: 8,
      itemWidth: 16,
      itemHeight: 16,
      icon: 'roundRect',
      textStyle: { color: 'rgba(255,255,255,0.78)', fontSize: 16 },
      data: legendData,
    },
    xAxis: {
      type: 'category',
      data: chartModel.labels,
      name: chartModel.xAxisName,
      nameLocation: 'end',
      nameGap: 28,
      nameTextStyle: {
        color: 'rgba(255,255,255,0.58)',
        fontSize: 16,
        padding: [0, 0, 0, 18],
      },
      axisTick: { show: false },
      axisLabel: { color: 'rgba(192,203,214,0.84)', fontSize: 16, margin: 22 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.52)' } },
    },
    yAxis: {
      type: 'value',
      name: chartModel.yAxisName,
      min: 0,
      max: chartModel.yAxisMax,
      interval: chartModel.yAxisInterval,
      nameLocation: 'end',
      nameGap: 16,
      nameRotate: 0,
      nameTextStyle: {
        color: 'rgba(255,255,255,0.76)',
        fontSize: 18,
        align: 'left',
        padding: [0, 0, 18, -42],
      },
      axisLabel: { color: 'rgba(192,203,214,0.84)', fontSize: 16, margin: 18 },
      splitLine: { lineStyle: { color: 'rgba(210, 219, 232, 0.6)', type: 'dashed' } },
    },
    series,
  }
}

function buildOverviewOption(period, compareMode, range) {
  const dataset = buildOverviewDataset(period, range)
  const yoyPercentages = dataset.currentData.map((value, index) =>
    Number((((value - dataset.yoyData[index]) / (dataset.yoyData[index] || 1)) * 100).toFixed(1))
  )

  const barGradient = createGradient([
    { offset: 0, color: '#E74828' },
    { offset: 0.75, color: '#E74828' },
    { offset: 1, color: 'rgba(231, 72, 40, 0)' },
  ])
  const barGradientYellow = createGradient([
    { offset: 0, color: '#FACC25' },
    { offset: 0.75, color: '#FACC25' },
    { offset: 1, color: 'rgba(250, 204, 37, 0)' },
  ])
  const seriesColorMap = {
    COP: '#E74828',
    '褰撳墠鍛ㄦ湡 COP': '#E74828',
    '涓婁竴鍛ㄦ湡 COP': '#FACC25',
    '鍘诲勾鍚屾湡 COP': '#FACC25',
  }

  const series = [
    {
      name: compareMode === 'yoy' ? '当前周期 COP' : 'COP',
      type: 'bar',
      data: dataset.currentData,
      barWidth: compareMode === 'yoy' ? 16 : 22,
      itemStyle: {
        color: barGradient,
        borderRadius: [10, 10, 0, 0],
      },
    },
  ]

  const legendData = [series[0].name]

  if (compareMode === 'mom') {
    series.push({
      name: '上一周期 COP',
      type: 'line',
      data: dataset.prevData,
      smooth: false,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { color: '#FACC25', width: 2 },
      itemStyle: { color: '#FACC25' },
    })
    legendData.push('上一周期 COP')
  }

  if (compareMode === 'yoy') {
    series.push({
      name: '去年同期 COP',
      type: 'bar',
      data: dataset.yoyData,
      barWidth: 16,
      itemStyle: {
        color: barGradientYellow,
        borderRadius: [10, 10, 0, 0],
      },
    })
    legendData.push('去年同期 COP')
  }

  return {
    animation: false,
    grid: { left: 64, right: 28, top: 88, bottom: 42 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#22262D',
      borderColor: 'rgba(92, 111, 135, 0.44)',
      borderWidth: 1,
      padding: [18, 22],
      textStyle: { color: '#FFFFFF', fontSize: 18 },
      axisPointer: {
        type: 'shadow',
        shadowStyle: { color: 'rgba(123, 123, 123, 0.34)' },
      },
      formatter: (params) => {
        const activeItem = params.find((item) => item.value !== '-' && item.value != null) ?? params[0]
        if (!activeItem) {
          return ''
        }

        const labelIndex = activeItem.dataIndex
        const axisLabel = dataset.labels[labelIndex] ?? activeItem.axisValueLabel
        const percentage = compareMode === 'yoy' ? yoyPercentages[labelIndex] : null

        return buildSharedTooltipContent({
          axisLabel,
          params,
          yoyPercentage: percentage,
          seriesColorMap,
        })
      },
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: 'rgba(255,255,255,0.72)', fontSize: 18 },
      itemWidth: 14,
      itemHeight: 14,
      data: legendData,
    },
    title: {
      text: dataset.title,
      left: 0,
      top: 0,
      textStyle: {
        color: 'rgba(255,255,255,0.82)',
        fontSize: 18,
        fontWeight: 500,
      },
    },
    xAxis: {
      type: 'category',
      data: dataset.labels,
      axisLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 16, margin: 14 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
    },
    yAxis: [
      {
        name: 'COP',
        min: 0,
        max: 4,
        interval: 0.5,
        nameTextStyle: { color: 'rgba(255,255,255,0.72)', fontSize: 20, padding: [0, 0, 10, -8] },
        axisLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 16, margin: 12 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' } },
      },
    ],
    series,
  }
}

function DataOverviewChart({ period, compareMode, range, chartModel = null }) {
  const chartRef = useRef(null)

  const chartOption = useMemo(() => {
    if (chartModel?.variant === 'power-statistics') {
      return buildPowerStatisticsOption(chartModel, compareMode)
    }

    return buildOverviewOption(period, compareMode, range)
  }, [chartModel, compareMode, period, range])

  useEffect(() => {
    if (!chartRef.current) {
      return undefined
    }

    const chart = echarts.init(chartRef.current)
    chart.setOption(chartOption)

    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
    }
  }, [chartOption])

  return <div className="data-overview-chart" ref={chartRef} />
}

export default DataOverviewChart
