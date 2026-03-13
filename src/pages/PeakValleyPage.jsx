import { useMemo, useRef, useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import { useActionConfirm } from '../hooks/useActionConfirm'
import peakValleyIcon from '../assets/peak-valley-white.svg'
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
  const { requestConfirm, confirmModal } = useActionConfirm()
  const [isEnabled, setIsEnabled] = useState(true)
  const [compensation, setCompensation] = useState('2')
  const [expenseRate, setExpenseRate] = useState('50')
  const [chargeMinutes, setChargeMinutes] = useState(95)
  const [releaseMinutes, setReleaseMinutes] = useState(95)
  const strengthRangeStartRef = useRef({ chargeMinutes: 95, releaseMinutes: 95 })
  const isStrengthDraggingRef = useRef(false)

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

  const requestStrengthConfirm = (nextChargeMinutes, nextReleaseMinutes, previousRange) => {
    requestConfirm(
      { message: `确认将蓄能强度设置为蓄热 ${minutesToText(nextChargeMinutes)}、放热 ${minutesToText(nextReleaseMinutes)} 吗？` },
      () => {},
      () => {
        setChargeMinutes(previousRange.chargeMinutes)
        setReleaseMinutes(previousRange.releaseMinutes)
      },
    )
  }

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

    const previousRange = { chargeMinutes, releaseMinutes }
    const nextValue = valueFromTrackClick(event, 0, STRENGTH_MAX_VALUE)
    let nextChargeMinutes = chargeMinutes
    let nextReleaseMinutes = releaseMinutes

    if (nextValue < STRENGTH_CENTER_VALUE) {
      nextChargeMinutes = STRENGTH_CENTER_VALUE - nextValue
    } else if (nextValue > STRENGTH_CENTER_VALUE) {
      nextReleaseMinutes = nextValue - STRENGTH_CENTER_VALUE
    } else {
      const centerToLeft = STRENGTH_CENTER_VALUE - leftSliderValue
      const rightToCenter = rightSliderValue - STRENGTH_CENTER_VALUE
      if (centerToLeft <= rightToCenter) {
        nextChargeMinutes = 0
      } else {
        nextReleaseMinutes = 0
      }
    }

    setChargeMinutes(nextChargeMinutes)
    setReleaseMinutes(nextReleaseMinutes)

    if (
      previousRange.chargeMinutes === nextChargeMinutes &&
      previousRange.releaseMinutes === nextReleaseMinutes
    ) {
      return
    }

    requestStrengthConfirm(nextChargeMinutes, nextReleaseMinutes, previousRange)
  }

  const handleStrengthSliderPointerDown = () => {
    isStrengthDraggingRef.current = true
    strengthRangeStartRef.current = { chargeMinutes, releaseMinutes }
  }

  const handleStrengthSliderPointerEnd = () => {
    if (!isStrengthDraggingRef.current) {
      return
    }

    isStrengthDraggingRef.current = false
    const previousRange = strengthRangeStartRef.current

    if (
      previousRange.chargeMinutes === chargeMinutes &&
      previousRange.releaseMinutes === releaseMinutes
    ) {
      return
    }

    requestStrengthConfirm(chargeMinutes, releaseMinutes, previousRange)
  }

  return (
    <main className="peak-valley-page">
      <FeatureInfoCard
        icon={peakValleyIcon}
        iconAlt="热电协同"
        title="热电协同"
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
        confirmConfig={({ nextSelected }) => ({
          message: `确认${nextSelected ? '开启' : '关闭'}热电协同吗？`,
        })}
      />

      <section className={`peak-valley-page__rows${!isEnabled ? ' is-disabled' : ''}`}>
        <h3 className="peak-valley-page__section-title">参数设置</h3>
        <div className="peak-valley-page__row-list">
          <LabeledSelectRow
            label="蓄能补偿值"
            description="在原来定温或者气候补偿模式下增加温度"
            value={compensation}
            onChange={setCompensation}
            useModeCardControl
            disabled={!isEnabled}
            confirmConfig={({ nextValue }) => ({ message: `确认将蓄能补偿值设置为 ${nextValue} 吗？` })}
          />

          <div className="peak-valley-page__strength-row">
            <div className="peak-valley-page__strength-title">蓄能强度</div>
            <p className="peak-valley-page__strength-desc">在峰电时段前蓄热多长时间，蓄热后持续放热多长时间</p>
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
                onPointerDown={handleStrengthSliderPointerDown}
                onPointerUp={handleStrengthSliderPointerEnd}
                onPointerCancel={handleStrengthSliderPointerEnd}
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
                onPointerDown={handleStrengthSliderPointerDown}
                onPointerUp={handleStrengthSliderPointerEnd}
                onPointerCancel={handleStrengthSliderPointerEnd}
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
            confirmConfig={({ nextValue }) => ({ message: `确认将费用倍率值设置为 ${nextValue}% 吗？` })}
          />
        </div>
      </section>
      {confirmModal}
    </main>
  )
}

export default PeakValleyPage
