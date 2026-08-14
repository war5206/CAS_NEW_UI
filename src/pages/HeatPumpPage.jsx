import { useCallback, useEffect, useMemo, useState } from 'react'
import AttentionModal from '../components/AttentionModal'
import FeatureInfoCard from '../components/FeatureInfoCard'
import SliderSettingRow from '../components/SliderSettingRow'
import SelectDropdown from '../components/SelectDropdown'
import { adaptHeatPumpParam } from '../api/adapters/home'
import { queryHeatPumpParam } from '../api/modules/home'
import {
  queryHeatPumpSelect,
  queryRealvalByLongNames,
  writeRealvalByLongNames,
} from '../api/modules/settings'
import { HEAT_PUMP_STATUS, HEAT_PUMP_STATUS_LABEL } from '../config/homeHeatPumps'
import {
  getUnitCompactDisplayName,
  getUnitDisplayName,
  isHeatPumpModuleDeviceCode,
  parseUnitDeviceCodeLoose,
  toUnitDeviceCode,
} from '../config/projectUnitDevices'
import { extractRealvalMap } from '../utils/realvalMap'
import { isWriteSuccess, useWriteWithDelayedVerify } from '../hooks/useWriteWithDelayedVerify'
import { useUnitDeviceStatusPoll } from '../hooks/useUnitDeviceStatusPoll'
import groupControlIcon from '../assets/heat-pump/heat-pump-group-control.svg'
import defrostingIcon from '../assets/heat-pump/hp-modal-defrosting.svg'
import malfunctionIcon from '../assets/heat-pump/hp-modal-malfunction.svg'
import runningIcon from '../assets/heat-pump/hp-modal-running.svg'
import standbyIcon from '../assets/heat-pump/hp-modal-shutdown.svg'
import checkMarkIcon from '../assets/icons/check-mark.svg'
import './HeatPumpPage.css'

const FALLBACK_HEAT_PUMP_DEVICE_CODES = ['No1']
const DEVICE_LABEL = '热泵'
const DEFAULT_SELECTED_CODE = 'No1'

function getDefaultHeatPumpDeviceIds() {
  return []
}

function getDefaultHeatPumpDeviceCodes() {
  return [...FALLBACK_HEAT_PUMP_DEVICE_CODES]
}

function getDefaultSelectOptions() {
  const ids = getDefaultHeatPumpDeviceIds()
  if (ids.length > 0) {
    return ids.map((id) => ({
      value: toUnitDeviceCode(id),
      label: getUnitDisplayName(id),
    }))
  }
  return FALLBACK_HEAT_PUMP_DEVICE_CODES.map((code) => {
    const id = parseUnitDeviceCodeLoose(code)
    return {
      value: code,
      label: id != null ? getUnitDisplayName(id) : DEVICE_LABEL,
    }
  })
}

/** 单台 / 批量共用：按 HeatPump\SJMG\NoX\{suffix} 拼点位 */
const FIXED_DEVICE_PARAM_ROWS = [
  { id: 'heatSetpoint', pointSuffix: 'Heat_Setpoint', label: '制热设定温度（℃）', min: 20, max: 60, step: 1, suffix: '℃' },
  { id: 'coldSetpoint', pointSuffix: 'Cold_Setpoint', label: '制冷设定温度（℃）', min: 7, max: 20, step: 1, suffix: '℃' },
  { id: 'diffValue', pointSuffix: 'Diff_Value', label: '回差值（℃）', min: 0, max: 5, step: 1, suffix: '℃' },
  { id: 'htfMax', pointSuffix: 'HTF_Max', label: '目标频率上限（Hz）', min: 0, max: 150, step: 1, suffix: 'Hz' },
]

/** 仅批量控制：系统级统一点位 */
const LN_HPYXBH1 = 'Sys\\FinforWorx\\HPYXBH1'
const LN_HPYXBH2 = 'Sys\\FinforWorx\\HPYXBH2'

const PROTECTION_PARAM_ROWS = [
  {
    id: 'runProtectionJudge',
    systemLongName: LN_HPYXBH1,
    label: '热泵持续运行保护判断时长（h）',
    min: 0,
    max: 50,
    step: 1,
    suffix: 'h',
  },
  {
    id: 'shutdownProtection',
    systemLongName: LN_HPYXBH2,
    label: '热泵运行保护停机时长（min）',
    min: 0,
    max: 60,
    step: 1,
    suffix: 'min',
  },
]

function buildHeatPumpPointLongName(deviceCode, pointSuffix) {
  return `HeatPump\\SJMG\\${deviceCode}\\${pointSuffix}`
}

function buildFixedParamLongNames(deviceCodes, pointSuffix) {
  return deviceCodes.map((deviceCode) => buildHeatPumpPointLongName(deviceCode, pointSuffix)).filter(Boolean)
}

function filterDeviceCodes(codes) {
  return codes.filter((code) => isHeatPumpModuleDeviceCode(code))
}

function normalizeDeviceCodes(selectList) {
  if (!Array.isArray(selectList)) return getDefaultHeatPumpDeviceCodes()
  const codes = filterDeviceCodes(
    selectList.map((item) => toDisplayValue(item?.value, '')).filter(Boolean),
  )
  return codes.length ? codes : getDefaultHeatPumpDeviceCodes()
}

const DEFAULT_METRICS = []
const POLL_INTERVAL_MS = 10_000
const GROUP_WRITE_BATCH_SIZE = 5

const DEFAULT_DEVICE_RUNTIME = {
  status: HEAT_PUMP_STATUS.SHUTDOWN,
  state: '',
  alarm: false,
  run: false,
  defrost: false,
}

const DEVICE_STATUS_ICON_MAP = {
  [HEAT_PUMP_STATUS.RUNNING]: runningIcon,
  [HEAT_PUMP_STATUS.MALFUNCTION]: malfunctionIcon,
  [HEAT_PUMP_STATUS.DEFROSTING]: defrostingIcon,
  [HEAT_PUMP_STATUS.SHUTDOWN]: standbyIcon,
}

function toDisplayValue(value, fallback = '0') {
  if (value == null || value === '') return fallback
  return String(value)
}

function normalizeSelectOptions(selectList) {
  const fallbackOptions = getDefaultSelectOptions()
  if (!Array.isArray(selectList)) return fallbackOptions
  const options = selectList
    .map((item) => {
      const value = toDisplayValue(item?.value, '')
      const id = parseUnitDeviceCodeLoose(value)
      return {
        value,
        label: id != null && isHeatPumpModuleDeviceCode(value) ? getUnitDisplayName(id) : toDisplayValue(item?.title, DEVICE_LABEL),
      }
    })
    .filter((item) => item.value && isHeatPumpModuleDeviceCode(item.value))
  return options.length ? options : fallbackOptions
}

function HeatPumpPage() {
  const defaultOptions = useMemo(() => getDefaultSelectOptions(), [])

  const [attentionMessage, setAttentionMessage] = useState('')
  const [isInitialAttemptDone, setIsInitialAttemptDone] = useState(false)
  const [isGroupControlEnabled, setIsGroupControlEnabled] = useState(true)
  const [heatPumpOptions, setHeatPumpOptions] = useState(defaultOptions)
  const [selectedHeatPumpCode, setSelectedHeatPumpCode] = useState(DEFAULT_SELECTED_CODE)
  const [batchDeviceCodes, setBatchDeviceCodes] = useState(() => getDefaultHeatPumpDeviceCodes())
  const [parameters, setParameters] = useState({
    heatSetpoint: '50',
    coldSetpoint: '15',
    diffValue: '3',
    htfMax: '0',
    runProtectionJudge: '25',
    shutdownProtection: '30',
  })
  const [detailMetrics, setDetailMetrics] = useState(DEFAULT_METRICS)
  const [deviceRuntime, setDeviceRuntime] = useState(DEFAULT_DEVICE_RUNTIME)
  const polledDeviceRuntime = useUnitDeviceStatusPoll(selectedHeatPumpCode, {
    enabled: !isGroupControlEnabled && Boolean(selectedHeatPumpCode),
    intervalMs: POLL_INTERVAL_MS,
  })
  const displayDeviceRuntime = polledDeviceRuntime ?? deviceRuntime

  const activeParameterRows = useMemo(
    () => (isGroupControlEnabled ? [...FIXED_DEVICE_PARAM_ROWS, ...PROTECTION_PARAM_ROWS] : FIXED_DEVICE_PARAM_ROWS),
    [isGroupControlEnabled],
  )

  const getRowPollLongName = useCallback(
    (row) => {
      if (row.systemLongName) {
        return row.systemLongName
      }
      if (row.pointSuffix) {
        const deviceCode = isGroupControlEnabled ? batchDeviceCodes[0] : selectedHeatPumpCode
        if (!deviceCode) return null
        return buildHeatPumpPointLongName(deviceCode, row.pointSuffix)
      }
      return null
    },
    [batchDeviceCodes, isGroupControlEnabled, selectedHeatPumpCode],
  )

  const getRowWriteLongNames = useCallback(
    (row) => {
      if (row.systemLongName) {
        return [row.systemLongName]
      }
      if (row.pointSuffix) {
        const deviceCodes = isGroupControlEnabled ? batchDeviceCodes : [selectedHeatPumpCode]
        return buildFixedParamLongNames(deviceCodes.filter(Boolean), row.pointSuffix)
      }
      return []
    },
    [batchDeviceCodes, isGroupControlEnabled, selectedHeatPumpCode],
  )

  const onWriteNotify = useCallback((message) => {
    setAttentionMessage(message)
  }, [])

  const { performWrite, scheduleVerify, isMountedRef } = useWriteWithDelayedVerify({
    write: writeRealvalByLongNames,
    onNotify: onWriteNotify,
  })

  const updateParameter = (key, value) => {
    setParameters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const pollLongNames = useMemo(
    () => activeParameterRows.map((row) => getRowPollLongName(row)).filter(Boolean),
    [activeParameterRows, getRowPollLongName],
  )

  const applyRealvalMap = useCallback(
    (valueMap) => {
      if (!valueMap || !isMountedRef.current) return
      setParameters((prev) => {
        const next = { ...prev }
        let changed = false
        for (const row of activeParameterRows) {
          const longName = getRowPollLongName(row)
          if (!longName) continue
          if (!Object.prototype.hasOwnProperty.call(valueMap, longName)) continue
          const nextValue = toDisplayValue(valueMap[longName], prev[row.id])
          if (nextValue !== prev[row.id]) {
            next[row.id] = nextValue
            changed = true
          }
        }
        return changed ? next : prev
      })
    },
    [activeParameterRows, getRowPollLongName, isMountedRef],
  )

  const verifyLongNames = useCallback(
    async (longNames) => {
      if (!longNames?.length) return
      try {
        const response = await queryRealvalByLongNames(longNames)
        const valueMap = extractRealvalMap(response)
        applyRealvalMap(valueMap)
      } catch {
        // ignore
      }
    },
    [applyRealvalMap],
  )

  const loadGroupData = useCallback(async () => {
    try {
      const selectResponse = await queryHeatPumpSelect()
      const selectList = selectResponse?.data?.data?.selectList ?? []
      if (isMountedRef.current) {
        setBatchDeviceCodes(normalizeDeviceCodes(selectList))
        setIsInitialAttemptDone(true)
      }
    } catch {
      onWriteNotify(`${DEVICE_LABEL}批量参数获取失败`)
      if (isMountedRef.current) {
        setIsInitialAttemptDone(true)
      }
    }
  }, [isMountedRef, onWriteNotify])

  const applySingleDeviceDetail = useCallback((adapted, heatPumpCode) => {
    setDetailMetrics(
      adapted.details.map((item, index) => ({
        key: `${heatPumpCode}-${item.label}-${index}`,
        label: item.label,
        value: item.value,
      })),
    )
    setDeviceRuntime({
      status: adapted.status,
      state: adapted.state,
      alarm: adapted.alarm,
      run: adapted.run,
      defrost: adapted.defrost,
    })
  }, [])

  const loadSingleHeatPumpData = useCallback(
    async (heatPumpCode) => {
      if (!heatPumpCode) return
      try {
        const response = await queryHeatPumpParam({ code: heatPumpCode })
        const adapted = adaptHeatPumpParam(response?.data ?? response, { code: heatPumpCode })
        if (isMountedRef.current) {
          applySingleDeviceDetail(adapted, heatPumpCode)
          setIsInitialAttemptDone(true)
        }
      } catch {
        onWriteNotify(`${heatPumpCode}数据获取失败`)
        if (isMountedRef.current) {
          setIsInitialAttemptDone(true)
        }
      }
    },
    [applySingleDeviceDetail, isMountedRef, onWriteNotify],
  )

  const loadHeatPumpSelect = useCallback(async () => {
    try {
      const response = await queryHeatPumpSelect()
      const selectList = response?.data?.data?.selectList ?? []
      const options = normalizeSelectOptions(selectList)
      if (!isMountedRef.current) return
      setHeatPumpOptions(options)
      setSelectedHeatPumpCode((prev) => {
        const exists = options.some((item) => item.value === prev)
        if (exists) return prev
        return options.find((item) => item.value)?.value ?? options[0]?.value ?? ''
      })
    } catch {
      onWriteNotify(`${DEVICE_LABEL}下拉选项获取失败`)
    }
  }, [isMountedRef, onWriteNotify])

  useEffect(() => {
    setHeatPumpOptions(defaultOptions)
    setSelectedHeatPumpCode(DEFAULT_SELECTED_CODE)
    setBatchDeviceCodes(getDefaultHeatPumpDeviceCodes())
    setDetailMetrics(DEFAULT_METRICS)
    setDeviceRuntime(DEFAULT_DEVICE_RUNTIME)
    setIsInitialAttemptDone(false)
  }, [defaultOptions])

  useEffect(() => {
    if (isGroupControlEnabled) {
      loadGroupData()
      return
    }
    loadHeatPumpSelect()
  }, [isGroupControlEnabled, loadGroupData, loadHeatPumpSelect])

  useEffect(() => {
    if (isGroupControlEnabled) return
    if (!selectedHeatPumpCode) {
      setDetailMetrics(DEFAULT_METRICS)
      setDeviceRuntime(DEFAULT_DEVICE_RUNTIME)
      return
    }
    loadSingleHeatPumpData(selectedHeatPumpCode)
  }, [isGroupControlEnabled, loadSingleHeatPumpData, selectedHeatPumpCode])

  useEffect(() => {
    if (isGroupControlEnabled || !selectedHeatPumpCode) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      loadSingleHeatPumpData(selectedHeatPumpCode)
    }, POLL_INTERVAL_MS)

    return () => {
      window.clearInterval(timerId)
    }
  }, [isGroupControlEnabled, loadSingleHeatPumpData, selectedHeatPumpCode])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!pollLongNames.length) return
      try {
        const response = await queryRealvalByLongNames(pollLongNames)
        const valueMap = extractRealvalMap(response)
        if (!cancelled) {
          applyRealvalMap(valueMap)
          setIsInitialAttemptDone(true)
        }
      } catch {
        if (!cancelled) {
          setIsInitialAttemptDone(true)
        }
      }
    }
    run()
    const timerId = window.setInterval(run, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timerId)
    }
  }, [applyRealvalMap, pollLongNames])

  const writeGroupBatches = useCallback(
    async (longNames, nextValue) => {
      if (!longNames?.length) return false
      const numericValue = Number(nextValue)
      const writeValue = Number.isFinite(numericValue) ? numericValue : nextValue
      let hasShownProgress = false
      for (let i = 0; i < longNames.length; i += GROUP_WRITE_BATCH_SIZE) {
        const chunk = longNames.slice(i, i + GROUP_WRITE_BATCH_SIZE)
        const payload = Object.fromEntries(chunk.map((longName) => [longName, writeValue]))
        const response = await writeRealvalByLongNames(payload)
        if (!isWriteSuccess(response)) return false
        if (!hasShownProgress && longNames.length > GROUP_WRITE_BATCH_SIZE) {
          onWriteNotify('正在下置...')
          hasShownProgress = true
        }
      }
      return true
    },
    [onWriteNotify],
  )

  const handleGroupParamChange = useCallback(
    async (row, nextValue) => {
      const targetLongNames = getRowWriteLongNames(row)
      if (!targetLongNames.length) {
        onWriteNotify('未找到可下置点位')
        return
      }
      const ok = await writeGroupBatches(targetLongNames, nextValue)
      if (!isMountedRef.current) return
      if (!ok) {
        onWriteNotify('下置失败，请重试')
        return
      }
      updateParameter(row.id, nextValue)
      onWriteNotify('保存成功')
      const pollLongName = getRowPollLongName(row)
      scheduleVerify(() => verifyLongNames(pollLongName ? [pollLongName] : targetLongNames.slice(0, 1)))
    },
    [getRowPollLongName, getRowWriteLongNames, isMountedRef, onWriteNotify, scheduleVerify, verifyLongNames, writeGroupBatches],
  )

  const handleSingleParamChange = useCallback(
    (row, nextValue) => {
      const longName = getRowPollLongName(row)
      if (!longName) {
        onWriteNotify('未找到可下置点位')
        return
      }
      const numericValue = Number(nextValue)
      const writeValue = Number.isFinite(numericValue) ? numericValue : nextValue
      performWrite(
        { [longName]: writeValue },
        {
          optimisticApply: () => updateParameter(row.id, nextValue),
          delayedVerify: () => verifyLongNames([longName]),
        },
      )
    },
    [getRowPollLongName, onWriteNotify, performWrite, verifyLongNames],
  )

  const handleParamChange = useCallback(
    (row, nextValue) => {
      if (isGroupControlEnabled) {
        handleGroupParamChange(row, nextValue)
        return
      }
      handleSingleParamChange(row, nextValue)
    },
    [handleGroupParamChange, handleSingleParamChange, isGroupControlEnabled],
  )

  const selectedHeatPumpLabel = useMemo(() => {
    const selected = heatPumpOptions.find((item) => item.value === selectedHeatPumpCode)
    return selected?.label ?? ''
  }, [heatPumpOptions, selectedHeatPumpCode])

  const selectedStateLabelName = useMemo(() => {
    const unitId = parseUnitDeviceCodeLoose(selectedHeatPumpCode)
    if (unitId != null) {
      return getUnitCompactDisplayName(unitId)
    }
    return selectedHeatPumpLabel
  }, [selectedHeatPumpCode, selectedHeatPumpLabel])

  const detailTitle =
    !isGroupControlEnabled && selectedHeatPumpLabel ? `${selectedHeatPumpLabel}详细参数` : `${DEVICE_LABEL}详细参数`
  const stateLabel =
    !isGroupControlEnabled && selectedStateLabelName
      ? `${selectedStateLabelName}状态`
      : `${DEVICE_LABEL}状态`
  const parameterTitle =
    !isGroupControlEnabled && selectedHeatPumpLabel ? `${selectedHeatPumpLabel}参数设置` : '参数设置'
  const stateIcon = DEVICE_STATUS_ICON_MAP[displayDeviceRuntime.status] ?? standbyIcon
  const stateText =
    displayDeviceRuntime.state ||
    HEAT_PUMP_STATUS_LABEL[displayDeviceRuntime.status] ||
    HEAT_PUMP_STATUS_LABEL[HEAT_PUMP_STATUS.SHUTDOWN]

  if (!isInitialAttemptDone) {
    return (
      <main className="heat-pump-page page-initial-loading" aria-busy="true">
        <div className="page-initial-loading__spinner" aria-hidden />
        <p className="page-initial-loading__text">正在同步页面数据...</p>
      </main>
    )
  }

  return (
    <main className="heat-pump-page">
      <FeatureInfoCard
        icon={groupControlIcon}
        iconAlt="热泵群控"
        title="热泵批量控制"
        description="开启后，所有的热泵均以相同的参数下发"
        selected={isGroupControlEnabled}
        onClick={() => setIsGroupControlEnabled((prev) => !prev)}
        confirmConfig={({ nextSelected }) => ({
          message: `确认${nextSelected ? '开启' : '关闭'}热泵批量控制吗？`,
        })}
      />

      {!isGroupControlEnabled ? (
        <section className="heat-pump-page__detail-section">
          <div className="heat-pump-page__pump-picker">
            <SelectDropdown
              className="heat-pump-page__pump-select"
              triggerClassName="heat-pump-page__pump-selector"
              dropdownClassName="heat-pump-page__pump-dropdown"
              optionClassName="heat-pump-page__pump-option"
              showSelectedCheck
              selectedCheckIcon={checkMarkIcon}
              options={heatPumpOptions}
              value={selectedHeatPumpCode}
              onChange={setSelectedHeatPumpCode}
              triggerAriaLabel={`选择${DEVICE_LABEL}`}
              listAriaLabel={`${DEVICE_LABEL}列表`}
              confirmConfig={({ nextValue }) => {
                const selected = heatPumpOptions.find((item) => item.value === nextValue)
                return { message: `确认切换为${selected?.label ?? `所选${DEVICE_LABEL}`}吗？` }
              }}
            />
          </div>

          <h3 className="heat-pump-page__section-title">{detailTitle}</h3>

          <div className="heat-pump-page__state-card">
            <span className="heat-pump-page__state-label">{stateLabel}</span>
            <span className="heat-pump-page__state-value">
              <img src={stateIcon} alt="" aria-hidden="true" />
              {stateText}
            </span>
          </div>

          <div className="heat-pump-page__metrics-grid">
            {detailMetrics.map((item) => (
              <article key={item.key} className="heat-pump-page__metric-item">
                <span className="heat-pump-page__metric-label">{item.label}</span>
                <span className="heat-pump-page__metric-value">{item.value}</span>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="heat-pump-page__param-section">
        <h3 className="heat-pump-page__section-title">{parameterTitle}</h3>
        <div className="heat-pump-page__slider-list">
          {activeParameterRows.map((row) => (
            <SliderSettingRow
              key={row.id}
              label={row.label}
              value={parameters[row.id]}
              min={row.min}
              max={row.max}
              step={row.step}
              suffix={row.suffix}
              showInput={false}
              onChange={(value) => handleParamChange(row, value)}
              keypadTitle={row.label}
              confirmConfig={({ nextValue }) => ({ message: `确认将${row.label}设置为 ${nextValue}${row.suffix} 吗？` })}
            />
          ))}
        </div>
      </section>
      <AttentionModal
        isOpen={Boolean(attentionMessage)}
        title="提示"
        message={attentionMessage}
        confirmText="确认"
        showCancel={false}
        onClose={() => setAttentionMessage('')}
        onConfirm={() => setAttentionMessage('')}
        zIndex={300}
      />
    </main>
  )
}

export default HeatPumpPage
