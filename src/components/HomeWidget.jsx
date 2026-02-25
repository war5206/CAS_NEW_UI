function HomeWidget({ title, icon, className = '', titleRight = null, children }) {
  const widgetClassName = className ? `home-widget ${className}` : 'home-widget'

  return (
    <article className={widgetClassName}>
      <header className="home-widget-title">
        <img src={icon} alt="" aria-hidden="true" className="home-widget-title-icon" />
        <span>{title}</span>
        {titleRight ? <div className="home-widget-title-right">{titleRight}</div> : null}
      </header>
      <div className="home-widget-content">{children}</div>
    </article>
  )
}

export default HomeWidget
