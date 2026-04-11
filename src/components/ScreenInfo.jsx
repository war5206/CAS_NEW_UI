import './ScreenInfo.css'

function ScreenInfo({ title, value, unit, icon, iconAlt = '', iconWidth, iconHeight }) {
  const iconStyle = {}
  if (iconWidth !== undefined) {
    iconStyle.width = iconWidth
  }
  if (iconHeight !== undefined) {
    iconStyle.height = iconHeight
  }

  return (
    <div className="screen-info">
      <div className="screen-info-content">
        <div className="screen-info-title">{title}</div>
        <div className="screen-info-value-wrap">
          <span className="screen-info-value">{value}</span>
          {unit ? <span className="screen-info-unit">{unit}</span> : null}
        </div>
      </div>
      <img src={icon} alt={iconAlt} className="screen-info-icon" style={iconStyle} />
    </div>
  )
}

export default ScreenInfo
