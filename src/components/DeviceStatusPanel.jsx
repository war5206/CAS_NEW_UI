import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import arrowRightSelected from '../assets/arrow-right-selected.svg'
import arrowLeftSelected from '../assets/arrow-left-selected.svg'

const DEVICE_TABS = [
  { id: 'heat-pump', label: '\u70ed\u6cf5\u673a\u7ec4' },
  { id: 'loop-pump', label: '\u70ed\u6cf5\u5faa\u73af\u6c34\u6cf5' },
]

const HEAT_PUMP_DATA = [
  { name: '\u8fd0\u884c', value: 18, color: ['#3B9EFF', '#1F5FB8'] },
  { name: '\u5f85\u673a', value: 10, color: ['#F4CE52', '#A77A1F'] },
  { name: '\u6545\u969c', value: 2, color: ['#FF671E', '#A93600'] },
]

const LOOP_PUMP_DATA = [
  { name: '\u6c34\u6cf5\u4e00', status: '\u8fd0\u884c\u4e2d', tone: 'running' },
  { name: '\u6c34\u6cf5\u4e8c', status: '\u5df2\u5173\u95ed', tone: 'off' },
  { name: '\u6c34\u6cf5\u4e09', status: '\u6709\u6545\u969c', tone: 'fault' },
]

function HeatPumpStatusChart() {
  const chartRef = useRef(null)

  useEffect(() => {
    if (!chartRef.current) {
      return undefined
    }

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
        data: HEAT_PUMP_DATA.map((item) => item.name),
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
        max: 20,
        interval: 5,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          color: '#909DA2',
          fontSize: 12,
          formatter: (value) => String(value).padStart(2, '0'),
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
          data: HEAT_PUMP_DATA.map((item) => ({
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
              fontFamily: 'Bahnschrift, Segoe UI, sans-serif',
              formatter: ({ value }) => String(value).padStart(2, '0'),
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
  }, [])

  return <div ref={chartRef} className="home-heat-pump-chart" />
}

function DeviceStatusPanel() {
  const [activeTab, setActiveTab] = useState('heat-pump')

  return (
    <div className="home-device-status-panel">
      <div className="home-device-tab-list">
        {DEVICE_TABS.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              className={isActive ? 'home-device-tab is-active' : 'home-device-tab'}
              onClick={() => setActiveTab(tab.id)}
            >
              {isActive ? (
                <img
                  src={arrowRightSelected}
                  alt=""
                  aria-hidden="true"
                  className="home-device-tab-arrow home-device-tab-arrow-left"
                />
              ) : null}
              <span>{tab.label}</span>
              {isActive ? (
                <img
                  src={arrowLeftSelected}
                  alt=""
                  aria-hidden="true"
                  className="home-device-tab-arrow home-device-tab-arrow-right"
                />
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="home-device-body">
        {activeTab === 'heat-pump' ? (
          <HeatPumpStatusChart />
        ) : (
          <div className="home-device-pump-grid">
            {LOOP_PUMP_DATA.map((item) => (
              <div key={item.name} className="home-device-pump-card">
                <span className={`home-device-pump-name is-${item.tone}`}>{item.name}</span>
                <span className={`home-device-pump-state is-${item.tone}`}>{item.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DeviceStatusPanel
