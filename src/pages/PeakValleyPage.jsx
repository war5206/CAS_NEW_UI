import { useMemo, useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import './PeakValleyPage.css'

function PeakValleyIcon() {
  return (
    <svg viewBox="0 0 32 32" className="peak-valley-page__icon" aria-hidden="true">
      <path d="M3.5 19.2c2.4 0 2.4-5.7 4.9-5.7s2.4 5.7 4.9 5.7 2.4-5.7 4.9-5.7 2.4 5.7 4.9 5.7 2.4-5.7 4.9-5.7" />
      <path d="M3.5 23.5h25" />
    </svg>
  )
}

function formatDuration(hours) {
  const totalMinutes = Math.round(hours * 60)
  const safeMinutes = Math.max(totalMinutes, 0)
  const h = Math.floor(safeMinutes / 60)
  const m = safeMinutes % 60
  if (h <= 0) {
    return `${m}m`
  }
  if (m <= 0) {
    return `${h}h`
  }
  return `${h}h${m}m`
}

const SCALE_LABELS = ['5h', '4h', '3h', '2h', '1h', '0', '1h', '2h', '3h', '4h', '5h']

function PeakValleyPage() {
  const [storageCompensation, setStorageCompensation] = useState('2')
  const [costMultiplier, setCostMultiplier] = useState('50')
  const [intensityHours, setIntensityHours] = useState(1.58)

  const durationText = useMemo(() => formatDuration(intensityHours), [intensityHours])
  const halfPercent = (intensityHours / 5) * 50
  const leftPercent = 50 - halfPercent
  const rightPercent = 50 + halfPercent

  return (
    <main className="peak-valley-page">
      <section className="peak-valley-page__mode-grid">
        <FeatureInfoCard
          icon={<PeakValleyIcon />}
          title="峰谷调节"
          description="开启时，处于低电时段，自动蓄热；处于高电时段，自动放热，降低运行成本"
          selected
          className="peak-valley-page__mode-card"
        />
      </section>

      <section className="peak-valley-page__section">
        <h3 className="peak-valley-page__section-title">参数设置</h3>

        <LabeledSelectRow
          label="蓄能补偿值"
          description="在原来定温或者气候补偿模式下增加几度"
          value={storageCompensation}
          onChange={setStorageCompensation}
          className="peak-valley-page__select-row"
          showIndicator
          useModeCardControl
        />

        <article className="peak-valley-page__panel">
          <header className="peak-valley-page__panel-header">
            <h4 className="peak-valley-page__panel-title">蓄能强度</h4>
            <p className="peak-valley-page__panel-desc">在峰电时段达到蓄能多长时间，蓄能后持续放热多长时间</p>
          </header>

          <div className="peak-valley-page__scale" aria-hidden="true">
            {SCALE_LABELS.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>

          <div className="peak-valley-page__slider-wrap">
            <div className="peak-valley-page__track" />
            <div className="peak-valley-page__active" style={{ left: `${leftPercent}%`, width: `${rightPercent - leftPercent}%` }} />
            <div className="peak-valley-page__center" />
            <span className="peak-valley-page__pill" style={{ left: `${leftPercent}%` }}>{durationText}</span>
            <span className="peak-valley-page__pill peak-valley-page__pill--right" style={{ left: `${rightPercent}%` }}>{durationText}</span>
            <span className="peak-valley-page__thumb" style={{ left: `${leftPercent}%` }} />
            <span className="peak-valley-page__thumb" style={{ left: `${rightPercent}%` }} />
            <input
              type="range"
              min={0}
              max={5}
              step={0.01}
              value={intensityHours}
              onChange={(event) => setIntensityHours(Number(event.target.value))}
              className="peak-valley-page__input"
              aria-label="蓄能强度"
            />
          </div>

          <footer className="peak-valley-page__panel-footer">
            <span>蓄热&nbsp;&nbsp;{durationText}</span>
            <span>{durationText}&nbsp;&nbsp;放热</span>
          </footer>
        </article>

        <LabeledSelectRow
          label="费用倍率值"
          description="放热区间费用比蓄热区间费用的差值"
          value={costMultiplier}
          onChange={setCostMultiplier}
          suffix="%"
          className="peak-valley-page__select-row"
          showIndicator
          useModeCardControl
        />
      </section>
    </main>
  )
}

export default PeakValleyPage
