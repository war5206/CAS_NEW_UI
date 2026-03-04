import { useMemo, useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import peakValleyIcon from '../assets/mode-select-peak-valley-regulation.svg'
import peakValleyLineIcon from '../assets/peak-valley-line.svg'
import './PeakValleyPage.css'

const HOUR_LABELS = ['5h', '4h', '3h', '2h', '1h', '0', '1h', '2h', '3h', '4h', '5h']
const STRENGTH_MINUTES_LIMIT = 300
const STRENGTH_CENTER_VALUE = STRENGTH_MINUTES_LIMIT
const STRENGTH_MAX_VALUE = STRENGTH_MINUTES_LIMIT * 2
const STRENGTH_SLIDER_THUMB_WIDTH = 56

function valueFromTrackClick(event, min, max) {
  const rect = event.currentTarget.getBoundingClientRect()
  const pointerX = event.clientX - rect.left
  const axisStart = STRENGTH_SLIDER_THUMB_WIDTH / 2
  const axisEnd = rect.width - STRENGTH_SLIDER_THUMB_WIDTH / 2
  const clampedX = Math.min(Math.max(pointerX, axisStart), axisEnd)
  const ratio = axisEnd === axisStart ? 0 : (clampedX - axisStart) / (axisEnd - axisStart)
  const rawValue = min + ratio * (max - min)
  return Math.round(rawValue)
}

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
  const leftSliderValue = useMemo(() => STRENGTH_CENTER_VALUE - chargeMinutes, [chargeMinutes])
  const rightSliderValue = useMemo(() => STRENGTH_CENTER_VALUE + releaseMinutes, [releaseMinutes])
  const strengthTrackStyle = useMemo(
    () => ({
      '--left-percent': (leftSliderValue / STRENGTH_MAX_VALUE) * 100,
      '--right-percent': (rightSliderValue / STRENGTH_MAX_VALUE) * 100,
    }),
    [leftSliderValue, rightSliderValue],
  )

  const handleChargeSliderChange = (event) => {
    const rawValue = Number(event.target.value)
    const nextValue = Math.min(Math.max(rawValue, 0), STRENGTH_CENTER_VALUE)
    setChargeMinutes(STRENGTH_CENTER_VALUE - nextValue)
  }

  const handleReleaseSliderChange = (event) => {
    const rawValue = Number(event.target.value)
    const nextValue = Math.min(Math.max(rawValue, STRENGTH_CENTER_VALUE), STRENGTH_MAX_VALUE)
    setReleaseMinutes(nextValue - STRENGTH_CENTER_VALUE)
  }
  const handleStrengthSliderWrapPointerDown = (event) => {
    if (!isEnabled || event.target.closest('.peak-valley-page__strength-slider')) {
      return
    }

    const nextValue = valueFromTrackClick(event, 0, STRENGTH_MAX_VALUE)
    if (nextValue < STRENGTH_CENTER_VALUE) {
      setChargeMinutes(STRENGTH_CENTER_VALUE - nextValue)
      return
    }

    if (nextValue > STRENGTH_CENTER_VALUE) {
      setReleaseMinutes(nextValue - STRENGTH_CENTER_VALUE)
      return
    }

    const centerToLeft = STRENGTH_CENTER_VALUE - leftSliderValue
    const rightToCenter = rightSliderValue - STRENGTH_CENTER_VALUE
    if (centerToLeft <= rightToCenter) {
      setChargeMinutes(0)
      return
    }

    setReleaseMinutes(0)
  }

  return (
    <main className="peak-valley-page">
      <FeatureInfoCard
        icon={peakValleyIcon}
        iconAlt="峰谷调节"
        title="峰谷调节"
        description={
          <>
            开启时，处于低电时段，提升运行目标温度，
            <br />
            进行蓄热，当前模式仅适用于供热
          </>
        }
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
            useModeCardControl
            disabled={!isEnabled}
          />

          <div className="peak-valley-page__strength-row">
            <div className="peak-valley-page__strength-title">蓄能强度</div>
            <p className="peak-valley-page__strength-desc">在峰电时段达前蓄能多长时间，蓄能后持续放热多长时间</p>
            <div className="peak-valley-page__strength-hours">
              {HOUR_LABELS.map((label, index) => (
                <span key={`${label}-${index}`} style={{ '--tick-ratio': index / 10 }}>
                  {label}
                </span>
              ))}
            </div>
            <div
              className="peak-valley-page__strength-slider-wrap"
              style={strengthTrackStyle}
              onPointerDown={handleStrengthSliderWrapPointerDown}
            >
              <div className="peak-valley-page__strength-track" />
              <div className="peak-valley-page__strength-fill peak-valley-page__strength-fill--charge" />
              <div className="peak-valley-page__strength-fill peak-valley-page__strength-fill--release" />
              <img className="peak-valley-page__strength-divider" src={peakValleyLineIcon} alt="" aria-hidden="true" />
              <input
                className="peak-valley-page__strength-slider peak-valley-page__strength-slider--left"
                type="range"
                min={0}
                max={STRENGTH_MAX_VALUE}
                value={leftSliderValue}
                onChange={handleChargeSliderChange}
                disabled={!isEnabled}
                aria-label="蓄热时长"
              />
              <input
                className="peak-valley-page__strength-slider peak-valley-page__strength-slider--right"
                type="range"
                min={0}
                max={STRENGTH_MAX_VALUE}
                value={rightSliderValue}
                onChange={handleReleaseSliderChange}
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
            useModeCardControl
            disabled={!isEnabled}
          />
        </div>
      </section>
    </main>
  )
}

export default PeakValleyPage
