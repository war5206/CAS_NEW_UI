import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { useDeferredVisible } from '../hooks/useDeferredVisible'

const xAxisData = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const supplyData = [42, 43, 44, 38, 37, 42, 43, 40, 36, 35]
const returnData = [31, 32, 33, 31, 30.5, 30.8, 31, 30.7, 30.2, 28]
const targetData = [31, 31.4, 31.8, 30.8, 30.9, 31, 30.8, 31, 31.2, 32]

const SUPPLY_COLOR = '#F04E2A'
const RETURN_COLOR = '#F1BF3F'
const TARGET_COLOR = '#36DC64'
const LEGEND_ITEMS = [
  { label: '供水温度', color: SUPPLY_COLOR },
  { label: '回水温度', color: RETURN_COLOR },
  { label: '目标回水温度', color: TARGET_COLOR },
]

function RealTimeTemperatureChart() {
  const chartRef = useRef(null)
  const shouldInitChart = useDeferredVisible(chartRef)

  useEffect(() => {
    if (!shouldInitChart || !chartRef.current) {
      return undefined
    }

    const chart = echarts.init(chartRef.current)
    chart.setOption({
      animation: false,
      tooltip: {
        trigger: 'axis',
        triggerOn: 'mousemove|click',
        formatter: (params) => {
          const rows = params
            .map((item) => `${item.marker}${item.seriesName} ${item.value}℃`)
            .join('<br/>')
          return `${params[0]?.axisValue}点<br/>${rows}`
        },
        backgroundColor: 'rgba(18, 24, 38, 0.92)',
        borderColor: 'rgba(113, 145, 188, 0.45)',
        borderWidth: 1,
        textStyle: {
          color: '#E8F2FF',
          fontSize: 12,
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: 'rgba(130, 161, 201, 0.65)',
            width: 1,
          },
        },
      },
      grid: {
        top: 8,
        left: 8,
        right: 44,
        bottom: 20,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: xAxisData,
        axisLine: {
          lineStyle: { color: 'rgba(121, 139, 163, 0.55)' },
        },
        axisTick: { show: false },
        axisLabel: {
          formatter: (value, index) => (index === xAxisData.length - 1 ? `${value} h` : value),
          color: '#909DA2',
          fontSize: 12,
          margin: 10,
        },
      },
      yAxis: {
        type: 'value',
        min: 20,
        max: 50,
        interval: 10,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#909DA2',
          fontSize: 12,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(146, 162, 184, 0.45)',
            type: 'dashed',
          },
        },
      },
      series: [
        {
          name: '供水温度',
          type: 'line',
          smooth: true,
          showSymbol: false,
          symbol: 'none',
          data: supplyData,
          lineStyle: {
            width: 3,
            color: SUPPLY_COLOR,
          },
          itemStyle: {
            color: SUPPLY_COLOR,
          },
        },
        {
          name: '回水温度',
          type: 'line',
          smooth: true,
          showSymbol: false,
          symbol: 'none',
          data: returnData,
          lineStyle: {
            width: 3,
            color: RETURN_COLOR,
          },
          itemStyle: {
            color: RETURN_COLOR,
          },
        },
        {
          name: '目标回水温度',
          type: 'line',
          smooth: true,
          showSymbol: false,
          symbol: 'none',
          data: targetData,
          lineStyle: {
            width: 3,
            color: TARGET_COLOR,
          },
          itemStyle: {
            color: TARGET_COLOR,
          },
        },
      ],
    })

    const resizeObserver = new ResizeObserver(() => {
      chart.resize()
    })
    resizeObserver.observe(chartRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.dispose()
    }
  }, [shouldInitChart])

  return (
    <div className="home-temperature-chart-panel">
      <div className="home-temperature-legend">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="home-temperature-legend-item">
            <span className="home-temperature-legend-dot" style={{ backgroundColor: item.color }} />
            <span className="home-temperature-legend-text">{item.label}</span>
          </div>
        ))}
      </div>
      <div ref={chartRef} className="home-temperature-chart" />
    </div>
  )
}

export default RealTimeTemperatureChart
