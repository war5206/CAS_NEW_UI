import selectedIcon from '../assets/function-selected-right.svg'
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
}) {
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

  return (
    <Root
      className={cardClassName}
      {...(isClickable
        ? {
            type: 'button',
            onClick,
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
  )
}

export default ModeOptionCard
