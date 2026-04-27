import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FeatureInfoCard from '../components/FeatureInfoCard'
import ModeOptionCard from '../components/ModeOptionCard'
import SelectDropdown from '../components/SelectDropdown'
import ToggleSwitch from '../components/ToggleSwitch'
import AttentionModal from '../components/AttentionModal'
import manualModeIcon from '../assets/manual-mode.svg'
import heatingActiveIcon from '../assets/device/heating-active.svg'
import heatingInactiveIcon from '../assets/device/heating-inactive.svg'
import coolingActiveIcon from '../assets/device/cooling-active.svg'
import coolingInactiveIcon from '../assets/device/cooling-inactive.svg'
import climateStatusIcon from '../assets/mode-select-weather.svg'
import timerStatusIcon from '../assets/mode-select-time-setting.svg'
import timerStatusIconActive from '../assets/mode-select-time-setting-active.svg'
import startStopStatusIcon from '../assets/mode-select-start-stop.svg'
import peakStatusIcon from '../assets/mode-select-peak-valley-regulation.svg'
import couplingStatusIcon from '../assets/mode-select-couple-energy.svg'
import protectionStatusIcon from '../assets/mode-select-heat-pump-protect.svg'
import protectionStatusIconActive from '../assets/mode-select-heat-pump-protect-active.svg'
import heatPumpShutdownIcon from '../assets/heat-pump/hp-shutdown.svg'
import waterPumpIcon from '../assets/water-pump.svg'
import heatTracingIcon from '../assets/heat-tracing.svg'
import constantPressurePumpIcon from '../assets/constant-pressure-pump.svg'
import pressureReliefValveIcon from '../assets/pressure-relief-valve.svg'
import drainValveIcon from '../assets/drain-value.svg'
import { useActionConfirm } from '../hooks/useActionConfirm'
import { useWriteWithDelayedVerify } from '../hooks/useWriteWithDelayedVerify'
import { getStoredClimateMode, setStoredClimateMode } from '../utils/climateModeState'
import { getStoredTemperatureMode, setStoredTemperatureMode } from '../utils/temperatureModeState'
import {
  hpRunModeSwitch,
  queryRealvalByLongNames,
  writeRealvalByLongNames,
  queryManualSwitch,
} from '../api/modules/settings'
import './ModeSelectPage.css'

function SmartModeIcon() {
  return (
    <svg viewBox="0 0 32 32" className="mode-select-page__feature-icon" aria-hidden="true">
      <circle cx="16" cy="16" r="5" />
      <path d="M16 4.5v3.2M16 24.3v3.2M4.5 16h3.2M24.3 16h3.2M7.7 7.7l2.3 2.3M22 22l2.3 2.3M24.3 7.7L22 10M10 22l-2.3 2.3" />
    </svg>
  )
}

const FEATURE_OPTIONS = [
  { id: 'smart', title: '智能模式', description: '自动调节', icon: <SmartModeIcon /> },
  { id: 'manual', title: '手动模式', description: '手动调节', icon: manualModeIcon },
]

const TEMPERATURE_OPTIONS = [
  {
    id: 'heating',
    label: '制热',
    activeIcon: heatingActiveIcon,
    inactiveIcon: heatingInactiveIcon,
  },
  {
    id: 'cooling',
    label: '制冷',
    activeIcon: coolingActiveIcon,
    inactiveIcon: coolingInactiveIcon,
  },
]

const MODE_SETTING_CARDS = [
  {
    id: 'climate',
    title: '气候补偿',
    subtitle: '定温模式',
    description: '开启时，根据环境温度不同自动调节回水目标温度，关闭时，固定温度运行',
    statusIcon: climateStatusIcon,
    routePath: '/settings/mode-setting/climate-compensation',
  },
  {
    id: 'start-stop',
    title: '智能启停',
    description: '热泵自动启停参数',
    statusIcon: startStopStatusIcon,
    routePath: '/settings/mode-setting/smart-start-stop',
  },
  {
    id: 'timer',
    title: '智能定时',
    description: '可选择全天候运行和定时',
    statusIcon: timerStatusIcon,
    statusIconActive: timerStatusIconActive,
    routePath: '/settings/mode-setting/smart-timer',
  },
  {
    id: 'peak',
    title: '热电协同',
    description: '开启时，根据环境温度不同自动调节回水目标温度，关闭时，固定温度运行',
    statusIcon: peakStatusIcon,
    routePath: '/settings/mode-setting/peak-valley',
  },
  {
    id: 'coupling',
    title: '耦合能源',
    description: '开启时，耦合能源参与系统的运行',
    statusIcon: couplingStatusIcon,
    routePath: '/settings/mode-setting/coupling-energy',
  },
  {
    id: 'protection',
    title: '热泵长时间运行防护',
    description: '可选择全天候运行和定时',
    statusIcon: protectionStatusIcon,
    statusIconActive: protectionStatusIconActive,
  },
]

const INITIAL_CARD_SWITCH_STATE = {
  climate: true,
  'start-stop': true,
  timer: true,
  peak: true,
  coupling: true,
  protection: true,
}

const MANUAL_TYPE_OPTIONS = [
  { value: 'heat-pump', label: '热泵' },
  { value: 'heat-pump-loop-pump', label: '热泵循环泵' },
  { value: 'heating-tape', label: '伴热带' },
  { value: 'drain-valve', label: '排污阀' },
  { value: 'relief-valve', label: '泄压阀' },
  { value: 'constant-pressure-water-pump', label: '定压补水泵' },
]

const MANUAL_DEVICE_ICON_MAP = {
  'heat-pump': heatPumpShutdownIcon,
  'heat-pump-loop-pump': waterPumpIcon,
  'heating-tape': heatTracingIcon,
  'constant-pressure-water-pump': constantPressurePumpIcon,
  'relief-valve': pressureReliefValveIcon,
  'drain-valve': drainValveIcon,
}

// 模式选择页面使用的点位长名
const LONG_NAME_SYSTEM_OPERATING_MODE = 'Sys\\FinforWorx\\SystemOperatingMode'
const LONG_NAME_HP_TOTAL_RUN_MODE = 'Sys\\FinforWorx\\HPTotalRunMode'
const LONG_NAME_CLIMATE = 'Sys\\FinforWorx\\QHBC'
const LONG_NAME_TIMER = 'Sys\\FinforWorx\\ZNDS'
const LONG_NAME_PEAK = 'Sys\\FinforWorx\\GFTJ'
const LONG_NAME_COUPLING = 'Sys\\FinforWorx\\OHNY'
const LONG_NAME_PROTECTION = 'Sys\\FinforWorx\\Function1'

const SETTING_CARD_LONG_NAME_MAP = {
  climate: LONG_NAME_CLIMATE,
  timer: LONG_NAME_TIMER,
  peak: LONG_NAME_PEAK,
  coupling: LONG_NAME_COUPLING,
  protection: LONG_NAME_PROTECTION,
}

const SETTING_SWITCH_LONG_NAMES = [
  LONG_NAME_CLIMATE,
  LONG_NAME_TIMER,
  LONG_NAME_PEAK,
  LONG_NAME_COUPLING,
  LONG_NAME_PROTECTION,
]

// 智能模式下需要轮询的全部点位（模式 + 制热制冷 + 5 个开关）
const SMART_MODE_POLL_LONG_NAMES = [
  LONG_NAME_SYSTEM_OPERATING_MODE,
  LONG_NAME_HP_TOTAL_RUN_MODE,
  ...SETTING_SWITCH_LONG_NAMES,
]

// 手动模式下只需要轮询的点位（模式 + 制热制冷，开关点位不展示也不拉取）
const MANUAL_MODE_POLL_LONG_NAMES = [
  LONG_NAME_SYSTEM_OPERATING_MODE,
  LONG_NAME_HP_TOTAL_RUN_MODE,
]

// 手动设备下拉选项值 → queryManualSwitch 接口的 type 字段
// 注意：部分设备的接口 type 与下拉显示名不同（如“定压补水泵”→“定压泵”）
const MANUAL_DEVICE_TYPE_PARAM_MAP = {
  'heat-pump': '热泵',
  'heat-pump-loop-pump': '热泵循环泵',
  'heating-tape': '伴热带',
  'drain-valve': '排污阀',
  'relief-valve': '蓄热阀门',
  'constant-pressure-water-pump': '定压泵',
}

const POLL_INTERVAL_MS = 10_000

// 相同长名集合的并发 query 合并为单次 HTTP 请求，避免 React 18 StrictMode 下
// useEffect 双调用时重复打接口，同时不影响分次、非并发的回读
const realvalQueryInflight = new Map()

function makeRealvalQueryKey(longNames) {
  return JSON.stringify([...longNames].slice().sort())
}

// 将接口返回的 0/1 或 "0"/"1" 统一为布尔
function isOnValue(value) {
  return value === 1 || value === '1'
}

// 从 queryRealvalByLongNames 响应中取出值映射
function extractRealvalMap(response) {
  const payload = response?.data
  if (!payload || payload.success === false) return null
  const data = payload.data
  if (!data || typeof data !== 'object') return null
  return data
}

// 从 queryManualSwitch 响应中取设备列表
function extractManualSwitchList(response) {
  const payload = response?.data
  if (!payload || payload.success === false) return null
  const list = payload?.data?.manualSwitch
  return Array.isArray(list) ? list : null
}

function ModeSettingCard({
  id,
  title,
  subtitle,
  description,
  isEnabled,
  onToggle,
  statusIcon,
  statusIconActive,
  onArrowClick,
  hasTargetPage,
  toggleConfirmConfig,
  toggleDisabled = false,
}) {
  const isClimateCard = id === 'climate'
  const isConstantMode = isClimateCard && !isEnabled
  const stateText = isClimateCard ? (isEnabled ? '气候补偿开启' : '定温模式开启') : isEnabled ? '已开启' : '已关闭'
  const stateColor = isEnabled || isConstantMode ? '#197CDF' : 'rgba(255, 255, 255, 0.60)'
  const currentStatusIcon = isEnabled && statusIconActive ? statusIconActive : statusIcon
  const statusClassName = [
    'mode-select-page__setting-status',
    isEnabled || isConstantMode ? ' is-on' : ' is-off',
  ].join('')
  const titleClassName = `mode-select-page__setting-title${isClimateCard ? ' is-climate' : ''}${isConstantMode ? ' is-constant' : ''}`

  return (
    <article className="mode-select-page__setting-card">
      <button
        type="button"
        className={`mode-select-page__setting-arrow${hasTargetPage ? '' : ' is-disabled'}`}
        aria-label={`${title}详情`}
        onClick={onArrowClick}
        disabled={!hasTargetPage}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M5 2.5 10.5 8 5 13.5" />
        </svg>
      </button>

      <h3 className={titleClassName}>
        <span className="mode-select-page__setting-title-main">{title}</span>
        {subtitle ? (
          <>
            <span className="mode-select-page__setting-subtitle-sep"> / </span>
            <span className="mode-select-page__setting-subtitle">{subtitle}</span>
          </>
        ) : null}
      </h3>
      <p className="mode-select-page__setting-desc">{description}</p>

      <div className="mode-select-page__setting-footer">
        <span className={statusClassName} style={{ color: stateColor }}>
          <img src={currentStatusIcon} alt="" aria-hidden="true" className="mode-select-page__status-icon" />
          <span>{stateText}</span>
        </span>

        <ToggleSwitch
          checked={isEnabled}
          onToggle={onToggle}
          forceOnStyle={isConstantMode}
          ariaLabel={toggleDisabled ? `${title}已开启` : `${title}${isEnabled ? '关闭' : '开启'}`}
          className={`mode-select-page__switch${toggleDisabled ? ' mode-select-page__switch--locked-on' : ''}`}
          confirmConfig={toggleDisabled ? null : toggleConfirmConfig}
          disabled={toggleDisabled}
        />
      </div>
    </article>
  )
}

function ModeSelectPage() {
  const { requestConfirm, confirmModal } = useActionConfirm()
  const navigate = useNavigate()
  const [isInitialSyncing, setIsInitialSyncing] = useState(true)
  const [featureMode, setFeatureMode] = useState('smart')
  const [temperatureMode, setTemperatureMode] = useState(() => getStoredTemperatureMode())
  const [settingState, setSettingState] = useState(() => ({
    ...INITIAL_CARD_SWITCH_STATE,
    climate: getStoredClimateMode() === 'climate',
  }))
  const [manualDeviceType, setManualDeviceType] = useState(MANUAL_TYPE_OPTIONS[0].value)
  const [manualDeviceList, setManualDeviceList] = useState([])
  const [attentionMessage, setAttentionMessage] = useState('')
  const [isRunModeSwitching, setIsRunModeSwitching] = useState(false)

  const onWriteNotify = useCallback((message) => {
    setAttentionMessage(message)
  }, [])

  const { performWrite, isMountedRef } = useWriteWithDelayedVerify({
    write: writeRealvalByLongNames,
    onNotify: onWriteNotify,
  })
  const { performWrite: performRunModeSwitch } = useWriteWithDelayedVerify({
    write: hpRunModeSwitch,
  })

  // 将 queryRealvalByLongNames 返回的值应用到页面状态
  const applyRealvalMap = useCallback(
    (valueMap) => {
      if (!valueMap || !isMountedRef.current) return

      if (Object.prototype.hasOwnProperty.call(valueMap, LONG_NAME_SYSTEM_OPERATING_MODE)) {
        const raw = valueMap[LONG_NAME_SYSTEM_OPERATING_MODE]
        // 0 为智能模式，1 为手动模式
        setFeatureMode(isOnValue(raw) ? 'manual' : 'smart')
      }

      if (Object.prototype.hasOwnProperty.call(valueMap, LONG_NAME_HP_TOTAL_RUN_MODE)) {
        const raw = valueMap[LONG_NAME_HP_TOTAL_RUN_MODE]
        // 1 为制热，0 为制冷
        const nextTemperature = isOnValue(raw) ? 'heating' : 'cooling'
        setTemperatureMode(nextTemperature)
        setStoredTemperatureMode(nextTemperature)
      }

      setSettingState((prev) => {
        const next = { ...prev }
        let changed = false
        Object.entries(SETTING_CARD_LONG_NAME_MAP).forEach(([cardId, longName]) => {
          if (!Object.prototype.hasOwnProperty.call(valueMap, longName)) return
          const nextValue = isOnValue(valueMap[longName])
          if (next[cardId] !== nextValue) {
            next[cardId] = nextValue
            changed = true
            if (cardId === 'climate') {
              setStoredClimateMode(nextValue ? 'climate' : 'constant')
            }
          }
        })
        return changed ? next : prev
      })
    },
    [],
  )

  // 查询一组点位并应用到状态
  const fetchRealvals = useCallback(
    async (longNames) => {
      const key = makeRealvalQueryKey(longNames)
      if (!realvalQueryInflight.has(key)) {
        const queryPromise = (async () => {
          try {
            const response = await queryRealvalByLongNames(longNames)
            return extractRealvalMap(response)
          } catch {
            return null
          }
        })()
        queryPromise.finally(() => {
          realvalQueryInflight.delete(key)
        })
        realvalQueryInflight.set(key, queryPromise)
      }
      const valueMap = await realvalQueryInflight.get(key)
      applyRealvalMap(valueMap)
      return valueMap
    },
    [applyRealvalMap],
  )

  // 查询手动设备开关列表
  const fetchManualSwitch = useCallback(
    async (deviceTypeValue) => {
      const typeParam = MANUAL_DEVICE_TYPE_PARAM_MAP[deviceTypeValue]
      if (!typeParam) return null
      try {
        const response = await queryManualSwitch(typeParam)
        const list = extractManualSwitchList(response)
        if (list && isMountedRef.current) {
          setManualDeviceList(list)
        }
        return list
      } catch {
        return null
      }
    },
    [],
  )

  // 手动模式下的"当前设备类型"通过 ref 暴露给轮询使用，避免依赖变化导致轮询重置
  const manualPollContextRef = useRef({ featureMode, manualDeviceType })
  const initialModeSyncedRef = useRef(false)
  useEffect(() => {
    manualPollContextRef.current = { featureMode, manualDeviceType }
  }, [featureMode, manualDeviceType])

  // 进入页面立即拉取 + 每 10s 轮询；按模式拉取对应数据
  // - 智能模式：模式点位 + 制热制冷 + 5 个开关点位
  // - 手动模式：模式点位 + 制热制冷 + 对应设备类型的手动设备列表
  useEffect(() => {
    const pollOnce = async () => {
      const { featureMode: fm, manualDeviceType: mt } = manualPollContextRef.current
      let valueMap = null
      if (fm === 'manual') {
        valueMap = await fetchRealvals(MANUAL_MODE_POLL_LONG_NAMES)
        await fetchManualSwitch(mt)
      } else {
        valueMap = await fetchRealvals(SMART_MODE_POLL_LONG_NAMES)
      }

      if (
        !initialModeSyncedRef.current &&
        valueMap &&
        Object.prototype.hasOwnProperty.call(valueMap, LONG_NAME_SYSTEM_OPERATING_MODE)
      ) {
        initialModeSyncedRef.current = true
        if (isMountedRef.current) {
          setIsInitialSyncing(false)
        }
      }
    }
    pollOnce()
    const timerId = window.setInterval(pollOnce, POLL_INTERVAL_MS)
    return () => {
      window.clearInterval(timerId)
    }
  }, [fetchRealvals, fetchManualSwitch, isMountedRef])

  // 页面进入时，若当前已是手动模式，立即拉取手动设备列表
  useEffect(() => {
    if (featureMode === 'manual') {
      fetchManualSwitch(manualDeviceType)
    }
    // 仅在 featureMode 从轮询/初始化切到 manual 时触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureMode])

  const settingCards = useMemo(
    () =>
      MODE_SETTING_CARDS.map((item) => ({
        ...item,
        hasTargetPage: Boolean(item.routePath),
      })),
    [],
  )

  const manualDeviceIcon = MANUAL_DEVICE_ICON_MAP[manualDeviceType] ?? heatPumpShutdownIcon

  // 点击智能/手动模式
  const handleFeatureModeSelect = useCallback(
    (nextFeatureId) => {
      if (nextFeatureId === featureMode) return
      const writeValue = nextFeatureId === 'manual' ? 1 : 0
      performWrite(
        { [LONG_NAME_SYSTEM_OPERATING_MODE]: writeValue },
        {
          optimisticApply: () => {
            setFeatureMode(nextFeatureId)
            if (nextFeatureId === 'manual') {
              // 切到手动模式：重置下拉到"热泵"并立即拉一次列表
              setManualDeviceType(MANUAL_TYPE_OPTIONS[0].value)
              fetchManualSwitch(MANUAL_TYPE_OPTIONS[0].value)
            }
          },
          delayedVerify: async () => {
            await fetchRealvals([LONG_NAME_SYSTEM_OPERATING_MODE])
            if (nextFeatureId === 'smart') {
              await fetchRealvals(SETTING_SWITCH_LONG_NAMES)
            } else {
              await fetchManualSwitch(MANUAL_TYPE_OPTIONS[0].value)
            }
          },
        },
      )
    },
    [featureMode, fetchManualSwitch, fetchRealvals, performWrite],
  )

  // 点击制热/制冷
  const handleTemperatureSelect = useCallback(
    async (nextTemperatureId) => {
      if (nextTemperatureId === temperatureMode || isRunModeSwitching) return
      const writeValue = nextTemperatureId === 'heating' ? 1 : 0
      setIsRunModeSwitching(true)
      const success = await performRunModeSwitch(writeValue, {
        optimisticApply: () => {
          setTemperatureMode(nextTemperatureId)
          setStoredTemperatureMode(nextTemperatureId)
        },
        delayedVerify: () => fetchRealvals([LONG_NAME_HP_TOTAL_RUN_MODE]),
      })
      setIsRunModeSwitching(false)
      setAttentionMessage(success ? '切换模式成功' : '切换模式失败')
    },
    [fetchRealvals, isRunModeSwitching, performRunModeSwitch, temperatureMode],
  )

  // 点击模式调节里的开关
  const handleSettingToggle = useCallback(
    (cardId) => {
      if (cardId === 'start-stop') return
      const longName = SETTING_CARD_LONG_NAME_MAP[cardId]
      // 无后端点位的其它模块走本地切换（智能启停已固定为开，不进入此分支）
      if (!longName) {
        setSettingState((prev) => ({ ...prev, [cardId]: !prev[cardId] }))
        return
      }
      const currentOn = Boolean(settingState[cardId])
      const nextOn = !currentOn
      const nextValue = nextOn ? 1 : 0
      performWrite(
        { [longName]: nextValue },
        {
          optimisticApply: () => {
            setSettingState((prev) => ({ ...prev, [cardId]: nextOn }))
            if (cardId === 'climate') {
              setStoredClimateMode(nextOn ? 'climate' : 'constant')
            }
          },
          delayedVerify: () => fetchRealvals([longName]),
        },
      )
    },
    [fetchRealvals, performWrite, settingState],
  )

  // 手动设备类型下拉切换（纯读操作，无需乐观更新）
  const handleManualDeviceTypeChange = useCallback(
    (nextValue) => {
      if (nextValue === manualDeviceType) return
      setManualDeviceType(nextValue)
      fetchManualSwitch(nextValue)
    },
    [fetchManualSwitch, manualDeviceType],
  )

  // 点击手动设备：state 取反后下置到对应 longName
  // 先乐观更新那一行，3s 后整体回读一次 queryManualSwitch(当前类型) 做校正；
  // 10s 轮询也会在手动模式下刷新整张列表兜底
  const handleManualDeviceToggle = useCallback(
    (device) => {
      if (!device?.longName) return
      const currentOn = isOnValue(device.state)
      const nextValue = currentOn ? 0 : 1
      const nextStateText = currentOn ? '0' : '1'
      const targetType = manualDeviceType
      performWrite(
        { [device.longName]: nextValue },
        {
          optimisticApply: () => {
            setManualDeviceList((prev) =>
              prev.map((item) =>
                item.longName === device.longName ? { ...item, state: nextStateText } : item,
              ),
            )
          },
          delayedVerify: () => fetchManualSwitch(targetType),
        },
      )
    },
    [fetchManualSwitch, manualDeviceType, performWrite],
  )

  if (isInitialSyncing) {
    return (
      <main className="mode-select-page mode-select-page--loading" aria-busy="true">
        <div className="mode-select-page__loading-spinner" aria-hidden />
        <p className="mode-select-page__loading-text">正在同步模式状态...</p>
      </main>
    )
  }

  return (
    <main className="mode-select-page">
      <section className="mode-select-page__feature-pair" aria-label="模式选择">
        {FEATURE_OPTIONS.map((item, index) => (
          <FeatureInfoCard
            key={item.id}
            icon={item.icon}
            title={item.title}
            description={item.description}
            selected={featureMode === item.id}
            selectedBadgePosition={index === 0 ? 'start' : 'end'}
            onClick={() => handleFeatureModeSelect(item.id)}
            className="mode-select-page__feature-card"
            confirmConfig={featureMode === item.id ? null : { message: `确认切换为${item.title}吗？` }}
          />
        ))}
      </section>

      <section className="mode-select-page__section">
        <h2 className="mode-select-page__section-title">冷热模式</h2>
        <div className="mode-select-page__temperature-grid">
          {TEMPERATURE_OPTIONS.map((item) => {
            const selected = temperatureMode === item.id
            return (
              <ModeOptionCard
                key={item.id}
                icon={selected ? item.activeIcon : item.inactiveIcon}
                label={item.label}
                selected={selected}
                disabled={isRunModeSwitching}
                onClick={() => handleTemperatureSelect(item.id)}
                confirmConfig={selected ? null : { message: `确认切换为${item.label}模式吗？` }}
              />
            )
          })}
        </div>
      </section>

      {featureMode === 'smart' ? (
        <section className="mode-select-page__section">
          <h2 className="mode-select-page__section-title">模式调节</h2>
          <div className="mode-select-page__setting-grid">
            {settingCards.map((item) => {
              const isStartStopLocked = item.id === 'start-stop'
              return (
                <ModeSettingCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  subtitle={item.subtitle}
                  description={item.description}
                  isEnabled={isStartStopLocked ? true : Boolean(settingState[item.id])}
                  onToggle={() => handleSettingToggle(item.id)}
                  statusIcon={item.statusIcon}
                  statusIconActive={item.statusIconActive}
                  hasTargetPage={item.hasTargetPage}
                  onArrowClick={item.routePath ? () => navigate(item.routePath) : undefined}
                  toggleConfirmConfig={({ nextChecked }) => ({
                    message: `确认${nextChecked ? '开启' : '关闭'}${item.title}吗？`,
                  })}
                  toggleDisabled={isStartStopLocked}
                />
              )
            })}
          </div>
        </section>
      ) : (
        <section className="mode-select-page__section mode-select-page__manual-section">
          <SelectDropdown
            className="mode-select-page__manual-type-select"
            triggerClassName="mode-select-page__manual-type-trigger"
            dropdownClassName="mode-select-page__manual-type-dropdown"
            optionClassName="mode-select-page__manual-type-option"
            options={MANUAL_TYPE_OPTIONS}
            value={manualDeviceType}
            onChange={handleManualDeviceTypeChange}
            triggerAriaLabel="选择设备类型"
            listAriaLabel="设备类型列表"
            confirmConfig={({ nextValue }) => {
              const nextOption = MANUAL_TYPE_OPTIONS.find((item) => item.value === nextValue)
              return nextOption ? { message: `确认切换控制设备为${nextOption.label}吗？` } : null
            }}
          />

          <p className="mode-select-page__manual-tip">手动开关，单机触摸控制设备开关，蓝色代表开启，灰色代表关闭</p>

          <div className="mode-select-page__manual-device-grid" aria-label="手动设备列表">
            {manualDeviceList.map((device, index) => {
              const isActive = isOnValue(device.state)
              const label = device.name || `设备${index + 1}`
              const key = device.longName || `${label}-${index}`
              return (
                <button
                  key={key}
                  type="button"
                  className={`mode-select-page__manual-device${isActive ? ' is-active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() =>
                    requestConfirm(
                      { message: `确认${isActive ? '关闭' : '开启'}${label}吗？` },
                      () => handleManualDeviceToggle(device),
                    )
                  }
                >
                  <img src={manualDeviceIcon} alt="" aria-hidden="true" className="mode-select-page__manual-device-icon" />
                  <span className="mode-select-page__manual-device-label">{label}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}
      {confirmModal}
      <AttentionModal
        isOpen={isRunModeSwitching}
        isLoading
        loadingText="模式切换中..."
        showBackdrop
        zIndex={320}
      />
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

export default ModeSelectPage
