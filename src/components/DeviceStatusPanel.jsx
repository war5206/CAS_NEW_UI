import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { buildUnitStatusChartData, EMPTY_UNIT_STATUS_SUMMARY } from '@/utils/heatPumpUnitStatusSummary'
import { useDeferredVisible } from '../hooks/useDeferredVisible'

const DEVICE_TAB_HEAT_PUMP = { id: 'heat-pump', label: '热泵机组' }
const DEVICE_TAB_LOOP_PUMP = { id: 'loop-pump', label: '热泵循环泵' }
const DEVICE_TAB_TERMINAL = { id: 'terminal-loop-pump', label: '末端循环水泵' }

const DEFAULT_HEAT_PUMP_DATA = buildUnitStatusChartData(EMPTY_UNIT_STATUS_SUMMARY)

const DEFAULT_LOOP_PUMP_DATA = [
  { name: '水泵一', status: '运行中', tone: 'running' },
  { name: '水泵二', status: '已关闭', tone: 'off' },
  { name: '水泵三', status: '有故障', tone: 'fault' },
]

function HeatPumpStatusChart({ chartData }) {
  const chartRef = useRef(null)
  const shouldInitChart = useDeferredVisible(chartRef)

  useEffect(() => {
    if (!shouldInitChart || !chartRef.current) {
      return undefined
    }

    const normalizedChartData = Array.isArray(chartData) && chartData.length > 0 ? chartData : DEFAULT_HEAT_PUMP_DATA
    const yAxisMax = Math.max(20, ...normalizedChartData.map((item) => Number(item.value) || 0))
    const yAxisInterval = Math.max(1, Math.ceil(yAxisMax / 4))
    const chart = echarts.init(chartRef.current)
    chart.setOption({
      animation: false,
      grid: {
        top: 20,
        left: 0,
        right: 6,
        bottom: 2,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: normalizedChartData.map((item) => item.name),
        axisTick: { show: false },
        axisLine: {
          lineStyle: {
            color: 'rgba(143, 155, 175, 0.45)',
          },
        },
        axisLabel: {
          color: '#909DA2',
          fontSize: 14,
          margin: 10,
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: yAxisMax,
        interval: yAxisInterval,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          color: '#909DA2',
          fontSize: 12,
          formatter: (value) => String(value),
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(155, 169, 189, 0.5)',
            type: 'dashed',
          },
        },
      },
      series: [
        {
          type: 'bar',
          barWidth: 24,
          data: normalizedChartData.map((item) => ({
            value: item.value,
            itemStyle: {
              borderRadius: [12, 12, 0, 0],
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: item.color[0] },
                { offset: 1, color: item.color[1] },
              ]),
            },
            label: {
              show: true,
              position: 'top',
              color: '#FFFFFF',
              fontSize: 22,
              fontFamily: 'Alibaba PuHuiTi 2.0, sans-serif',
              formatter: ({ value }) => String(value),
            },
          })),
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
  }, [chartData, shouldInitChart])

  return <div ref={chartRef} className="home-heat-pump-chart" />
}

function PumpGrid({ items }) {
  return (
    <div className="home-device-pump-grid">
      {items.map((item) => (
        <div key={item.name} className="home-device-pump-card">
          <span className={`home-device-pump-name is-${item.tone}`}>{item.name}</span>
          <span className={`home-device-pump-state is-${item.tone}`}>{item.status}</span>
        </div>
      ))}
    </div>
  )
}

function DeviceStatusPanel({
  heatPumpData = DEFAULT_HEAT_PUMP_DATA,
  loopPumpData = DEFAULT_LOOP_PUMP_DATA,
  showLoopPumpTab = true,
  showTerminalLoopPump = false,
  terminalLoopPumpData = [],
}) {
  const [activeTab, setActiveTab] = useState('heat-pump')
  const tabs = [
    DEVICE_TAB_HEAT_PUMP,
    ...(showLoopPumpTab ? [DEVICE_TAB_LOOP_PUMP] : []),
    ...(showTerminalLoopPump ? [DEVICE_TAB_TERMINAL] : []),
  ]
  const gridCols = tabs.length

  return (
    <div className="home-device-status-panel">
      <div className="home-device-tab-list" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              className={isActive ? 'home-device-tab is-active' : 'home-device-tab'}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      <div className="home-device-body">
        {activeTab === 'heat-pump' && <HeatPumpStatusChart chartData={heatPumpData} />}
        {activeTab === 'loop-pump' && <PumpGrid items={loopPumpData} />}
        {activeTab === 'terminal-loop-pump' && <PumpGrid items={terminalLoopPumpData} />}
      </div>
    </div>
  )
}

export default DeviceStatusPanel
