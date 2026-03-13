import { useEffect, useMemo, useRef, useState } from 'react'
import NumericKeypadModal from './NumericKeypadModal'
import { useActionConfirm } from '../hooks/useActionConfirm'
import './SliderSettingRow.css'

function toNumber(value, fallback) {
  const parsed = Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : fallback
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function normalizeValue(rawValue, min, max, step) {
  const safeValue = clamp(toNumber(rawValue, min), min, max)
  const safeStep = step > 0 ? step : 1
  const steppedValue = Math.round((safeValue - min) / safeStep) * safeStep + min
  return clamp(Number(steppedValue.toFixed(4)), min, max)
}

function SliderSettingRow({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix = '',
  keypadTitle = '输入',
  className = '',
  showInput = true,
  confirmConfig,
}) {
  const { requestConfirm, confirmModal } = useActionConfirm()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const safeValue = normalizeValue(value, min, max, step)
  const [draftSliderValue, setDraftSliderValue] = useState(safeValue)
  const isSliderDraggingRef = useRef(false)
  const sliderStartValueRef = useRef(safeValue)

  useEffect(() => {
    setDraftSliderValue(safeValue)
  }, [safeValue])

  const ratio = useMemo(() => {
    if (max <= min) {
      return 0
    }
    return (draftSliderValue - min) / (max - min)
  }, [draftSliderValue, max, min])

  const rowClassName = ['slider-setting-row', className].filter(Boolean).join(' ')
  const textValue = String(draftSliderValue).padStart(2, '0')
  const suffixText = suffix == null ? '' : String(suffix).trim()
  const rangeText = suffixText ? `${min}${suffixText}-${max}${suffixText}` : `${min}-${max}`

  const emitChange = (nextValue) => {
    const normalized = normalizeValue(nextValue, min, max, step)
    const nextTextValue = String(normalized)
    setDraftSliderValue(normalized)
    onChange?.(nextTextValue)
  }

  const stopPointerEvent = (event) => {
    event.stopPropagation()
  }

  const handleSliderPointerDown = (event) => {
    stopPointerEvent(event)
    isSliderDraggingRef.current = true
    sliderStartValueRef.current = safeValue
  }

  const handleSliderChange = (event) => {
    setDraftSliderValue(normalizeValue(event.target.value, min, max, step))
  }

  const handleSliderPointerEnd = (event) => {
    stopPointerEvent(event)

    if (!isSliderDraggingRef.current) {
      return
    }

    isSliderDraggingRef.current = false
    const previousValue = normalizeValue(sliderStartValueRef.current, min, max, step)
    const nextValue = normalizeValue(draftSliderValue, min, max, step)

    if (previousValue === nextValue) {
      setDraftSliderValue(nextValue)
      return
    }

    const previousTextValue = String(previousValue)
    const nextTextValue = String(nextValue)
    const resolvedConfirmConfig =
      typeof confirmConfig === 'function'
        ? confirmConfig({
            currentValue: previousTextValue,
            nextValue: nextTextValue,
            label,
          })
        : confirmConfig

    if (resolvedConfirmConfig) {
      requestConfirm(
        resolvedConfirmConfig,
        () => {
          onChange?.(nextTextValue)
        },
        () => {
          setDraftSliderValue(previousValue)
        },
      )
      return
    }

    onChange?.(nextTextValue)
  }

  return (
    <>
      <section className={rowClassName}>
        <div className={`slider-setting-row__header${showInput ? '' : ' is-input-hidden'}`}>
          <label className="slider-setting-row__label">{label}</label>
          {showInput ? (
            <button
              type="button"
              className="slider-setting-row__input"
              onClick={() => setIsModalOpen(true)}
              aria-label={`${label}数值输入`}
            >
              <span>{textValue}</span>
              {suffixText ? <span className="slider-setting-row__input-suffix">{suffixText}</span> : null}
            </button>
          ) : null}
        </div>

        <div className="slider-setting-row__slider-wrap">
          <div className="slider-setting-row__slider-track-wrap" style={{ '--slider-ratio': ratio }}>
            <div className="slider-setting-row__value-pill">{textValue}</div>
            <input
              className="slider-setting-row__slider"
              type="range"
              min={min}
              max={max}
              step={step}
              value={draftSliderValue}
              onPointerDown={handleSliderPointerDown}
              onPointerMove={stopPointerEvent}
              onPointerUp={handleSliderPointerEnd}
              onPointerCancel={handleSliderPointerEnd}
              onChange={handleSliderChange}
            />
          </div>
          <div className="slider-setting-row__range-text">{`（${rangeText}）`}</div>
        </div>
      </section>

      {showInput ? (
        <NumericKeypadModal
          isOpen={isModalOpen}
          title={keypadTitle}
          initialValue={String(safeValue)}
          onClose={() => setIsModalOpen(false)}
          confirmConfig={confirmConfig}
          onConfirm={(nextValue) => {
            emitChange(nextValue)
            setIsModalOpen(false)
          }}
        />
      ) : null}
      {confirmModal}
    </>
  )
}

export default SliderSettingRow
