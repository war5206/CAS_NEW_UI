import { useEffect, useMemo, useState } from 'react'
import deleteIcon from '../assets/common/delete.svg'
import ModeOptionCard from './ModeOptionCard'
import './SettingCards.css'

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'delete']

function sanitizeText(value) {
  return value == null ? '' : String(value).trim()
}

function normalizeDraftValue(value) {
  if (!value) {
    return '0'
  }
  return value.endsWith('.') ? value.slice(0, -1) : value
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
  className = '',
}) {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const [draftValue, setDraftValue] = useState('')
  const currentValue = sanitizeText(value)
  const suffixText = sanitizeText(suffix)
  const rowClassName = ['labeled-select-row', disabled ? 'is-disabled' : '', className].filter(Boolean).join(' ')
  const displayValue = currentValue || '0'
  const keypadDisplayValue = useMemo(() => sanitizeText(draftValue) || '0', [draftValue])
  const modeCardLabel = suffixText ? (
    <span className="labeled-select-row__mode-label">
      <span className="labeled-select-row__mode-value">{displayValue}</span>
      <span className="labeled-select-row__mode-suffix">{suffixText}</span>
    </span>
  ) : (
    displayValue
  )

  useEffect(() => {
    if (!isKeyboardOpen) {
      return undefined
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsKeyboardOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isKeyboardOpen])

  const openKeyboard = () => {
    if (disabled) {
      return
    }
    setDraftValue(currentValue)
    setIsKeyboardOpen(true)
  }

  const closeKeyboard = () => {
    setIsKeyboardOpen(false)
  }

  const handleKeyPress = (key) => {
    setDraftValue((previous) => {
      const next = sanitizeText(previous)

      if (key === 'delete') {
        return next.slice(0, -1)
      }

      if (key === '.') {
        if (next.includes('.')) {
          return next
        }
        return next ? `${next}.` : '0.'
      }

      if (next === '0') {
        return key
      }

      return `${next}${key}`
    })
  }

  const handleConfirm = () => {
    const nextValue = normalizeDraftValue(sanitizeText(draftValue))
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
              aria-haspopup="dialog"
              aria-expanded={isKeyboardOpen}
            >
              <span className="labeled-select-row__trigger-value">{displayValue}</span>
              {suffixText ? <span className="labeled-select-row__trigger-suffix">{suffixText}</span> : null}
            </button>
          )}
        </div>
      </div>

      {isKeyboardOpen ? (
        <div className="labeled-select-keypad-backdrop" role="presentation" onClick={closeKeyboard}>
          <section
            className="labeled-select-keypad"
            role="dialog"
            aria-modal="true"
            aria-label={'\u8f93\u5165'}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="labeled-select-keypad__header">
              <h3 className="labeled-select-keypad__title">{'\u8f93\u5165'}</h3>
              <button
                type="button"
                className="labeled-select-keypad__close"
                onClick={closeKeyboard}
                aria-label={'\u5173\u95ed'}
              >
                {'\u00d7'}
              </button>
            </header>

            <div className="labeled-select-keypad__body">
              <div className="labeled-select-keypad__display">{keypadDisplayValue}</div>

              <div className="labeled-select-keypad__grid">
                {KEYPAD_KEYS.map((key) => {
                  const isDelete = key === 'delete'
                  const keyClassName = `labeled-select-keypad__key${isDelete ? ' is-delete' : ''}`

                  return (
                    <button
                      key={key}
                      type="button"
                      className={keyClassName}
                      onClick={() => handleKeyPress(key)}
                      aria-label={isDelete ? '\u5220\u9664' : key}
                    >
                      {isDelete ? (
                        <img
                          src={deleteIcon}
                          alt=""
                          aria-hidden="true"
                          className="labeled-select-keypad__key-icon"
                        />
                      ) : (
                        key
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="labeled-select-keypad__actions">
                <button type="button" className="labeled-select-keypad__action is-cancel" onClick={closeKeyboard}>
                  {'\u53d6\u6d88'}
                </button>
                <button type="button" className="labeled-select-keypad__action is-confirm" onClick={handleConfirm}>
                  {'\u786e\u5b9a'}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}

export default LabeledSelectRow
