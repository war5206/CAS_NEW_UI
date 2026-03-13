import selectedIcon from '../assets/function-selected-right.svg'
import { useActionConfirm } from '../hooks/useActionConfirm'
import './SettingCards.css'

function renderIcon(icon, iconAlt, className) {
  if (!icon) {
    return null
  }

  if (typeof icon === 'string') {
    return <img src={icon} alt={iconAlt} className={className} />
  }

  return (
    <span className={className} aria-hidden={iconAlt ? undefined : true}>
      {icon}
    </span>
  )
}

function ModeOptionCard({
  icon,
  iconAlt = '',
  label,
  selected = false,
  onClick,
  disabled = false,
  className = '',
  checkIcon = selectedIcon,
  confirmConfig,
}) {
  const { requestConfirm, confirmModal } = useActionConfirm()
  const isClickable = typeof onClick === 'function' && !disabled
  const Root = isClickable ? 'button' : 'div'
  const cardClassName = [
    'mode-option-card',
    selected ? 'is-selected' : '',
    isClickable ? 'is-clickable' : '',
    disabled ? 'is-disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const handleClick = () => {
    const resolvedConfirmConfig =
      typeof confirmConfig === 'function'
        ? confirmConfig({
            selected,
            nextSelected: !selected,
            label,
          })
        : confirmConfig

    if (resolvedConfirmConfig) {
      requestConfirm(resolvedConfirmConfig, onClick)
      return
    }

    onClick()
  }

  return (
    <>
      <Root
        className={cardClassName}
        {...(isClickable
          ? {
              type: 'button',
              onClick: handleClick,
              'aria-pressed': selected,
            }
          : {})}
      >
        <span className="mode-option-card__icon-wrap">{renderIcon(icon, iconAlt, 'mode-option-card__icon')}</span>
        <span className="mode-option-card__label">{label}</span>
        {selected ? (
          <img src={checkIcon} alt="" aria-hidden="true" className="mode-option-card__selected-badge" />
        ) : null}
      </Root>
      {confirmModal}
    </>
  )
}

export default ModeOptionCard
