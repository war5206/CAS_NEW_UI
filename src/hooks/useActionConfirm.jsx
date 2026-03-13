import { useState } from 'react'
import AttentionModal from '../components/AttentionModal'

function normalizeConfirmConfig(config) {
  if (!config) {
    return null
  }

  if (typeof config === 'string') {
    return {
      title: '二次确认',
      message: config,
      confirmText: '确定',
      cancelText: '取消',
      showCancel: true,
      showBackdrop: true,
    }
  }

  return {
    title: config.title ?? '二次确认',
    message: config.message ?? '确认执行当前操作吗？',
    confirmText: config.confirmText ?? '确定',
    cancelText: config.cancelText ?? '取消',
    showCancel: config.showCancel ?? true,
    showBackdrop: config.showBackdrop ?? true,
    zIndex: config.zIndex,
  }
}

export function useActionConfirm() {
  const [dialogState, setDialogState] = useState(null)

  const closeConfirm = () => {
    setDialogState(null)
  }

  const requestConfirm = (config, onConfirm, onCancel) => {
    const normalizedConfig = normalizeConfirmConfig(config)
    if (!normalizedConfig) {
      onConfirm?.()
      return
    }

    setDialogState({
      ...normalizedConfig,
      onConfirm,
      onCancel,
    })
  }

  const handleConfirm = () => {
    const action = dialogState?.onConfirm
    setDialogState(null)
    action?.()
  }

  const handleCancel = () => {
    const action = dialogState?.onCancel
    setDialogState(null)
    action?.()
  }

  const confirmModal = (
    <AttentionModal
      isOpen={Boolean(dialogState)}
      title={dialogState?.title ?? '二次确认'}
      message={dialogState?.message ?? ''}
      confirmText={dialogState?.confirmText ?? '确定'}
      cancelText={dialogState?.cancelText ?? '取消'}
      showCancel={dialogState?.showCancel ?? true}
      showBackdrop={dialogState?.showBackdrop ?? true}
      zIndex={dialogState?.zIndex}
      onClose={closeConfirm}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )

  return {
    requestConfirm,
    closeConfirm,
    confirmModal,
  }
}

export default useActionConfirm
