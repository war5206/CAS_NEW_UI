import { useMemo, useState } from 'react'
import NumericKeypadModal from './NumericKeypadModal'
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
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const safeValue = normalizeValue(value, min, max, step)
  const ratio = useMemo(() => {
    if (max <= min) {
      return 0
    }
    return (safeValue - min) / (max - min)
  }, [max, min, safeValue])

  const rowClassName = ['slider-setting-row', className].filter(Boolean).join(' ')
  const textValue = String(safeValue).padStart(2, '0')
  const suffixText = suffix == null ? '' : String(suffix).trim()
  const rangeText = suffixText ? `${min}${suffixText}-${max}${suffixText}` : `${min}-${max}`

  const emitChange = (nextValue) => {
    const normalized = normalizeValue(nextValue, min, max, step)
    onChange?.(String(normalized))
  }

  const stopPointerEvent = (event) => {
    event.stopPropagation()
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
              value={safeValue}
              onPointerDown={stopPointerEvent}
              onPointerMove={stopPointerEvent}
              onPointerUp={stopPointerEvent}
              onPointerCancel={stopPointerEvent}
              onChange={(event) => emitChange(event.target.value)}
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
          onConfirm={(nextValue) => {
            emitChange(nextValue)
            setIsModalOpen(false)
          }}
        />
      ) : null}
    </>
  )
}

export default SliderSettingRow
