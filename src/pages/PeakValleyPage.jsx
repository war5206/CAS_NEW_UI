import { useMemo, useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import peakValleyIcon from '../assets/mode-select-peak-valley-regulation.svg'
import './PeakValleyPage.css'

const HOUR_LABELS = ['5h', '4h', '3h', '2h', '1h', '0', '1h', '2h', '3h', '4h', '5h']

function minutesToText(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h${String(mins).padStart(2, '0')}m`
}

function PeakValleyPage() {
  const [isEnabled, setIsEnabled] = useState(true)
  const [compensation, setCompensation] = useState('2')
  const [expenseRate, setExpenseRate] = useState('50')
  const [chargeMinutes, setChargeMinutes] = useState(95)
  const [releaseMinutes, setReleaseMinutes] = useState(95)
  const chargeText = useMemo(() => minutesToText(chargeMinutes), [chargeMinutes])
  const releaseText = useMemo(() => minutesToText(releaseMinutes), [releaseMinutes])

  return (
    <main className="peak-valley-page">
      <FeatureInfoCard
        icon={peakValleyIcon}
        iconAlt="峰谷调节"
        title="峰谷调节"
        description="开启时，处于低电时段，提升运行目标温度，进行蓄热，当前模式仅适用于供热"
        selected={isEnabled}
        onClick={() => setIsEnabled((previous) => !previous)}
        className="peak-valley-page__card"
      />

      <section className={`peak-valley-page__rows${!isEnabled ? ' is-disabled' : ''}`}>
        <h3 className="peak-valley-page__section-title">参数设置</h3>
        <div className="peak-valley-page__row-list">
          <LabeledSelectRow
            label="蓄能补偿值"
            description="在原来定温或者气候补偿模式下增加几度"
            value={compensation}
            onChange={setCompensation}
            showIndicator
            useModeCardControl
            disabled={!isEnabled}
          />

          <div className="peak-valley-page__strength-row">
            <div className="peak-valley-page__strength-title">蓄能强度</div>
            <p className="peak-valley-page__strength-desc">在峰电时段达前蓄能多长时间，蓄能后持续放热多长时间</p>
            <div className="peak-valley-page__strength-hours">
              {HOUR_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="peak-valley-page__strength-slider-wrap">
              <div className="peak-valley-page__strength-track" />
              <div className="peak-valley-page__strength-center" />
              <input
                type="range"
                min={0}
                max={300}
                value={chargeMinutes}
                onChange={(event) => setChargeMinutes(Number(event.target.value))}
                disabled={!isEnabled}
                aria-label="蓄热时长"
              />
              <input
                type="range"
                min={0}
                max={300}
                value={releaseMinutes}
                onChange={(event) => setReleaseMinutes(Number(event.target.value))}
                disabled={!isEnabled}
                aria-label="放热时长"
              />
              <span className="peak-valley-page__pill peak-valley-page__pill--left">{chargeText}</span>
              <span className="peak-valley-page__pill peak-valley-page__pill--right">{releaseText}</span>
            </div>
            <div className="peak-valley-page__strength-footer">
              <span>蓄热 {chargeText}</span>
              <span>{releaseText} 放热</span>
            </div>
          </div>

          <LabeledSelectRow
            label="费用倍率值"
            description="放热区间费用比蓄热区间费用的差值"
            value={expenseRate}
            suffix="%"
            onChange={setExpenseRate}
            showIndicator
            useModeCardControl
            disabled={!isEnabled}
          />
        </div>
      </section>
    </main>
  )
}

export default PeakValleyPage
