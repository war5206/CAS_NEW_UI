import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import casLogo from '../assets/cas-logo.png'
import userAvatar from '../assets/user_avatar.svg'
import iconPower from '../assets/boot.svg'
import iconHasAlert from '../assets/hasAlert.svg'
import { buildTabPath, getModuleDefaultPath, getSectionDefaultPath, modules } from '../config/navigation'

const WEEK_LABELS = ['\u5468\u65e5', '\u5468\u4e00', '\u5468\u4e8c', '\u5468\u4e09', '\u5468\u56db', '\u5468\u4e94', '\u5468\u516d']

const formatDateTime = (date) => {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const week = WEEK_LABELS[date.getDay()]
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return {
    dateLabel: `${month}\u6708${day}\u65e5 ${week}`,
    timeLabel: `${hours}:${minutes}`,
  }
}

function CasLayout({ routeInfo, children }) {
  const [now, setNow] = useState(() => new Date())
  const activeModule = routeInfo.module
  const activeSection = routeInfo.section
  const activeTab = routeInfo.tab

  useEffect(() => {
    const updateTime = () => setNow(new Date())
    const timer = setInterval(updateTime, 60_000)
    return () => clearInterval(timer)
  }, [])

  const breadcrumbParts = useMemo(() => {
    const items = [activeModule.breadcrumb ?? activeModule.label]
    if (activeSection) {
      items.push(activeSection.label)
    }
    if (activeTab) {
      items.push(activeTab.label)
    }
    return items
  }, [activeModule, activeSection, activeTab])

  const sectionList = activeModule.sections ?? []
  const tabList = activeSection?.tabs ?? []
  const { dateLabel, timeLabel } = formatDateTime(now)

  return (
    <div className="app">
      <aside className="side-nav">
        <div className="brand">
          <img src={casLogo} alt="CAS" />
        </div>
        <div className="avatar">
          <img src={userAvatar} alt="\u7528\u6237\u5934\u50cf" />
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
        <button type="button" className="power-button" aria-label="\u4e00\u952e\u5f00\u5173\u673a" title="\u4e00\u952e\u5f00\u5173\u673a">
          <img src={iconPower} alt="" aria-hidden="true" />
        </button>
      </aside>

      <div className="main">
        <header className="top-bar">
          <div className="alert-indicator" title="hasAlert">
            <img src={iconHasAlert} alt="hasAlert" />
          </div>
          <div className="breadcrumb">
            {breadcrumbParts.map((item, index) => (
              <span key={`${item}-${index}`} className={`crumb${index === breadcrumbParts.length - 1 ? ' current' : ''}`}>
                {item}
              </span>
            ))}
          </div>
          <div className="date-time">
            <span className="date-label">{dateLabel}</span>
            <span className="time-label">{timeLabel}</span>
          </div>
        </header>

        <div className={`content${sectionList.length ? ' has-secondary' : ''}`}>
          {sectionList.length ? (
            <aside className="secondary-nav">
              <div className="secondary-title">{activeModule.breadcrumb ?? activeModule.label}</div>
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
            </aside>
          ) : null}

          <section className="stage">
            {tabList.length ? (
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
            <div className="stage-body">{children}</div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default CasLayout
