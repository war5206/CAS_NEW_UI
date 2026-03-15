import { useEffect, useMemo, useRef, useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import { useActionConfirm } from '../hooks/useActionConfirm'
import peakValleyIcon from '../assets/peak-valley-white.svg'
import './PeakValleyPage.css'

const HOUR_LABELS = ['5', '4', '3', '2', '1', '0', '1', '2', '3', '4', '5']
const STRENGTH_MINUTES_LIMIT = 300
const STRENGTH_CENTER_VALUE = STRENGTH_MINUTES_LIMIT
const STRENGTH_MAX_VALUE = STRENGTH_MINUTES_LIMIT * 2
const STRENGTH_SLIDER_THUMB_WIDTH = 56

function isThumbHit(clientX, rect, value, min, max) {
  const axisStart = STRENGTH_SLIDER_THUMB_WIDTH / 2
  const axisEnd = rect.width - STRENGTH_SLIDER_THUMB_WIDTH / 2
  const ratio = max === min ? 0 : (value - min) / (max - min)
  const thumbCenter = axisStart + (axisEnd - axisStart) * ratio
  const pointerX = clientX - rect.left

  return Math.abs(pointerX - thumbCenter) <= STRENGTH_SLIDER_THUMB_WIDTH / 2
}

const STRENGTH_STEP_MINUTES = 6

function minutesToText(minutes) {
  const decimalHours = Math.round((minutes / 60) * 10) / 10
  return String(decimalHours)
}

function roundToStep(minutes) {
  return Math.round(minutes / STRENGTH_STEP_MINUTES) * STRENGTH_STEP_MINUTES
}

function PeakValleyPage() {
  const { requestConfirm, confirmModal } = useActionConfirm()
  const [isEnabled, setIsEnabled] = useState(true)
  const [compensation, setCompensation] = useState('2')
  const [expenseRate, setExpenseRate] = useState('50')
  const [chargeMinutes, setChargeMinutes] = useState(90)
  const [releaseMinutes, setReleaseMinutes] = useState(90)
  const strengthFinalizeTimeoutRef = useRef(null)
  const strengthRangeStartRef = useRef({ chargeMinutes: 90, releaseMinutes: 90 })
  const strengthRangeValueRef = useRef({ chargeMinutes: 90, releaseMinutes: 90 })
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

  useEffect(() => {
    strengthRangeValueRef.current = { chargeMinutes, releaseMinutes }
  }, [chargeMinutes, releaseMinutes])

  const beginStrengthInteraction = (previousRange = strengthRangeValueRef.current) => {
    if (strengthFinalizeTimeoutRef.current) {
      window.clearTimeout(strengthFinalizeTimeoutRef.current)
      strengthFinalizeTimeoutRef.current = null
    }

    isStrengthDraggingRef.current = true
    strengthRangeStartRef.current = previousRange
  }

  const previewStrengthRange = (nextRange) => {
    strengthRangeValueRef.current = nextRange
    setChargeMinutes(nextRange.chargeMinutes)
    setReleaseMinutes(nextRange.releaseMinutes)
  }

  const handleChargeSliderChange = (event) => {
    if (!isStrengthDraggingRef.current) {
      beginStrengthInteraction(strengthRangeValueRef.current)
    }

    const rawValue = Number(event.target.value)
    const nextValue = Math.min(Math.max(rawValue, 0), STRENGTH_CENTER_VALUE)
    const chargeMins = roundToStep(STRENGTH_CENTER_VALUE - nextValue)
    previewStrengthRange({
      chargeMinutes: chargeMins,
      releaseMinutes: strengthRangeValueRef.current.releaseMinutes,
    })
  }

  const handleReleaseSliderChange = (event) => {
    if (!isStrengthDraggingRef.current) {
      beginStrengthInteraction(strengthRangeValueRef.current)
    }

    const rawValue = Number(event.target.value)
    const nextValue = Math.min(Math.max(rawValue, STRENGTH_CENTER_VALUE), STRENGTH_MAX_VALUE)
    const releaseMins = roundToStep(nextValue - STRENGTH_CENTER_VALUE)
    previewStrengthRange({
      chargeMinutes: strengthRangeValueRef.current.chargeMinutes,
      releaseMinutes: releaseMins,
    })
  }

  const handleStrengthSliderPointerDown = (event, side) => {
    event.stopPropagation()

    if (!isEnabled) {
      return
    }

    const currentRange = strengthRangeValueRef.current
    const currentValue =
      side === 'left'
        ? STRENGTH_CENTER_VALUE - currentRange.chargeMinutes
        : STRENGTH_CENTER_VALUE + currentRange.releaseMinutes

    if (!isThumbHit(event.clientX, event.currentTarget.getBoundingClientRect(), currentValue, 0, STRENGTH_MAX_VALUE)) {
      event.preventDefault()
      return
    }

    beginStrengthInteraction(currentRange)
  }

  const finalizeStrengthInteraction = () => {
    if (!isStrengthDraggingRef.current) {
      return
    }

    strengthFinalizeTimeoutRef.current = null
    isStrengthDraggingRef.current = false
    const previousRange = strengthRangeStartRef.current
    const nextRange = strengthRangeValueRef.current

    if (
      previousRange.chargeMinutes === nextRange.chargeMinutes &&
      previousRange.releaseMinutes === nextRange.releaseMinutes
    ) {
      return
    }

    requestStrengthConfirm(nextRange.chargeMinutes, nextRange.releaseMinutes, previousRange)
  }

  const handleStrengthSliderPointerEnd = (event) => {
    event?.stopPropagation?.()

    if (!isStrengthDraggingRef.current) {
      return
    }

    if (strengthFinalizeTimeoutRef.current) {
      window.clearTimeout(strengthFinalizeTimeoutRef.current)
    }

    // Touch taps on range inputs may dispatch change after pointerup.
    strengthFinalizeTimeoutRef.current = window.setTimeout(() => {
      finalizeStrengthInteraction()
    }, 0)
  }

  useEffect(() => {
    const handlePointerRelease = () => {
      handleStrengthSliderPointerEnd()
    }

    window.addEventListener('pointerup', handlePointerRelease)
    window.addEventListener('pointercancel', handlePointerRelease)

    return () => {
      window.removeEventListener('pointerup', handlePointerRelease)
      window.removeEventListener('pointercancel', handlePointerRelease)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (strengthFinalizeTimeoutRef.current) {
        window.clearTimeout(strengthFinalizeTimeoutRef.current)
      }
    }
  }, [])

  return (
    <main className="peak-valley-page">
      <FeatureInfoCard
        icon={peakValleyIcon}
        iconAlt="热电协同"
        title="热电协同"
        // description={
        //   <>
        //     开启时，处于低电时段，提升运行目标温度，
        //     <br />
        //     进行蓄热，当前模式仅适用于供热
        //   </>
        // }
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
            value={compensation}
            onChange={setCompensation}
            useModeCardControl
            disabled={!isEnabled}
            confirmConfig={({ nextValue }) => ({ message: `确认将蓄能补偿值设置为 ${nextValue} 吗？` })}
          />

          <div className="peak-valley-page__strength-row">
            <div className="peak-valley-page__strength-title">蓄能强度</div>
            <p className="peak-valley-page__strength-desc">在峰电时段前蓄热能力，蓄热后持续放热强度（拖动滑块设值）</p>
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
            >
              <div className="peak-valley-page__strength-track" />
              <div className="peak-valley-page__strength-fill peak-valley-page__strength-fill--charge" />
              <div className="peak-valley-page__strength-fill peak-valley-page__strength-fill--release" />
              <div className="peak-valley-page__strength-divider" aria-hidden="true" />
              <input
                className="peak-valley-page__strength-slider peak-valley-page__strength-slider--left"
                type="range"
                min={0}
                max={STRENGTH_MAX_VALUE}
                step={STRENGTH_STEP_MINUTES}
                value={leftSliderValue}
                onChange={handleChargeSliderChange}
                onPointerDown={(event) => handleStrengthSliderPointerDown(event, 'left')}
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
                step={STRENGTH_STEP_MINUTES}
                value={rightSliderValue}
                onChange={handleReleaseSliderChange}
                onPointerDown={(event) => handleStrengthSliderPointerDown(event, 'right')}
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
            // description="放热区间费用比蓄热区间费用的差值"
            value={expenseRate}
            // suffix="%"
            onChange={setExpenseRate}
            useModeCardControl
            disabled={!isEnabled}
            confirmConfig={({ nextValue }) => ({ message: `确认将费用倍率值设置为 ${nextValue} 吗？` })}
          />
        </div>
      </section>
      {confirmModal}
    </main>
  )
}

export default PeakValleyPage
