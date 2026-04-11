import './GuideOptionButton.css'

function GuideOptionButton({
  label,
  selected = false,
  onClick,
  disabled = false,
  className = '',
}) {
  const isClickable = typeof onClick === 'function' && !disabled
  const Root = isClickable ? 'button' : 'div'
  const cardClassName = [
    'guide-option-button',
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
      <span className="guide-option-button__label">{label}</span>
    </Root>
  )
}

export default GuideOptionButton
