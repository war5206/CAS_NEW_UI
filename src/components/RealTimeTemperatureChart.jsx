import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

const xAxisData = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const supplyData = [42, 43, 44, 38, 37, 42, 43, 40, 36, 35]
const returnData = [31, 32, 33, 31, 30.5, 30.8, 31, 30.7, 30.2, 28]
const targetData = [31, 31.4, 31.8, 30.8, 30.9, 31, 30.8, 31, 31.2, 32]

const SUPPLY_COLOR = '#F04E2A'
const RETURN_COLOR = '#F1BF3F'
const TARGET_COLOR = '#36DC64'
const LEGEND_ITEMS = [
  { label: '\u4f9b\u6c34\u6e29\u5ea6', color: SUPPLY_COLOR },
  { label: '\u56de\u6c34\u6e29\u5ea6', color: RETURN_COLOR },
  { label: '\u76ee\u6807\u56de\u6c34\u6e29\u5ea6', color: TARGET_COLOR },
]

function RealTimeTemperatureChart() {
  const chartRef = useRef(null)

  useEffect(() => {
    if (!chartRef.current) {
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
            .map((item) => `${item.marker}${item.seriesName} ${item.value}\u2103`)
            .join('<br/>')
          return `${params[0]?.axisValue}\u70b9<br/>${rows}`
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
          name: '\u4f9b\u6c34\u6e29\u5ea6',
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
          name: '\u56de\u6c34\u6e29\u5ea6',
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
          name: '\u76ee\u6807\u56de\u6c34\u6e29\u5ea6',
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
  }, [])

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
