import selectedLeftIcon from '../assets/function-selected-left.svg'
import selectedRightIcon from '../assets/function-selected-right.svg'
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

function FeatureInfoCard({
  icon,
  iconAlt = '',
  title,
  description,
  selected = false,
  selectedBadgePosition = 'end',
  onClick,
  disabled = false,
  className = '',
  checkIcon,
}) {
  const isClickable = typeof onClick === 'function' && !disabled
  const Root = isClickable ? 'button' : 'div'
  const selectedBadgeIcon = checkIcon ?? (selectedBadgePosition === 'start' ? selectedLeftIcon : selectedRightIcon)
  const cardClassName = [
    'feature-info-card',
    selected ? 'is-selected' : '',
    selectedBadgePosition === 'start' ? 'badge-start' : 'badge-end',
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
      <span className="feature-info-card__icon-wrap">{renderIcon(icon, iconAlt, 'feature-info-card__icon')}</span>
      <span className="feature-info-card__content">
        <span className="feature-info-card__title">{title}</span>
        {description ? <span className="feature-info-card__description">{description}</span> : null}
      </span>
      {selected ? (
        <img
          src={selectedBadgeIcon}
          alt=""
          aria-hidden="true"
          className="feature-info-card__selected-badge"
        />
      ) : null}
    </Root>
  )
}

export default FeatureInfoCard
