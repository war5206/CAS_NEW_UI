import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import AttentionModal from '../components/AttentionModal'
import casLogo from '../assets/brand/cas-logo.png'
import userAvatar from '../assets/layout/user_avatar.png'
import iconPower from '../assets/layout/boot.svg'
import iconHasAlert from '../assets/layout/hasAlert.svg'
import iconNoAlert from '../assets/layout/no-alert.svg'
import { buildTabPath, getModuleDefaultPath, getSectionDefaultPath, modules } from '../config/navigation'
import { ignoreAllAlerts, useAlertsStore } from '@/features/alerts/store/alertsStore'

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

function CasLayout({
  routeInfo,
  children,
  homePageTitle,
  unsavedGuard,
  hideSecondaryNav = false,
  hideModuleTabs = false,
  extraBreadcrumbLabel = null,
}) {
  const navigate = useNavigate()
  const [now, setNow] = useState(() => new Date())
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false)
  const [pendingPrimaryNavTarget, setPendingPrimaryNavTarget] = useState(null)
  const [isSystemPoweredOn, setIsSystemPoweredOn] = useState(true)
  const [pendingPowerAction, setPendingPowerAction] = useState(null)
  const activeModule = routeInfo.module
  const activeSection = routeInfo.section
  const activeTab = routeInfo.tab
  const isHomeLayout = activeModule.id === 'home'
  const isMonitorLayout = activeModule.id === 'monitor'
  const { liveRows: activeAlerts, ignored: isAlertIgnored } = useAlertsStore()

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
    if (!isHomeLayout && extraBreadcrumbLabel) {
      items.push(extraBreadcrumbLabel)
    }
    return items
  }, [activeModule, activeSection, activeTab, extraBreadcrumbLabel, homePageTitle, isHomeLayout])

  const sectionList = activeModule.sections ?? []
  const tabList = activeSection?.tabs ?? []
  const showSecondaryNav = !hideSecondaryNav && (sectionList.length > 0 || !isHomeLayout)
  const hasTabs = !hideModuleTabs && tabList.length > 0
  const hasActiveAlerts = activeAlerts.length > 0 && !isAlertIgnored
  const alertIcon = hasActiveAlerts ? iconHasAlert : iconNoAlert
  const alertIconClassName = hasActiveAlerts ? 'is-has-alert' : 'is-no-alert'
  const { dateLabel, timeLabel } = formatDateTime(now)

  const alertIndicator = (
    <button
      type="button"
      className="alert-indicator"
      title={hasActiveAlerts ? '查看告警' : '当前无告警'}
      onClick={() => setIsAlertModalOpen(true)}
    >
      <img src={alertIcon} alt="" aria-hidden="true" className={alertIconClassName} />
    </button>
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
  const powerButtonTitle = isSystemPoweredOn ? '一键关机' : '一键开机'
  const powerConfirmTitle = isSystemPoweredOn ? '确认关机' : '确认开机'
  const powerConfirmMessage = isSystemPoweredOn ? '确认关闭系统吗？' : '确认开启系统吗？'

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
              onClick={(event) => {
                const shouldConfirm = unsavedGuard?.active && module.id !== 'settings'
                if (!shouldConfirm) {
                  return
                }

                event.preventDefault()
                setPendingPrimaryNavTarget({
                  to: getModuleDefaultPath(module),
                  message: unsavedGuard?.message || '当前内容未保存，是否退出？',
                })
              }}
            >
              <img src={module.icon} alt="" aria-hidden="true" />
              <span>{module.label}</span>
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className={`power-button${isSystemPoweredOn ? '' : ' is-off'}`}
          aria-label={powerButtonTitle}
          title={powerButtonTitle}
          onClick={() => setPendingPowerAction(isSystemPoweredOn ? 'shutdown' : 'startup')}
        >
          <img src={iconPower} alt="" aria-hidden="true" />
        </button>
      </aside>

      {isMonitorLayout ? (
        <div className="main is-module-layout">
          <div className="monitor-layout-content">{children}</div>
        </div>
      ) : (
        <div className={`main${isHomeLayout ? '' : ' is-module-layout'}`}>
          {isHomeLayout ? (
            <header className="top-bar">
              {alertIndicator}
              {breadcrumb}
              {dateTime}
            </header>
          ) : null}

          <div className={`content${showSecondaryNav ? ' has-secondary' : ''}${!isHomeLayout ? ' is-module-layout' : ''}`}>
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
                        {section.icon ? <img className="secondary-item-icon" src={section.icon} alt="" aria-hidden="true" /> : null}
                        <span className="secondary-item-label">{section.label}</span>
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
      )}

      {isAlertModalOpen ? (
        <div className="alert-preview-modal__backdrop" onClick={() => setIsAlertModalOpen(false)}>
          <section className="alert-preview-modal" onClick={(event) => event.stopPropagation()}>
            <header className="alert-preview-modal__header">
              <h3>故障提示</h3>
              <button type="button" aria-label="关闭" onClick={() => setIsAlertModalOpen(false)}>
                ×
              </button>
            </header>

            <div className="alert-preview-modal__body">
              <div className="alert-preview-modal__title">系统报警（{activeAlerts.length}）</div>

              <div className="alert-preview-modal__list">
                {activeAlerts.length === 0 ? (
                  <div className="alert-preview-modal__empty">当前暂无系统报警</div>
                ) : (
                  activeAlerts.map((item) => (
                    <article key={item.id} className="alert-preview-modal__item">
                      <span className="alert-preview-modal__badge">!</span>
                      <span>{item.alarmName}</span>
                    </article>
                  ))
                )}
              </div>
            </div>

            <footer className="alert-preview-modal__footer">
              <button
                type="button"
                className="alert-preview-modal__action is-muted"
                onClick={() => {
                  ignoreAllAlerts()
                  setIsAlertModalOpen(false)
                }}
              >
                全部忽略
              </button>
              <button
                type="button"
                className="alert-preview-modal__action"
                onClick={() => {
                  setIsAlertModalOpen(false)
                  navigate('/alerts/system-alarm')
                }}
              >
                查看全部
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      <AttentionModal
        isOpen={Boolean(pendingPrimaryNavTarget)}
        title="确认退出"
        message={pendingPrimaryNavTarget?.message ?? ''}
        confirmText="确定"
        cancelText="取消"
        showCancel
        onClose={() => setPendingPrimaryNavTarget(null)}
        onCancel={() => setPendingPrimaryNavTarget(null)}
        onConfirm={() => {
          const target = pendingPrimaryNavTarget
          setPendingPrimaryNavTarget(null)
          if (target?.to) {
            navigate(target.to)
          }
        }}
      />

      <AttentionModal
        isOpen={Boolean(pendingPowerAction)}
        title={powerConfirmTitle}
        message={powerConfirmMessage}
        confirmText="确定"
        cancelText="取消"
        showCancel
        onClose={() => setPendingPowerAction(null)}
        onCancel={() => setPendingPowerAction(null)}
        onConfirm={() => {
          setIsSystemPoweredOn((previous) => !previous)
          setPendingPowerAction(null)
        }}
      />
    </div>
  )
}

export default CasLayout
