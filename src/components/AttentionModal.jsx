import { useEffect, useRef } from 'react'
import './SettingCards.css'

function AttentionModal({
  isOpen = false,
  title = '提示',
  message = '',
  confirmText = '确认',
  cancelText = '取消',
  showCancel = false,
  showBackdrop = true,
  isLoading = false,
  loadingText = '保存中',
  zIndex,
  onClose,
  onConfirm,
  onCancel,
}) {
  const openedAtRef = useRef(0)

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    openedAtRef.current = Date.now()

    const handleEscape = (event) => {
      if (event.key !== 'Escape') {
        return
      }

      if (isLoading) {
        return
      }

      if (showCancel && onCancel) {
        onCancel()
        return
      }

      onClose?.()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, isLoading, onCancel, onClose, showCancel])

  if (!isOpen) {
    return null
  }

  const backdropClassName = ['attention-modal-backdrop', showBackdrop ? '' : 'is-transparent']
    .filter(Boolean)
    .join(' ')
  const backdropStyle = Number.isFinite(zIndex) ? { zIndex } : undefined

  const handleDismiss = () => {
    if (isLoading) {
      return
    }

    if (showCancel && onCancel) {
      onCancel()
      return
    }

    onClose?.()
  }

  const handleBackdropClick = () => {
    if (isLoading) {
      return
    }
    // Ignore the opening gesture's synthetic click on touch devices.
    if (Date.now() - openedAtRef.current < 300) {
      return
    }

    handleDismiss()
  }

  const handleConfirm = () => {
    if (isLoading) {
      return
    }
    if (onConfirm) {
      onConfirm()
      return
    }

    onClose?.()
  }

  const handleCancel = () => {
    if (isLoading) {
      return
    }
    if (onCancel) {
      onCancel()
      return
    }

    onClose?.()
  }

  return (
    <div className={backdropClassName} style={backdropStyle} role="presentation" onClick={handleBackdropClick}>
      <section
        className={['attention-modal', isLoading ? 'is-loading' : ''].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={isLoading ? loadingText : title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="attention-modal__header">
          {isLoading ? (
            <div className="attention-modal__loading attention-modal__loading--row" role="status" aria-live="polite" aria-busy="true">
              <span className="attention-modal__loading-spinner" aria-hidden="true" />
              <span className="attention-modal__loading-text">{loadingText}</span>
            </div>
          ) : (
            <>
              <h3 className="attention-modal__title">{title}</h3>
              <button type="button" className="attention-modal__close" onClick={handleDismiss} aria-label="close">
                x
              </button>
            </>
          )}
        </header>

        {!isLoading ? (
          <div className="attention-modal__body">
            <p className="attention-modal__message">{message}</p>
            <div className={`attention-modal__actions${showCancel ? ' has-cancel' : ''}`}>
              {showCancel ? (
                <button type="button" className="attention-modal__cancel" onClick={handleCancel}>
                  {cancelText}
                </button>
              ) : null}
              <button type="button" className="attention-modal__confirm" onClick={handleConfirm}>
                {confirmText}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

export default AttentionModal
