import { useCallback, useEffect, useMemo, useState } from 'react'
import AttentionModal from '../components/AttentionModal'
import FeatureInfoCard from '../components/FeatureInfoCard'
import SliderSettingRow from '../components/SliderSettingRow'
import SelectDropdown from '../components/SelectDropdown'
import {
  queryHeatPumpData,
  queryHeatPumpSelect,
  queryRealvalByLongNames,
  queryUnifyWriteData,
  writeRealvalByLongNames,
} from '../api/modules/settings'
import { extractRealvalMap } from '../utils/realvalMap'
import { isWriteSuccess, useWriteWithDelayedVerify } from '../hooks/useWriteWithDelayedVerify'
import groupControlIcon from '../assets/heat-pump/heat-pump-group-control.svg'
import malfunctionIcon from '../assets/heat-pump/hp-modal-malfunction.svg'
import runningIcon from '../assets/heat-pump/hp-modal-running.svg'
import standbyIcon from '../assets/heat-pump/hp-modal-shutdown.svg'
import checkMarkIcon from '../assets/icons/check-mark.svg'
import './HeatPumpPage.css'

const DEFAULT_HEAT_PUMP_OPTIONS = [{ value: 'No1', label: '热泵1' }]

const PARAMETER_ROWS = [
  { id: 'heatingTemp', backendName: '制热温度', label: '制热温度（℃）', min: 20, max: 60, step: 1, suffix: '℃' },
  { id: 'coolingTemp', backendName: '制冷温度', label: '制冷温度（℃）', min: 7, max: 20, step: 1, suffix: '℃' },
  { id: 'heatControlDiff', backendName: '制热控制回差', label: '制热控制回差（℃）', min: 0, max: 5, step: 1, suffix: '℃' },
  { id: 'coolControlDiff', backendName: '制冷控制回差', label: '制冷控制回差（℃）', min: 0, max: 5, step: 1, suffix: '℃' },
  {
    id: 'runProtectionJudge',
    backendName: '热泵持续运行保护判断时长',
    label: '热泵持续运行保护判断时长（h）',
    min: 0,
    max: 50,
    step: 1,
    suffix: 'h',
  },
  {
    id: 'shutdownProtection',
    backendName: '热泵运行保护停机时长',
    label: '热泵运行保护停机时长（min）',
    min: 0,
    max: 60,
    step: 1,
    suffix: 'min',
  },
]

const DEFAULT_METRICS = []
const POLL_INTERVAL_MS = 10_000
const GROUP_WRITE_BATCH_SIZE = 5

function toDisplayValue(value, fallback = '0') {
  if (value == null || value === '') return fallback
  return String(value)
}

function normalizeSelectOptions(selectList) {
  if (!Array.isArray(selectList)) return DEFAULT_HEAT_PUMP_OPTIONS
  const options = selectList.map((item) => ({
    value: toDisplayValue(item?.value, ''),
    label: toDisplayValue(item?.title, '热泵'),
  }))
  return options.length ? options : DEFAULT_HEAT_PUMP_OPTIONS
}

function HeatPumpPage() {
  const [attentionMessage, setAttentionMessage] = useState('')
  const [isInitialAttemptDone, setIsInitialAttemptDone] = useState(false)
  const [isGroupControlEnabled, setIsGroupControlEnabled] = useState(true)
  const [heatPumpOptions, setHeatPumpOptions] = useState(DEFAULT_HEAT_PUMP_OPTIONS)
  const [selectedHeatPumpCode, setSelectedHeatPumpCode] = useState('No1')
  const [parameters, setParameters] = useState({
    heatingTemp: '50',
    coolingTemp: '15',
    heatControlDiff: '3',
    coolControlDiff: '3',
    runProtectionJudge: '25',
    shutdownProtection: '30',
  })
  const [groupWriteConfig, setGroupWriteConfig] = useState({})
  const [individualParamCodes, setIndividualParamCodes] = useState({})
  const [detailMetrics, setDetailMetrics] = useState(DEFAULT_METRICS)
  const [deviceState, setDeviceState] = useState({ run: 'false', alarm: 'false' })

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

  const pollLongNames = useMemo(() => {
    if (isGroupControlEnabled) {
      return PARAMETER_ROWS.flatMap((row) => groupWriteConfig[row.id]?.longNames ?? []).filter(Boolean)
    }
    return PARAMETER_ROWS.map((row) => individualParamCodes[row.id]).filter(Boolean)
  }, [groupWriteConfig, individualParamCodes, isGroupControlEnabled])

  const applyRealvalMap = useCallback(
    (valueMap) => {
      if (!valueMap || !isMountedRef.current) return
      setParameters((prev) => {
        const next = { ...prev }
        let changed = false
        for (const row of PARAMETER_ROWS) {
          const longName = isGroupControlEnabled
            ? groupWriteConfig[row.id]?.longNames?.[0]
            : individualParamCodes[row.id]
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
    [groupWriteConfig, individualParamCodes, isGroupControlEnabled, isMountedRef],
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
      const response = await queryUnifyWriteData()
      const writeData = response?.data?.data?.writeData ?? {}
      const nextConfig = {}
      const nextParams = {}
      PARAMETER_ROWS.forEach((row) => {
        const item = writeData[row.backendName]
        if (!item) return
        nextConfig[row.id] = {
          longNames: Array.isArray(item.longName) ? item.longName.filter(Boolean) : [],
        }
        nextParams[row.id] = toDisplayValue(item.value, '0')
      })
      if (isMountedRef.current) {
        setGroupWriteConfig(nextConfig)
        setParameters((prev) => ({ ...prev, ...nextParams }))
        setIsInitialAttemptDone(true)
      }
    } catch {
      onWriteNotify('热泵批量参数获取失败')
      if (isMountedRef.current) {
        setIsInitialAttemptDone(true)
      }
    }
  }, [isMountedRef, onWriteNotify])

  const loadSingleHeatPumpData = useCallback(
    async (heatPumpCode) => {
      if (!heatPumpCode) return
      try {
        const response = await queryHeatPumpData({
          code: heatPumpCode,
          alarm: 'false',
          run: 'false',
        })
        const data = response?.data?.data ?? {}
        const heatPumpControl = Array.isArray(data.heatPumpControl) ? data.heatPumpControl : []
        const heatPumpData = Array.isArray(data.heatPumpData) ? data.heatPumpData : []
        const nextCodes = {}
        const nextParams = {}
        PARAMETER_ROWS.forEach((row) => {
          const control = heatPumpControl.find((item) => item?.name === row.backendName)
          if (!control) return
          nextCodes[row.id] = control.code
          nextParams[row.id] = toDisplayValue(control.value, '0')
        })
        if (isMountedRef.current) {
          setIndividualParamCodes(nextCodes)
          setParameters((prev) => ({ ...prev, ...nextParams }))
          setDetailMetrics(
            heatPumpData.map((item, index) => ({
              key: `${item?.name ?? 'metric'}-${index}`,
              label: toDisplayValue(item?.name, '--'),
              value: toDisplayValue(item?.value, '--'),
            })),
          )
          setDeviceState({
            run: toDisplayValue(data.run, 'false'),
            alarm: toDisplayValue(data.alarm, 'false'),
          })
          setIsInitialAttemptDone(true)
        }
      } catch {
        onWriteNotify(`${heatPumpCode}数据获取失败`)
        if (isMountedRef.current) {
          setIsInitialAttemptDone(true)
        }
      }
    },
    [isMountedRef, onWriteNotify],
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
      onWriteNotify('热泵下拉选项获取失败')
    }
  }, [isMountedRef, onWriteNotify])

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
      setIndividualParamCodes({})
      setDetailMetrics(DEFAULT_METRICS)
      setDeviceState({ run: 'false', alarm: 'false' })
      return
    }
    loadSingleHeatPumpData(selectedHeatPumpCode)
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
      const targetLongNames = groupWriteConfig[row.id]?.longNames ?? []
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
      scheduleVerify(() => verifyLongNames(targetLongNames))
    },
    [groupWriteConfig, isMountedRef, onWriteNotify, scheduleVerify, verifyLongNames, writeGroupBatches],
  )

  const handleSingleParamChange = useCallback(
    (row, nextValue) => {
      const longName = individualParamCodes[row.id]
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
    [individualParamCodes, onWriteNotify, performWrite, verifyLongNames],
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

  const detailTitle = !isGroupControlEnabled && selectedHeatPumpLabel ? `${selectedHeatPumpLabel}详细参数` : '热泵详细参数'
  const stateLabel = !isGroupControlEnabled && selectedHeatPumpLabel ? `${selectedHeatPumpLabel}状态` : '热泵状态'
  const parameterTitle = !isGroupControlEnabled && selectedHeatPumpLabel ? `${selectedHeatPumpLabel}参数设置` : '参数设置'
  const showAlarm = deviceState.alarm === 'true'
  const showRunning = deviceState.run === 'true'
  const stateIcon = showAlarm ? malfunctionIcon : showRunning ? runningIcon : standbyIcon
  const stateText = showAlarm ? '故障' : showRunning ? '运行' : '待机'

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
              triggerAriaLabel="选择热泵"
              listAriaLabel="热泵列表"
              confirmConfig={({ nextValue }) => {
                const selected = heatPumpOptions.find((item) => item.value === nextValue)
                return { message: `确认切换为${selected?.label ?? '所选热泵'}吗？` }
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
          {PARAMETER_ROWS.map((row) => (
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
