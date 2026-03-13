import { useActionConfirm } from '../hooks/useActionConfirm'
import './ToggleSwitch.css'

function joinClassNames(...names) {
  return names.filter(Boolean).join(' ')
}

function ToggleSwitch({
  checked = false,
  onToggle,
  ariaLabel = '切换开关',
  className = '',
  forceOnStyle = false,
  disabled = false,
  confirmConfig,
}) {
  const { requestConfirm, confirmModal } = useActionConfirm()

  const handleClick = () => {
    const resolvedConfirmConfig =
      typeof confirmConfig === 'function'
        ? confirmConfig({
            checked,
            nextChecked: !checked,
          })
        : confirmConfig

    if (resolvedConfirmConfig) {
      requestConfirm(resolvedConfirmConfig, onToggle)
      return
    }

    onToggle?.()
  }

  return (
    <>
      <button
        type="button"
        className={joinClassNames(
          'toggle-switch',
          checked ? 'is-on' : '',
          forceOnStyle ? 'is-blue' : '',
          className,
        )}
        aria-label={ariaLabel}
        aria-pressed={checked}
        onClick={handleClick}
        disabled={disabled}
      >
        <span className="toggle-switch__thumb" />
      </button>
      {confirmModal}
    </>
  )
}

export default ToggleSwitch
