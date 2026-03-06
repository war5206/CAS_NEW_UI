import './BasicSettingPage.css'

const RESET_ACTIONS = [
  {
    id: 'parameter-reset',
    title: '参数复位',
    description: '采集数据恢复默认值，配置数据',
    icon: 'refresh',
  },
  {
    id: 'factory-reset',
    title: '恢复出厂设置',
    description: '采集数据恢复默认值并清空所有历史数据',
    icon: 'factory',
  },
  {
    id: 'system-shutdown',
    title: '系统关机',
    description: '',
    icon: 'power',
    fullWidth: true,
  },
]

const OPERATION_LOG_ROWS = [
  {
    time: '2024年6月1日 17:59:42',
    type: '登录',
    operator: '管理员',
    action: '气候补偿开启',
  },
  {
    time: '2024年6月1日 17:59:42',
    type: '下置',
    operator: '管理员',
    action: '智能定时模式设置定时段一',
  },
  {
    time: '',
    type: '',
    operator: '',
    action: '',
  },
  {
    time: '',
    type: '',
    operator: '',
    action: '',
  },
]

function ActionIcon({ type }) {
  if (type === 'power') {
    return (
      <svg viewBox="0 0 24 24" className="basic-setting-page__action-icon" aria-hidden="true">
        <path d="M12 2v8" />
        <path d="M6.2 5.6a9 9 0 1 0 11.6 0" />
      </svg>
    )
  }

  if (type === 'refresh') {
    return (
      <svg viewBox="0 0 24 24" className="basic-setting-page__action-icon" aria-hidden="true">
        <path d="M20 5v5h-5" />
        <path d="M4 19v-5h5" />
        <path d="M19 10a7 7 0 0 0-12-3" />
        <path d="M5 14a7 7 0 0 0 12 3" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="basic-setting-page__action-icon" aria-hidden="true">
      <rect x="4" y="3.5" width="16" height="17" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h8" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="basic-setting-page__calendar-icon" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2.5v3M16 2.5v3M3 9h18" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="basic-setting-page__lock-icon" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
      <circle cx="12" cy="16" r="1.4" />
    </svg>
  )
}

function SystemResetView() {
  return (
    <div className="basic-setting-page basic-setting-page--system-reset">
      <div className="basic-setting-page__action-grid">
        {RESET_ACTIONS.map((action) => (
          <button
            type="button"
            key={action.id}
            className={`basic-setting-page__action-button${action.fullWidth ? ' is-full' : ''}`}
          >
            {action.icon === 'power' ? (
              <span className="basic-setting-page__shutdown-title-wrap">
                <ActionIcon type={action.icon} />
                <span>{action.title}</span>
              </span>
            ) : (
              <>
                <h3>{action.title}</h3>
                {action.description ? <p>{action.description}</p> : null}
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function DeviceLockView() {
  return (
    <div className="basic-setting-page basic-setting-page--device-lock">
      <button type="button" className="basic-setting-page__lock-card" aria-pressed="true">
        <div className="basic-setting-page__lock-left">
          <div className="basic-setting-page__lock-icon-wrap">
            <LockIcon />
          </div>
          <h3>设备锁定</h3>
        </div>
        <span className="basic-setting-page__lock-selected">✓</span>
      </button>
    </div>
  )
}

function OperationLogView() {
  return (
    <div className="basic-setting-page basic-setting-page--operation-log">
      <div className="basic-setting-page__filter-row">
        <span className="basic-setting-page__filter-label">时间范围：</span>
        <button type="button" className="basic-setting-page__datetime-input is-filled">
          <span>2024.06.01 17:50:00</span>
          <CalendarIcon />
        </button>
        <span className="basic-setting-page__range-sep">-</span>
        <button type="button" className="basic-setting-page__datetime-input is-empty">
          <span>请选择时间</span>
          <CalendarIcon />
        </button>
        <button type="button" className="basic-setting-page__search-button">
          查询
        </button>
      </div>

      <div className="basic-setting-page__table-wrap">
        <table className="basic-setting-page__table">
          <thead>
            <tr>
              <th>时间</th>
              <th>日志类型</th>
              <th>记录人</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {OPERATION_LOG_ROWS.map((row, index) => (
              <tr key={`${row.time}-${index}`}>
                <td>{row.time}</td>
                <td>{row.type}</td>
                <td>{row.operator}</td>
                <td>{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BasicSettingPage({ tabId }) {
  if (tabId === 'system-reset') {
    return <SystemResetView />
  }

  if (tabId === 'device-lock') {
    return <DeviceLockView />
  }

  if (tabId === 'operation-log') {
    return <OperationLogView />
  }

  return (
    <div className="placeholder-card module-placeholder">
      <div className="placeholder-title">系统参数</div>
      <div className="placeholder-note">当前页面内容暂未实现。</div>
    </div>
  )
}

export default BasicSettingPage
