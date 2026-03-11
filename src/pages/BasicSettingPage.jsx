import { useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import TimePickerModal from '../components/TimePickerModal'
import AttentionModal from '../components/AttentionModal'
import dateIcon from '../assets/icons/date.svg'
import './BasicSettingPage.css'

const DATE_YEARS = [2022, 2023, 2024, 2025, 2026, 2027, 2028]
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)
const DAYS = Array.from({ length: 31 }, (_, index) => index + 1)

function formatTwoDigits(value) {
  return String(value).padStart(2, '0')
}

const RESET_ACTIONS = [
  {
    id: 'parameter-reset',
    title: '参数复位',
    description: '恢复默认参数配置，保留当前系统数据。',
    icon: 'refresh',
  },
  {
    id: 'factory-reset',
    title: '恢复出厂设置',
    description: '恢复默认参数配置，并清空所有历史数据。',
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
    time: '2026年03月14日 17:59:42',
    type: '下发',
    operator: '管理员',
    action: '气候补偿开启',
  },
  {
    time: '2026年03月15日 14:23:00',
    type: '下发',
    operator: '管理员',
    action: '智能定时模式定时段一开启',
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
  return <img src={dateIcon} alt="calendar" className="basic-setting-page__calendar-icon" />
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
  const [confirmAction, setConfirmAction] = useState(null)

  const handleActionClick = (action) => {
    setConfirmAction(action)
  }

  const handleCloseConfirm = () => {
    setConfirmAction(null)
  }

  const handleConfirm = () => {
    // TODO: 在此处触发具体的系统重置/关机指令
    setConfirmAction(null)
  }

  return (
    <div className="basic-setting-page basic-setting-page--system-reset">
      <div className="basic-setting-page__action-grid">
        {RESET_ACTIONS.map((action) => (
          <button
            type="button"
            key={action.id}
            className={`basic-setting-page__action-button${action.fullWidth ? ' is-full' : ''}`}
            onClick={() => handleActionClick(action)}
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

      <AttentionModal
        isOpen={Boolean(confirmAction)}
        title="确认操作"
        message={
          confirmAction ? (
            <>
              确定要执行
              <span className="attention-modal__highlight">{confirmAction.title}</span>
              吗？
            </>
          ) : (
            ''
          )
        }
        confirmText="确定"
        showCancel
        onClose={handleCloseConfirm}
        onConfirm={handleConfirm}
        onCancel={handleCloseConfirm}
      />
    </div>
  )
}

function DeviceLockView() {
  const [isDeviceLocked, setIsDeviceLocked] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleClick = () => {
    setShowConfirm(true)
  }

  const handleCloseConfirm = () => {
    setShowConfirm(false)
  }

  const handleConfirm = () => {
    setIsDeviceLocked((previous) => !previous)
    setShowConfirm(false)
  }

  const confirmActionName = isDeviceLocked ? '解锁设备' : '锁定设备'

  return (
    <div className="basic-setting-page basic-setting-page--device-lock">
      <FeatureInfoCard
        icon={<LockIcon />}
        title="设备锁定"
        description="开启时，终端设备操作将被锁定"
        selected={isDeviceLocked}
        onClick={handleClick}
        className="basic-setting-page__device-lock-card"
      />

      <AttentionModal
        isOpen={showConfirm}
        title="确认操作"
        message={
          <>
            确定要
            <span className="attention-modal__highlight">{confirmActionName}</span>
            吗？
          </>
        }
        confirmText="确定"
        showCancel
        onClose={handleCloseConfirm}
        onConfirm={handleConfirm}
        onCancel={handleCloseConfirm}
      />
    </div>
  )
}

const DATE_PICKER_COLUMNS = [
  { key: 'year', options: DATE_YEARS, formatter: (value) => String(value) },
  { key: 'month', options: MONTHS, formatter: (value) => formatTwoDigits(value) },
  { key: 'day', options: DAYS, formatter: (value) => formatTwoDigits(value) },
]

function formatDateDisplay(value) {
  if (!Array.isArray(value) || value.length < 3) return null
  return `${value[0]}.${formatTwoDigits(value[1])}.${formatTwoDigits(value[2])}`
}

function OperationLogView() {
  const [startDate, setStartDate] = useState([2026, 3, 13])
  const [endDate, setEndDate] = useState([2026, 3, 16])
  const [activePickerKey, setActivePickerKey] = useState('')

  const pickerMap = {
    start: {
      title: '选择开始日期',
      columns: DATE_PICKER_COLUMNS,
      value: startDate,
      onConfirm: setStartDate,
    },
    end: {
      title: '选择结束日期',
      columns: DATE_PICKER_COLUMNS,
      value: endDate ?? startDate,
      onConfirm: setEndDate,
    },
  }

  const activePicker = pickerMap[activePickerKey] ?? null

  return (
    <div className="basic-setting-page basic-setting-page--operation-log">
      <div className="basic-setting-page__filter-row">
        <span className="basic-setting-page__filter-label">时间范围：</span>
        <button
          type="button"
          className={`basic-setting-page__datetime-input ${startDate ? 'is-filled' : 'is-empty'}`}
          onClick={() => setActivePickerKey('start')}
        >
          <span>{formatDateDisplay(startDate) ?? '请选择日期'}</span>
          <CalendarIcon />
        </button>
        <span className="basic-setting-page__range-sep">-</span>
        <button
          type="button"
          className={`basic-setting-page__datetime-input ${endDate ? 'is-filled' : 'is-empty'}`}
          onClick={() => setActivePickerKey('end')}
        >
          <span>{formatDateDisplay(endDate) ?? '请选择日期'}</span>
          <CalendarIcon />
        </button>
        <button type="button" className="basic-setting-page__search-button">
          查询
        </button>
      </div>

      <TimePickerModal
        isOpen={Boolean(activePicker)}
        title={activePicker?.title}
        columns={activePicker?.columns}
        value={activePicker?.value}
        onClose={() => setActivePickerKey('')}
        onConfirm={(nextValue) => {
          activePicker?.onConfirm(nextValue)
          setActivePickerKey('')
        }}
      />

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
