import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts'
import upIcon from '../assets/icons/data-up.svg'
import downIcon from '../assets/icons/data-down.svg'

function createDayDataset(range) {
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
    title: `${year}年${monthNumber}月 日趋势`,
    labels,
    currentData,
    prevData,
    yoyData,
  }
}

function createMonthDataset(range) {
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

function createYearDataset(range) {
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

function buildDataset(period, range) {
  if (period === '日') {
    return createDayDataset(range)
  }

  if (period === '月') {
    return createMonthDataset(range)
  }

  return createYearDataset(range)
}

function DataOverviewChart({ period, compareMode, range }) {
  const chartRef = useRef(null)

  const chartOption = useMemo(() => {
    const dataset = buildDataset(period, range)
    const yoyPercentages = dataset.currentData.map((value, index) =>
      Number((((value - dataset.yoyData[index]) / (dataset.yoyData[index] || 1)) * 100).toFixed(1))
    )

    const barGradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: '#E74828' },
      { offset: 0.75, color: '#E74828' },
      { offset: 1, color: 'rgba(231, 72, 40, 0)' },
    ])

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
        lineStyle: { color: '#FACB25', width: 2 },
        itemStyle: { color: '#FACB25' },
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
          color: '#FACB25',
          borderRadius: [10, 10, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          distance: 18,
          align: 'center',
          verticalAlign: 'bottom',
          formatter: ({ dataIndex }) => {
            const value = yoyPercentages[dataIndex]
            const iconKey = value >= 0 ? 'upIcon' : 'downIcon'
            const absValue = Math.abs(value).toFixed(1)
            return `{${iconKey}|}{value|${absValue}%}`
          },
          rich: {
            upIcon: {
              width: 16,
              height: 16,
              align: 'center',
              verticalAlign: 'middle',
              backgroundColor: {
                image: upIcon,
              },
            },
            downIcon: {
              width: 16,
              height: 16,
              align: 'center',
              verticalAlign: 'middle',
              backgroundColor: {
                image: downIcon,
              },
            },
            value: {
              color: '#F5F7FA',
              fontSize: 14,
              fontWeight: 500,
              align: 'center',
              verticalAlign: 'middle',
              padding: [0, 0, 0, 6],
              lineHeight: 18,
            },
          },
        },
      })
      legendData.push('去年同期 COP')
    }

    return {
      animation: false,
      grid: { left: 64, right: 28, top: 88, bottom: 42 },
      tooltip: { trigger: 'axis' },
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
  }, [compareMode, period, range])

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
