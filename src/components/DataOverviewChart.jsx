import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts'

const labels = ['03-01', '03-02', '03-03', '03-04', '03-05', '03-06', '03-07', '03-08', '03-09', '03-10', '03-11', '03-12']
const currentData = [2, 2, 1.7, 1.7, 1, 1, 0.5, 0.5, 0, 0, 0, 1.3]
const prevData = [2.4, 2.4, 2.1, 2.1, 1.4, 1.4, 0.9, 0.9, 0.4, 0.4, 0.4, 1.7]
const yoyData = [1.5, 1.5, 1.5, 1.5, 0.7, 1, 0.3, 0.3, 0.2, 0.2, 0.2, 0.8]

function DataOverviewChart({ compareMode }) {
  const chartRef = useRef(null)

  const chartOption = useMemo(() => {
    const barGradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: '#E74828' },
      { offset: 0.75, color: '#E74828' },
      { offset: 1, color: 'rgba(231, 72, 40, 0)' },
    ])

    const series = [
      {
        name: compareMode === 'yoy' ? '今年COP数据' : 'COP',
        type: 'bar',
        data: currentData,
        barWidth: 22,
        itemStyle: {
          color: barGradient,
          borderRadius: [10, 10, 0, 0],
        },
      },
    ]

    const legendData = [series[0].name]

    if (compareMode === 'mom') {
      series.push({
        name: '上月COP数据',
        type: 'line',
        data: prevData,
        smooth: false,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: '#FACB25', width: 2 },
        itemStyle: { color: '#FACB25' },
      })
      legendData.push('上月COP数据')
    }

    if (compareMode === 'yoy') {
      series[0].barWidth = 16
      series.push({
        name: '去年COP数据',
        type: 'bar',
        data: yoyData,
        barWidth: 16,
        itemStyle: {
          color: '#FACB25',
          borderRadius: [10, 10, 0, 0],
        },
      })
      series.push({
        name: '同比',
        type: 'line',
        data: currentData.map((value, index) => Number((((value - yoyData[index]) / (yoyData[index] || 1)) * 100).toFixed(1))),
        yAxisIndex: 1,
        lineStyle: { color: '#FACB25', width: 2 },
        itemStyle: { color: '#FACB25' },
        symbol: 'none',
        tooltip: { valueFormatter: (value) => `${value}%` },
      })
      legendData.push('去年COP数据')
    }

    return {
      animation: false,
      grid: { left: 56, right: 20, top: 56, bottom: 30 },
      tooltip: { trigger: 'axis' },
      legend: {
        top: 0,
        right: 0,
        textStyle: { color: 'rgba(255,255,255,0.72)', fontSize: 18 },
        itemWidth: 14,
        itemHeight: 14,
        data: legendData,
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 12 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      },
      yAxis: [
        {
          name: '数据',
          min: 0,
          max: 3,
          interval: 0.5,
          nameTextStyle: { color: 'rgba(255,255,255,0.72)', fontSize: 32, padding: [0, 0, 8, -8] },
          axisLabel: { color: 'rgba(255,255,255,0.66)', fontSize: 16 },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.34)', type: 'dashed' } },
        },
        {
          show: compareMode === 'yoy',
          min: -20,
          max: 80,
          axisLabel: { formatter: '{value}%', color: 'rgba(255,255,255,0.3)' },
          splitLine: { show: false },
        },
      ],
      series,
    }
  }, [compareMode])

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
