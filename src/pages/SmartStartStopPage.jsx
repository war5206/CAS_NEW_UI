import { useMemo, useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import startStopIcon from '../assets/mode-select-start-stop.svg'
import './SmartStartStopPage.css'

function SmartStartStopPage() {
  const [tempDiff, setTempDiff] = useState('10')
  const [loadCycle, setLoadCycle] = useState('10')
  const [unloadCycle, setUnloadCycle] = useState('10')
  const [coolingDiff, setCoolingDiff] = useState('10')
  const [minFreq, setMinFreq] = useState(5)
  const [maxFreq, setMaxFreq] = useState(14)

  const rangeText = useMemo(() => `${minFreq}  —  ${maxFreq}`, [minFreq, maxFreq])

  return (
    <main className="smart-start-stop-page">
      <FeatureInfoCard
        icon={startStopIcon}
        iconAlt="智能启停"
        title="智能启停"
        description="开启时，处于低电时段，提升运行目标温度，进行蓄热"
        selected
        className="smart-start-stop-page__card"
      />

      <section className="smart-start-stop-page__rows">
        <h3 className="smart-start-stop-page__section-title">参数设置</h3>
        <div className="smart-start-stop-page__row-list">
          <LabeledSelectRow
            label="加减载温差（℃）"
            description="维持系统温度在目标温度的偏差范围"
            value={tempDiff}
            suffix="℃"
            onChange={setTempDiff}
            useModeCardControl
          />

          <LabeledSelectRow
            label="加载周期"
            description="用于评估和执行热泵启动操作时间间隔"
            value={loadCycle}
            suffix="分钟"
            onChange={setLoadCycle}
            useModeCardControl
          />

          <LabeledSelectRow
            label="减载周期"
            description="用于评估和执行热泵停止操作时间间隔"
            value={unloadCycle}
            suffix="分钟"
            onChange={setUnloadCycle}
            useModeCardControl
          />

          <div className="smart-start-stop-page__freq-row">
            <div className="smart-start-stop-page__freq-header">
              <div>
                <div className="smart-start-stop-page__freq-title">频率区间设定（赫兹）</div>
                <p className="smart-start-stop-page__freq-desc">变频机组运行的最低频率-最高频率</p>
              </div>
              <div className="smart-start-stop-page__freq-range">{rangeText}</div>
            </div>

            <div className="smart-start-stop-page__slider-wrap">
              <input
                type="range"
                min={0}
                max={20}
                value={minFreq}
                onChange={(event) => setMinFreq(Math.min(Number(event.target.value), maxFreq - 1))}
                className="smart-start-stop-page__slider"
                aria-label="最小频率"
              />
              <input
                type="range"
                min={0}
                max={20}
                value={maxFreq}
                onChange={(event) => setMaxFreq(Math.max(Number(event.target.value), minFreq + 1))}
                className="smart-start-stop-page__slider"
                aria-label="最大频率"
              />
            </div>
          </div>

          <LabeledSelectRow
            label="制冷温差设定"
            description="用于评估和执行热泵停止操作时间间隔（0-50）"
            value={coolingDiff}
            suffix="℃"
            onChange={setCoolingDiff}
            useModeCardControl
          />
        </div>
      </section>
    </main>
  )
}

export default SmartStartStopPage
