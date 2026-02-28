import { useState } from 'react'
import ModeOptionCard from './ModeOptionCard'
import NumericKeypadModal from './NumericKeypadModal'
import TimePickerModal from './TimePickerModal'
import './SettingCards.css'

function sanitizeText(value) {
  return value == null ? '' : String(value).trim()
}

function resolveKeypadTitle(label) {
  if (typeof label === 'string') {
    return sanitizeText(label) || '输入'
  }
  return '输入'
}

const TIME_HOURS = Array.from({ length: 24 }, (_, index) => index)
const TIME_MINUTES = Array.from({ length: 60 }, (_, index) => index)

function parseTimeValue(value) {
  const parsed = sanitizeText(value).match(/^(\d{1,2}):(\d{1,2})$/)
  if (!parsed) {
    return [0, 0]
  }

  const hours = Number.parseInt(parsed[1], 10)
  const minutes = Number.parseInt(parsed[2], 10)
  const safeHours = Number.isFinite(hours) ? Math.min(Math.max(hours, 0), 23) : 0
  const safeMinutes = Number.isFinite(minutes) ? Math.min(Math.max(minutes, 0), 59) : 0

  return [safeHours, safeMinutes]
}

function formatTwoDigits(value) {
  return String(value).padStart(2, '0')
}

function LabeledSelectRow({
  label,
  description,
  value,
  onChange,
  id,
  name,
  suffix = '',
  disabled = false,
  showIndicator = false,
  useModeCardControl = false,
  popupType = 'keyboard',
  className = '',
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const currentValue = sanitizeText(value)
  const resolvedPopupType = popupType === 'time' ? 'time' : 'keyboard'
  const suffixText = sanitizeText(suffix)
  const rowClassName = ['labeled-select-row', disabled ? 'is-disabled' : '', className].filter(Boolean).join(' ')
  const displayValue = currentValue || '0'
  const modeCardLabel = suffixText ? (
    <span className="labeled-select-row__mode-label">
      <span className="labeled-select-row__mode-value">{displayValue}</span>
      <span className="labeled-select-row__mode-suffix">{suffixText}</span>
    </span>
  ) : (
    displayValue
  )

  const openKeyboard = () => {
    if (disabled) {
      return
    }
    setIsModalOpen(true)
  }

  const closeKeyboard = () => {
    setIsModalOpen(false)
  }

  const handleConfirm = (nextValue) => {
    if (typeof onChange === 'function') {
      onChange(nextValue)
    }
    closeKeyboard()
  }

  return (
    <>
      <div className={rowClassName}>
        <div className="labeled-select-row__content">
          <div className="labeled-select-row__label">{label}</div>
          {description ? <p className="labeled-select-row__description">{description}</p> : null}
        </div>

        <div className="labeled-select-row__control">
          {useModeCardControl ? (
            <ModeOptionCard
              label={modeCardLabel}
              disabled={disabled}
              onClick={openKeyboard}
              className={`labeled-select-row__mode-trigger${showIndicator ? ' has-indicator' : ''}`}
            />
          ) : (
            <button
              id={id}
              name={name}
              type="button"
              className={`labeled-select-row__trigger${showIndicator ? ' has-indicator' : ''}`}
              onClick={openKeyboard}
              disabled={disabled}
              aria-label={label}
              aria-haspopup={resolvedPopupType === 'time' ? 'listbox' : 'dialog'}
              aria-expanded={isModalOpen}
            >
              <span className="labeled-select-row__trigger-value">{displayValue}</span>
              {suffixText ? <span className="labeled-select-row__trigger-suffix">{suffixText}</span> : null}
            </button>
          )}
        </div>
      </div>

      {resolvedPopupType === 'time' ? (
        <TimePickerModal
          isOpen={isModalOpen}
          columns={[
            { key: 'hour', options: TIME_HOURS, formatter: (next) => formatTwoDigits(next) },
            { key: 'minute', options: TIME_MINUTES, formatter: (next) => formatTwoDigits(next) },
          ]}
          value={parseTimeValue(currentValue)}
          onClose={closeKeyboard}
          onConfirm={(nextValue) => {
            const [hour = 0, minute = 0] = Array.isArray(nextValue) ? nextValue : []
            handleConfirm(`${formatTwoDigits(hour)}:${formatTwoDigits(minute)}`)
          }}
        />
      ) : (
        <NumericKeypadModal
          isOpen={isModalOpen}
          initialValue={currentValue}
          title={resolveKeypadTitle(label)}
          onClose={closeKeyboard}
          onConfirm={handleConfirm}
        />
      )}
    </>
  )
}

export default LabeledSelectRow
