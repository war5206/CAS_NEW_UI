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
}) {
  return (
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
      onClick={onToggle}
      disabled={disabled}
    >
      <span className="toggle-switch__thumb" />
    </button>
  )
}

export default ToggleSwitch
