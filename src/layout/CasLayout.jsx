import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import casLogo from '../assets/cas-logo.png'
import userAvatar from '../assets/user_avatar.svg'
import iconPower from '../assets/boot.svg'
import iconHasAlert from '../assets/hasAlert.svg'
import { buildTabPath, getModuleDefaultPath, getSectionDefaultPath, modules } from '../config/navigation'

const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const formatDateTime = (date) => {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const week = WEEK_LABELS[date.getDay()]
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return {
    dateLabel: `${month}月${day}日 ${week}`,
    timeLabel: `${hours}:${minutes}`,
  }
}

function CasLayout({ routeInfo, children, homePageTitle }) {
  const [now, setNow] = useState(() => new Date())
  const activeModule = routeInfo.module
  const activeSection = routeInfo.section
  const activeTab = routeInfo.tab
  const isHomeLayout = activeModule.id === 'home'

  useEffect(() => {
    const updateTime = () => setNow(new Date())
    const timer = setInterval(updateTime, 60_000)
    return () => clearInterval(timer)
  }, [])

  const breadcrumbParts = useMemo(() => {
    const rootLabel = activeModule.id === 'home' ? homePageTitle ?? '首页' : activeModule.breadcrumb ?? activeModule.label
    const items = [rootLabel]
    if (activeSection) {
      items.push(activeSection.label)
    }
    if (activeTab) {
      items.push(activeTab.label)
    }
    return items
  }, [activeModule, activeSection, activeTab, homePageTitle])

  const sectionList = activeModule.sections ?? []
  const tabList = activeSection?.tabs ?? []
  const showSecondaryNav = sectionList.length > 0 || !isHomeLayout
  const hasTabs = tabList.length > 0
  const { dateLabel, timeLabel } = formatDateTime(now)
  const alertIndicator = (
    <div className="alert-indicator" title="hasAlert">
      <img src={iconHasAlert} alt="hasAlert" />
    </div>
  )

  const breadcrumb = (
    <div className="breadcrumb">
      {breadcrumbParts.map((item, index) => (
        <span key={`${item}-${index}`} className={`crumb${index === breadcrumbParts.length - 1 ? ' current' : ''}`}>
          {item}
        </span>
      ))}
    </div>
  )

  const dateTime = (
    <div className="date-time">
      <span className="date-label">{dateLabel}</span>
      <span className="time-label">{timeLabel}</span>
    </div>
  )

  return (
    <div className="app">
      <aside className="side-nav">
        <div className="brand">
          <img src={casLogo} alt="CAS" />
        </div>
        <div className="avatar">
          <img src={userAvatar} alt="用户头像" />
        </div>
        <nav className="primary-nav">
          {modules.map((module) => (
            <Link
              key={module.id}
              to={getModuleDefaultPath(module)}
              className={`nav-item${module.id === activeModule.id ? ' is-active' : ''}`}
            >
              <img src={module.icon} alt="" aria-hidden="true" />
              <span>{module.label}</span>
            </Link>
          ))}
        </nav>
        <button type="button" className="power-button" aria-label="一键开关机" title="一键开关机">
          <img src={iconPower} alt="" aria-hidden="true" />
        </button>
      </aside>

      <div className={`main${isHomeLayout ? '' : ' is-module-layout'}`}>
        {isHomeLayout ? (
          <header className="top-bar">
            {alertIndicator}
            {breadcrumb}
            {dateTime}
          </header>
        ) : null}

        <div className={`content${showSecondaryNav ? ' has-secondary' : ''}`}>
          {showSecondaryNav ? (
            <aside className={`secondary-nav${isHomeLayout ? '' : ' is-module-layout'}`}>
              {!isHomeLayout ? <div className="secondary-alert-wrap">{alertIndicator}</div> : null}
              <div className="secondary-title">{activeModule.breadcrumb ?? activeModule.label}</div>
              {sectionList.length ? (
                <div className="secondary-list">
                  {sectionList.map((section) => (
                    <NavLink
                      key={section.id}
                      to={getSectionDefaultPath(activeModule, section)}
                      className={`secondary-item${section.id === activeSection?.id ? ' is-active' : ''}`}
                    >
                      <span>{section.label}</span>
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </aside>
          ) : null}

          <section className="stage">
            {isHomeLayout && hasTabs ? (
              <div className="tabs">
                {tabList.map((tab) => (
                  <NavLink
                    key={tab.id}
                    to={buildTabPath(activeModule, activeSection, tab)}
                    className={`tab-item${tab.id === activeTab?.id ? ' is-active' : ''}`}
                  >
                    {tab.label}
                  </NavLink>
                ))}
              </div>
            ) : null}
            <div className={`stage-body${isHomeLayout ? '' : ' stage-body--module'}`}>
              {!isHomeLayout ? (
                <div className="stage-meta">
                  <div className="breadcrumb stage-breadcrumb">
                    {breadcrumbParts.map((item, index) => (
                      <span key={`${item}-${index}`} className={`crumb${index === breadcrumbParts.length - 1 ? ' current' : ''}`}>
                        {item}
                      </span>
                    ))}
                  </div>
                  {dateTime}
                </div>
              ) : null}
              {!isHomeLayout && hasTabs ? (
                <div className="tabs stage-tabs">
                  {tabList.map((tab) => (
                    <NavLink
                      key={tab.id}
                      to={buildTabPath(activeModule, activeSection, tab)}
                      className={`tab-item${tab.id === activeTab?.id ? ' is-active' : ''}`}
                    >
                      {tab.label}
                    </NavLink>
                  ))}
                </div>
              ) : null}
              <div className="stage-content">{children}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default CasLayout
