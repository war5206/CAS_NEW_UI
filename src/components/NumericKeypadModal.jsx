import { useEffect, useMemo, useState } from 'react'
import deleteIcon from '../assets/common/delete.svg'
import { useActionConfirm } from '../hooks/useActionConfirm'
import './SettingCards.css'

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'delete']

function sanitizeText(value) {
  return value == null ? '' : String(value).trim()
}

function resolveModalTitle(title) {
  const text = sanitizeText(title)
  return text || '输入'
}

function normalizeDraftValue(value) {
  if (!value) {
    return '0'
  }
  return value.endsWith('.') ? value.slice(0, -1) : value
}

function resolveNestedConfirmConfig(config, modalZIndex) {
  if (!config) {
    return config
  }

  const elevatedZIndex = Number.isFinite(modalZIndex) ? modalZIndex + 20 : 520

  if (typeof config === 'string') {
    return {
      message: config,
      showBackdrop: false,
      zIndex: elevatedZIndex,
    }
  }

  return {
    ...config,
    showBackdrop: config.showBackdrop ?? false,
    zIndex: config.zIndex ?? elevatedZIndex,
  }
}

function NumericKeypadModal({
  isOpen = false,
  initialValue = '',
  title = '输入',
  showBackdrop = true,
  zIndex,
  onConfirm,
  onClose,
  confirmConfig,
}) {
  const { requestConfirm, confirmModal } = useActionConfirm()
  const [draftValue, setDraftValue] = useState('')
  const keypadDisplayValue = useMemo(() => sanitizeText(draftValue) || '0', [draftValue])

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setDraftValue(sanitizeText(initialValue))
  }, [initialValue, isOpen])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

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
    const rawConfirmConfig =
      typeof confirmConfig === 'function'
        ? confirmConfig({
            currentValue: sanitizeText(initialValue),
            nextValue,
            title,
          })
        : confirmConfig
    const resolvedConfirmConfig = resolveNestedConfirmConfig(rawConfirmConfig, zIndex)

    if (resolvedConfirmConfig) {
      requestConfirm(resolvedConfirmConfig, () => onConfirm?.(nextValue))
      return
    }

    onConfirm?.(nextValue)
  }

  if (!isOpen) {
    return null
  }

  const modalTitle = resolveModalTitle(title)
  const backdropClassName = ['labeled-select-keypad-backdrop', showBackdrop ? '' : 'is-transparent']
    .filter(Boolean)
    .join(' ')
  const backdropStyle = Number.isFinite(zIndex) ? { zIndex } : undefined

  return (
    <>
      <div className={backdropClassName} style={backdropStyle} role="presentation" onClick={onClose}>
        <section
          className="labeled-select-keypad"
          role="dialog"
          aria-modal="true"
          aria-label={modalTitle}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="labeled-select-keypad__header">
            <h3 className="labeled-select-keypad__title">{modalTitle}</h3>
            <button type="button" className="labeled-select-keypad__close" onClick={onClose} aria-label="关闭">
              ×
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
                    aria-label={isDelete ? '删除' : key}
                  >
                    {isDelete ? (
                      <img src={deleteIcon} alt="" aria-hidden="true" className="labeled-select-keypad__key-icon" />
                    ) : (
                      key
                    )}
                  </button>
                )
              })}
            </div>

            <div className="labeled-select-keypad__actions">
              <button type="button" className="labeled-select-keypad__action is-cancel" onClick={onClose}>
                取消
              </button>
              <button type="button" className="labeled-select-keypad__action is-confirm" onClick={handleConfirm}>
                确定
              </button>
            </div>
          </div>
        </section>
      </div>
      {confirmModal}
    </>
  )
}

export default NumericKeypadModal
