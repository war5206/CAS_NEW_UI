import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import weatherCompensationIcon from '../assets/home/weather-compensation.svg'
import thermometerIcon from '../assets/thermometer.svg'
import modeSettingIcon from '../assets/navigation/modeSetting.svg'
import deviceParamIcon from '../assets/navigation/deviceParam.svg'
import { useDeferredVisible } from '../hooks/useDeferredVisible'
import './ClimateCompensationPage.css'

const levelLabels = Array.from({ length: 16 }, (_, index) => String(index + 1))

const trendDates = ['04-01', '04-02', '04-03', '04-04', '04-05', '04-06', '04-07', '04-08', '04-09', '04-10', '04-11', '04-12']
const targetReturnData = [24, 24, 33, 33, 14, 14, 24, 24, 24, 24, 24, 24]
const actualSupplyData = [36, 30, 39, 37, 20, 31, 40, 37, 32, 27, 31, 23]
const actualReturnData = [16, 25, 19, 24, 28, 32, 24, 17, 22, 31, 23, 27]

function ClimateCompensationPage() {
  const [selectedMode, setSelectedMode] = useState('climate')
  const adjustMode = '智能调节'
  const [regulateType, setRegulateType] = useState('人工调节')
  const [terminalLinked, setTerminalLinked] = useState(true)
  const [levelValue, setLevelValue] = useState(8)
  const [constantReturnTemp, setConstantReturnTemp] = useState('10')
  const chartRef = useRef(null)
  const shouldInitChart = useDeferredVisible(chartRef)

  useEffect(() => {
    if (selectedMode !== 'climate' || !shouldInitChart || !chartRef.current) {
      return undefined
    }

    const chart = echarts.init(chartRef.current)
    chart.setOption({
      animation: false,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(29, 38, 54, 0.96)',
        borderWidth: 1,
        borderColor: 'rgba(120, 155, 203, 0.45)',
        textStyle: { color: '#eaf4ff', fontSize: 14 },
      },
      grid: { top: 52, left: 62, right: 26, bottom: 66 },
      xAxis: {
        type: 'category',
        data: trendDates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: 'rgba(201, 216, 237, 0.35)' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#8f9cad',
          fontSize: 16,
          formatter: (value, index) => (index === trendDates.length - 1 ? `${value}时间` : value),
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 50,
        interval: 10,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: '#8f9cad', fontSize: 18 },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: 'rgba(176, 195, 220, 0.46)',
          },
        },
      },
      legend: {
        bottom: 0,
        itemWidth: 18,
        itemHeight: 10,
        textStyle: {
          color: '#e2edf9',
          fontSize: 18,
        },
      },
      series: [
        {
          name: '目标回水温度',
          type: 'line',
          data: targetReturnData,
          smooth: false,
          step: 'middle',
          lineStyle: { color: '#1EF09A', width: 3, type: 'dashed' },
          symbol: 'none',
        },
        {
          name: '实际供水温度',
          type: 'line',
          data: actualSupplyData,
          smooth: true,
          lineStyle: { color: '#FF5A2D', width: 3 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(255, 90, 45, 0.26)' },
              { offset: 1, color: 'rgba(255, 90, 45, 0)' },
            ]),
          },
          itemStyle: { color: '#ff5a2d' },
        },
        {
          name: '实际回水温度',
          type: 'line',
          data: actualReturnData,
          smooth: true,
          lineStyle: { color: '#F6C939', width: 3 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(246, 201, 57, 0.22)' },
              { offset: 1, color: 'rgba(246, 201, 57, 0)' },
            ]),
          },
          itemStyle: { color: '#f6c939' },
        },
      ],
    })

    const resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(chartRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.dispose()
    }
  }, [selectedMode, shouldInitChart])

  return (
    <main className="climate-page">
      <section className="climate-page__mode-grid">
        <FeatureInfoCard
          icon={weatherCompensationIcon}
          title="气候补偿"
          description="根据环境温度不同自动调节回水目标温度"
          selected={selectedMode === 'climate'}
          selectedBadgePosition="start"
          onClick={() => setSelectedMode('climate')}
          className="climate-page__mode-card"
        />
        <FeatureInfoCard
          icon={thermometerIcon}
          title="定温模式"
          description="固定温度运行"
          selected={selectedMode === 'constant'}
          onClick={() => setSelectedMode('constant')}
          className="climate-page__mode-card"
        />
      </section>

      {selectedMode === 'climate' ? (
        <>
          <section className="climate-page__panel">
            <div className="climate-page__panel-title-wrap">
              <img src={modeSettingIcon} alt="" aria-hidden="true" />
              <h3 className="climate-page__panel-title">调节模式</h3>
              <button type="button" className="climate-page__select-btn">{adjustMode}</button>
            </div>

            <div className="climate-page__rows">
              <div className="climate-page__row">
                <div>
                  <div className="climate-page__row-title">智能调节</div>
                  <div className="climate-page__row-desc">根据环境温度不同自动调节回水目标温度</div>
                </div>
                <button
                  type="button"
                  className="climate-page__select-btn"
                  onClick={() => setRegulateType(regulateType === '人工调节' ? '自动调节' : '人工调节')}
                >
                  {regulateType}
                </button>
              </div>
              <div className="climate-page__row climate-page__row--switch">
                <div>
                  <div className="climate-page__row-title">末端联调</div>
                  <div className="climate-page__row-desc">功能开启时，自动校准调节生效</div>
                </div>
                <button
                  type="button"
                  className={`climate-page__switch${terminalLinked ? ' is-on' : ''}`}
                  aria-pressed={terminalLinked}
                  onClick={() => setTerminalLinked((prev) => !prev)}
                >
                  <span className="climate-page__switch-thumb" />
                </button>
              </div>
            </div>
          </section>

          <section className="climate-page__panel">
            <div className="climate-page__panel-title-wrap">
              <img src={deviceParamIcon} alt="" aria-hidden="true" />
              <h3 className="climate-page__panel-title">温度档位设定</h3>
            </div>

            <div className="climate-page__level-scale">
              {levelLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
              <span>档</span>
            </div>

            <input
              type="range"
              min={1}
              max={16}
              value={levelValue}
              onChange={(event) => setLevelValue(Number(event.target.value))}
              className="climate-page__level-slider"
              style={{ '--ratio': (levelValue - 1) / 15 }}
            />
          </section>

          <section className="climate-page__panel climate-page__panel--chart">
            <h3 className="climate-page__panel-title climate-page__panel-title--muted">温度档位设定和变化规律</h3>
            <div className="climate-page__metrics">
              <article className="climate-page__metric">
                <span>室外温度 (℃)</span>
                <strong>-10</strong>
              </article>
              <article className="climate-page__metric">
                <span>室外温度 (℃)</span>
                <strong>-10</strong>
              </article>
            </div>
            <div className="climate-page__chart-y-title">温度℃</div>
            <div ref={chartRef} className="climate-page__chart" />
          </section>
        </>
      ) : (
        <section className="climate-page__constant-section">
          <h3 className="climate-page__constant-title">参数设置</h3>
          <LabeledSelectRow
            label="回水温度设定"
            value={constantReturnTemp}
            onChange={setConstantReturnTemp}
            suffix="℃"
            className="climate-page__constant-row"
          />
        </section>
      )}
    </main>
  )
}

export default ClimateCompensationPage
