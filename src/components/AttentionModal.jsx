import { useEffect } from 'react'
import './SettingCards.css'

function AttentionModal({
  isOpen = false,
  title = '提示',
  message = '',
  confirmText = '确认',
  cancelText = '取消',
  showCancel = false,
  showBackdrop = true,
  zIndex,
  onClose,
  onConfirm,
  onCancel,
}) {
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

  if (!isOpen) {
    return null
  }

  const backdropClassName = ['attention-modal-backdrop', showBackdrop ? '' : 'is-transparent']
    .filter(Boolean)
    .join(' ')
  const backdropStyle = Number.isFinite(zIndex) ? { zIndex } : undefined
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
      return
    }
    onClose?.()
  }
  const handleCancel = () => {
    if (onCancel) {
      onCancel()
      return
    }
    onClose?.()
  }

  return (
    <div className={backdropClassName} style={backdropStyle} role="presentation" onClick={onClose}>
      <section
        className="attention-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="attention-modal__header">
          <h3 className="attention-modal__title">{title}</h3>
          <button type="button" className="attention-modal__close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>

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
      </section>
    </div>
  )
}

export default AttentionModal
