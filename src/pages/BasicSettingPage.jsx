import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FeatureInfoCard from '../components/FeatureInfoCard'
import TimePickerModal from '../components/TimePickerModal'
import AttentionModal from '../components/AttentionModal'
import {
  queryRealvalByLongNames,
  readOperationLogs,
  resetParameter,
  restoreOriginal,
  savePLCPointEFData,
  writePLCPointEFData,
  writeRealvalByLongNames,
} from '../api/modules/settings'
import dateIcon from '../assets/icons/date.svg'
import './BasicSettingPage.css'

const DATE_YEARS = [2022, 2023, 2024, 2025, 2026, 2027, 2028]
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)
const DAYS = Array.from({ length: 31 }, (_, index) => index + 1)
const HOURS = Array.from({ length: 24 }, (_, index) => index)
const MINUTES = Array.from({ length: 60 }, (_, index) => index)
const SECONDS = Array.from({ length: 60 }, (_, index) => index)

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
  },
  {
    id: 'plc-restart',
    title: '重启PLC',
    description: '',
    icon: 'restart',
  },
]

const LONG_NAME_SYSTEM_STATUS = 'Sys\\FinforWorx\\SystemStatus'
const LONG_NAME_LOCK_STATUS = 'Sys\\FinforWorx\\LockStatus'

function isWriteSuccess(response) {
  return String(response?.data?.data?.state ?? '') === 'success'
}

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

  if (type === 'restart') {
    return (
      <svg viewBox="0 0 24 24" className="basic-setting-page__action-icon" aria-hidden="true">
        <path d="M4 11a8 8 0 0 1 13.6-5.7L20 8" />
        <path d="M20 8V3" />
        <path d="M20 13a8 8 0 0 1-13.6 5.7L4 16" />
        <path d="M4 16v5" />
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
  const navigate = useNavigate()
  const [confirmAction, setConfirmAction] = useState(null)
  const [systemStatusValue, setSystemStatusValue] = useState('0')
  const [loadingActionId, setLoadingActionId] = useState('')
  const [attentionConfig, setAttentionConfig] = useState({
    open: false,
    title: '提示',
    message: '',
    showCancel: false,
    confirmText: '确定',
    cancelText: '取消',
    onConfirm: null,
    onCancel: null,
    isLoading: false,
    loadingText: '处理中...',
  })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const response = await queryRealvalByLongNames(LONG_NAME_SYSTEM_STATUS)
        const value = String(response?.data?.data?.[LONG_NAME_SYSTEM_STATUS] ?? '0')
        if (!cancelled) {
          setSystemStatusValue(value === '1' ? '1' : '0')
        }
      } catch {
        if (!cancelled) {
          setSystemStatusValue('0')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleActionClick = (action) => {
    setConfirmAction(action)
  }

  const handleCloseConfirm = () => {
    if (loadingActionId) {
      return
    }
    setConfirmAction(null)
  }

  const openAlert = (message) => {
    setAttentionConfig({
      open: true,
      title: '提示',
      message,
      showCancel: false,
      confirmText: '我知道了',
      cancelText: '取消',
      onConfirm: null,
      onCancel: null,
      isLoading: false,
      loadingText: '处理中...',
    })
  }

  const closeAttention = () => {
    setAttentionConfig((previous) => ({ ...previous, open: false }))
  }

  const handleConfirm = async () => {
    if (!confirmAction || loadingActionId) {
      return
    }
    setLoadingActionId(confirmAction.id)
    try {
      if (confirmAction.id === 'parameter-reset') {
        const response = await resetParameter()
        openAlert(response?.data?.success ? '保存成功' : '保存失败')
      } else if (confirmAction.id === 'factory-reset') {
        const response = await restoreOriginal()
        if (response?.data?.success) {
          setConfirmAction(null)
          navigate('/auth/set-password')
          return
        }
        openAlert('执行失败')
      } else if (confirmAction.id === 'system-shutdown') {
        const nextValue = systemStatusValue === '1' ? '0' : '1'
        const response = await writeRealvalByLongNames({
          [LONG_NAME_SYSTEM_STATUS]: nextValue,
        })
        if (isWriteSuccess(response)) {
          setSystemStatusValue(nextValue)
          openAlert('保存成功')
        } else {
          openAlert('保存失败')
        }
      } else if (confirmAction.id === 'plc-restart') {
        setAttentionConfig({
          open: true,
          title: '提示',
          message: '',
          showCancel: false,
          confirmText: '确定',
          cancelText: '取消',
          onConfirm: null,
          onCancel: null,
          isLoading: true,
          loadingText: '正在保存数据中...',
        })
        const saveResponse = await savePLCPointEFData()
        const saveState = String(saveResponse?.data?.data?.state ?? '')
        if (saveState !== 'success') {
          openAlert('保存失败')
          return
        }
        setAttentionConfig({
          open: true,
          title: '下置EF数据',
          message: 'PLC测点EF数据保存成功，请重启PLC。\n重启完成后点击确定，下置保存的EF数据',
          showCancel: true,
          confirmText: '确定',
          cancelText: '取消',
          onConfirm: async () => {
            setAttentionConfig({
              open: true,
              title: '提示',
              message: '',
              showCancel: false,
              confirmText: '确定',
              cancelText: '取消',
              onConfirm: null,
              onCancel: null,
              isLoading: true,
              loadingText: '下置数据中...',
            })
            try {
              const writeResponse = await writePLCPointEFData()
              if (String(writeResponse?.data?.data?.state ?? '') === 'success') {
                openAlert('下置成功')
              } else {
                openAlert('下置失败')
              }
            } catch {
              openAlert('下置失败')
            }
          },
          onCancel: closeAttention,
          isLoading: false,
          loadingText: '处理中...',
        })
        return
      }
    } catch {
      openAlert('操作失败，请检查网络')
    } finally {
      setLoadingActionId('')
      setConfirmAction(null)
    }
  }

  const visibleActions = RESET_ACTIONS.map((action) => {
    if (action.id !== 'system-shutdown') {
      return action
    }
    return {
      ...action,
      title: systemStatusValue === '1' ? '系统关机' : '系统开机',
    }
  })

  return (
    <div className="basic-setting-page basic-setting-page--system-reset">
      <div className="basic-setting-page__action-grid">
        {visibleActions.map((action) => (
          <button
            type="button"
            key={action.id}
            className="basic-setting-page__action-button"
            onClick={() => handleActionClick(action)}
            disabled={Boolean(loadingActionId)}
          >
            {!action.description ? (
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
        isLoading={Boolean(loadingActionId)}
        loadingText="执行中..."
        onClose={handleCloseConfirm}
        onConfirm={handleConfirm}
        onCancel={handleCloseConfirm}
      />

      <AttentionModal
        isOpen={attentionConfig.open}
        title={attentionConfig.title}
        message={attentionConfig.message}
        confirmText={attentionConfig.confirmText}
        cancelText={attentionConfig.cancelText}
        showCancel={attentionConfig.showCancel}
        onClose={closeAttention}
        onConfirm={attentionConfig.onConfirm ?? closeAttention}
        onCancel={attentionConfig.onCancel ?? closeAttention}
        isLoading={attentionConfig.isLoading}
        loadingText={attentionConfig.loadingText}
      />
    </div>
  )
}

function DeviceLockView() {
  const navigate = useNavigate()
  const [isDeviceLocked, setIsDeviceLocked] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attentionMessage, setAttentionMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const response = await queryRealvalByLongNames(LONG_NAME_LOCK_STATUS)
        const lockValue = String(response?.data?.data?.[LONG_NAME_LOCK_STATUS] ?? '0')
        if (!cancelled) {
          setIsDeviceLocked(lockValue === '1')
        }
      } catch {
        if (!cancelled) {
          setIsDeviceLocked(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleClick = () => {
    setShowConfirm(true)
  }

  const handleCloseConfirm = () => {
    if (isSubmitting) {
      return
    }
    setShowConfirm(false)
  }

  const handleConfirm = async () => {
    if (isSubmitting) {
      return
    }
    const nextValue = isDeviceLocked ? '0' : '1'
    setIsSubmitting(true)
    try {
      const response = await writeRealvalByLongNames({
        [LONG_NAME_LOCK_STATUS]: nextValue,
      })
      if (!isWriteSuccess(response)) {
        setAttentionMessage('操作失败')
        return
      }
      if (nextValue === '1') {
        navigate('/auth/login', { state: { deviceLocked: true } })
        return
      }
      setIsDeviceLocked(false)
      setAttentionMessage('解锁成功')
    } catch {
      setAttentionMessage('操作失败，请检查网络')
    } finally {
      setIsSubmitting(false)
      setShowConfirm(false)
    }
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
            {!isDeviceLocked ? (
              <>
                <br />
                系统锁机中，防冻功能正常运行，现场请勿断电；
                <br />
                如断电导致系统冻坏，后果由断电方承担。
              </>
            ) : null}
          </>
        }
        confirmText="确定"
        showCancel
        isLoading={isSubmitting}
        loadingText="操作中..."
        onClose={handleCloseConfirm}
        onConfirm={handleConfirm}
        onCancel={handleCloseConfirm}
      />
      <AttentionModal
        isOpen={Boolean(attentionMessage)}
        title="提示"
        message={attentionMessage}
        confirmText="我知道了"
        showCancel={false}
        onClose={() => setAttentionMessage('')}
        onConfirm={() => setAttentionMessage('')}
      />
    </div>
  )
}

const DATE_PICKER_COLUMNS = [
  { key: 'year', options: DATE_YEARS, formatter: (value) => String(value) },
  { key: 'month', options: MONTHS, formatter: (value) => formatTwoDigits(value) },
  { key: 'day', options: DAYS, formatter: (value) => formatTwoDigits(value) },
  { key: 'hour', options: HOURS, formatter: (value) => formatTwoDigits(value) },
  { key: 'minute', options: MINUTES, formatter: (value) => formatTwoDigits(value) },
  { key: 'second', options: SECONDS, formatter: (value) => formatTwoDigits(value) },
]

function formatDateTimeDisplay(value) {
  if (!Array.isArray(value) || value.length < 6) return null
  return `${value[0]}.${formatTwoDigits(value[1])}.${formatTwoDigits(value[2])} ${formatTwoDigits(value[3])}:${formatTwoDigits(value[4])}:${formatTwoDigits(value[5])}`
}

function formatDateTimeForApi(value) {
  if (!Array.isArray(value) || value.length < 6) return ''
  return `${value[0]}-${formatTwoDigits(value[1])}-${formatTwoDigits(value[2])} ${formatTwoDigits(value[3])}:${formatTwoDigits(value[4])}:${formatTwoDigits(value[5])}`
}

function getNowDateTimeParts() {
  const now = new Date()
  return [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()]
}

function getTodayStartDateTimeParts() {
  const now = new Date()
  return [now.getFullYear(), now.getMonth() + 1, now.getDate(), 0, 0, 0]
}

function normalizeLogRow(source, index) {
  return {
    id: source?.id ?? `${source?.operation_datetime ?? 'row'}-${index}`,
    time: source?.operation_datetime ?? '--',
    type: source?.operation_type ?? '--',
    operator: source?.operator_uuid ?? '--',
    action: source?.operation_content ?? '--',
  }
}

function OperationLogView() {
  const [startDate, setStartDate] = useState(() => getTodayStartDateTimeParts())
  const [endDate, setEndDate] = useState(() => getNowDateTimeParts())
  const [activePickerKey, setActivePickerKey] = useState('')
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [limit] = useState(9)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const hasLoadedOnEnterRef = useRef(false)

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const fetchLogs = async (nextPage = 1) => {
    setLoading(true)
    try {
      const response = await readOperationLogs({
        start: formatDateTimeForApi(startDate),
        end: formatDateTimeForApi(endDate),
        page: String(nextPage),
        limit: String(limit),
      })
      const payload = response?.data?.data ?? response?.data ?? {}
      const nextRows = Array.isArray(payload?.operationLog)
        ? payload.operationLog.map((item, index) => normalizeLogRow(item, index))
        : []
      const nextPageValue = Number(payload?.page) || nextPage
      const nextTotalValue = Number(payload?.total) || 0
      setRows(nextRows)
      setPage(nextPageValue)
      setTotal(nextTotalValue)
    } catch (error) {
      console.error('readOperationLogs failed:', error)
      setRows([])
      setTotal(0)
      setPage(nextPage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasLoadedOnEnterRef.current) {
      return
    }
    hasLoadedOnEnterRef.current = true
    fetchLogs(1)
  }, [])

  const pickerMap = {
    start: {
      title: '选择开始时间',
      columns: DATE_PICKER_COLUMNS,
      value: startDate,
      onConfirm: setStartDate,
    },
    end: {
      title: '选择结束时间',
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
          <span>{formatDateTimeDisplay(startDate) ?? '请选择日期时间'}</span>
          <CalendarIcon />
        </button>
        <span className="basic-setting-page__range-sep">-</span>
        <button
          type="button"
          className={`basic-setting-page__datetime-input ${endDate ? 'is-filled' : 'is-empty'}`}
          onClick={() => setActivePickerKey('end')}
        >
          <span>{formatDateTimeDisplay(endDate) ?? '请选择日期时间'}</span>
          <CalendarIcon />
        </button>
        <button
          type="button"
          className="basic-setting-page__search-button"
          onClick={() => fetchLogs(1)}
          disabled={loading}
        >
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
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.time}</td>
                <td>{row.type}</td>
                <td>{row.operator}</td>
                <td>{row.action}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4}>{loading ? '加载中...' : '暂无操作日志'}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="basic-setting-page__pagination">
        <button
          type="button"
          className="basic-setting-page__page-button"
          disabled={loading || page <= 1}
          onClick={() => fetchLogs(page - 1)}
        >
          上一页
        </button>
        <span className="basic-setting-page__page-info">
          第 {page} / {totalPages} 页
        </span>
        <button
          type="button"
          className="basic-setting-page__page-button"
          disabled={loading || page >= totalPages}
          onClick={() => fetchLogs(page + 1)}
        >
          下一页
        </button>
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
