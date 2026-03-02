import { useMemo, useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import './SmartStartStopPage.css'

function SmartStartStopIcon() {
  return (
    <span className="smart-start-stop-page__feature-icon" aria-hidden="true">
      <span className="smart-start-stop-page__feature-icon-clock" />
      <span className="smart-start-stop-page__feature-icon-arrow" />
    </span>
  )
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function SmartStartStopPage() {
  const [tempDiff, setTempDiff] = useState('10')
  const [loadCycle, setLoadCycle] = useState('10')
  const [unloadCycle, setUnloadCycle] = useState('10')
  const [coolingDiff, setCoolingDiff] = useState('10')
  const [minFrequency, setMinFrequency] = useState(5)
  const [maxFrequency, setMaxFrequency] = useState(14)

  const minRatio = useMemo(() => (minFrequency - 0) / 20, [minFrequency])
  const maxRatio = useMemo(() => (maxFrequency - 0) / 20, [maxFrequency])

  const handleMinFrequencyChange = (nextValue) => {
    const parsed = Number.parseInt(nextValue, 10)
    if (!Number.isFinite(parsed)) {
      return
    }

    const next = clamp(parsed, 0, maxFrequency)
    setMinFrequency(next)
  }

  const handleMaxFrequencyChange = (nextValue) => {
    const parsed = Number.parseInt(nextValue, 10)
    if (!Number.isFinite(parsed)) {
      return
    }

    const next = clamp(parsed, minFrequency, 20)
    setMaxFrequency(next)
  }

  return (
    <main className="smart-start-stop-page">
      <section className="smart-start-stop-page__feature-card-wrap">
        <FeatureInfoCard
          icon={<SmartStartStopIcon />}
          title="智能启停"
          description="开启时，处于低电时段，提升运行目标温度，进行蓄热"
          selected
          className="smart-start-stop-page__feature-card"
        />
      </section>

      <h3 className="smart-start-stop-page__section-title">参数设置</h3>

      <section className="smart-start-stop-page__rows">
        <LabeledSelectRow
          label="加减载温差（℃）"
          description="维持系统温度在目标温度的偏差范围"
          value={tempDiff}
          onChange={setTempDiff}
          suffix="℃"
          className="smart-start-stop-page__row"
        />
        <LabeledSelectRow
          label="加载周期"
          description="用于评估和执行热泵启动操作时间间隔"
          value={loadCycle}
          onChange={setLoadCycle}
          suffix="分钟"
          className="smart-start-stop-page__row"
        />
        <LabeledSelectRow
          label="减载周期"
          description="用于评估和执行热泵止操作时间间隔"
          value={unloadCycle}
          onChange={setUnloadCycle}
          suffix="分钟"
          className="smart-start-stop-page__row"
        />

        <section className="smart-start-stop-page__frequency-panel">
          <header className="smart-start-stop-page__frequency-header">
            <div>
              <h4>频率区间设定（赫兹）</h4>
              <p>变频机组运行的最低频率-最高频率</p>
            </div>
            <strong>{`${minFrequency} － ${maxFrequency}`}</strong>
          </header>

          <div
            className="smart-start-stop-page__frequency-slider"
            style={{ '--min-ratio': minRatio, '--max-ratio': maxRatio }}
          >
            <span className="smart-start-stop-page__frequency-pill smart-start-stop-page__frequency-pill--left">
              {minFrequency}
            </span>
            <span className="smart-start-stop-page__frequency-pill smart-start-stop-page__frequency-pill--right">
              {maxFrequency}
            </span>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={minFrequency}
              onChange={(event) => handleMinFrequencyChange(event.target.value)}
              className="smart-start-stop-page__range smart-start-stop-page__range--min"
              aria-label="最小频率"
            />
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={maxFrequency}
              onChange={(event) => handleMaxFrequencyChange(event.target.value)}
              className="smart-start-stop-page__range smart-start-stop-page__range--max"
              aria-label="最大频率"
            />
          </div>
        </section>

        <LabeledSelectRow
          label="制冷温差设定"
          description="用于评估和执行热泵停止操作时间间隔（0-50）"
          value={coolingDiff}
          onChange={setCoolingDiff}
          suffix="℃"
          className="smart-start-stop-page__row"
        />
      </section>
    </main>
  )
}

export default SmartStartStopPage
