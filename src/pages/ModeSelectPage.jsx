import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FeatureInfoCard from '../components/FeatureInfoCard'
import ModeOptionCard from '../components/ModeOptionCard'
import SelectDropdown from '../components/SelectDropdown'
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
import { getStoredClimateMode, setStoredClimateMode } from '../utils/climateModeState'
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
    title: '峰谷调节',
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

function createStatusList(count, initialStatus = 0) {
  return Array.from({ length: count }, () => (initialStatus === 1 ? 1 : 0))
}

const MANUAL_DEVICE_CONFIG = {
  'heat-pump': { idPrefix: 'hp', labelPrefix: '热泵', statusList: createStatusList(33, 0) },
  'heat-pump-loop-pump': { idPrefix: 'loop-pump', labelPrefix: '水泵', statusList: createStatusList(3, 0) },
  'heating-tape': { idPrefix: 'heating-tape', labelPrefix: '伴热带', statusList: createStatusList(1, 0) },
  'drain-valve': { idPrefix: 'drain-valve', labelPrefix: '排污阀', statusList: createStatusList(1, 0) },
  'relief-valve': { idPrefix: 'relief-valve', labelPrefix: '泄压阀', statusList: createStatusList(1, 0) },
  'constant-pressure-water-pump': {
    idPrefix: 'constant-pressure-water-pump',
    labelPrefix: '定压补水泵',
    statusList: createStatusList(2, 0),
  },
}

const MANUAL_DEVICE_ICON_MAP = {
  'heat-pump': heatPumpShutdownIcon,
  'heat-pump-loop-pump': waterPumpIcon,
  'heating-tape': heatTracingIcon,
  'constant-pressure-water-pump': constantPressurePumpIcon,
  'relief-valve': pressureReliefValveIcon,
  'drain-valve': drainValveIcon,
}

function buildManualDeviceStatusMap() {
  return Object.fromEntries(
    Object.entries(MANUAL_DEVICE_CONFIG).map(([type, config]) => {
      const statusMap = Object.fromEntries(
        config.statusList.map((status, index) => [`${config.idPrefix}-${index + 1}`, status === 1 ? 1 : 0]),
      )
      return [type, statusMap]
    }),
  )
}

function buildManualDeviceList(deviceType, deviceStatusByType) {
  const config = MANUAL_DEVICE_CONFIG[deviceType] ?? MANUAL_DEVICE_CONFIG['heat-pump']
  const statusMap = deviceStatusByType[deviceType] ?? {}

  return config.statusList.map((defaultStatus, index) => {
    const id = `${config.idPrefix}-${index + 1}`
    const status = statusMap[id] === 1 ? 1 : defaultStatus
    return {
      id,
      status,
      label: config.statusList.length === 1 ? config.labelPrefix : `${config.labelPrefix}${index + 1}`,
    }
  })
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
}) {
  const isClimateCard = id === 'climate'
  const isConstantMode = isClimateCard && !isEnabled
  const stateText = isClimateCard ? (isEnabled ? '气候补偿开启' : '定温模式开启') : isEnabled ? '已开启' : '已关闭'
  const stateColor = isEnabled || isConstantMode ? '#197CDF' : 'rgba(255, 255, 255, 0.60)'
  const currentStatusIcon = isEnabled && statusIconActive ? statusIconActive : statusIcon
  const switchClassName = `mode-select-page__switch${isEnabled ? ' is-on' : ''}${isConstantMode ? ' is-blue' : ''}`
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

        <button
          type="button"
          className={switchClassName}
          aria-label={`${title}${isEnabled ? '关闭' : '开启'}`}
          aria-pressed={isEnabled}
          onClick={onToggle}
        >
          <span className="mode-select-page__switch-thumb" />
        </button>
      </div>
    </article>
  )
}

function ModeSelectPage() {
  const navigate = useNavigate()
  const [featureMode, setFeatureMode] = useState('smart')
  const [temperatureMode, setTemperatureMode] = useState('heating')
  const [settingState, setSettingState] = useState(() => ({
    ...INITIAL_CARD_SWITCH_STATE,
    climate: getStoredClimateMode() === 'climate',
  }))
  const [manualDeviceType, setManualDeviceType] = useState(MANUAL_TYPE_OPTIONS[0].value)
  const [manualDeviceStatusByType, setManualDeviceStatusByType] = useState(() => buildManualDeviceStatusMap())

  const toggleSetting = (id) => {
    setSettingState((current) => ({
      ...current,
      [id]:
        id === 'climate'
          ? (() => {
              const nextClimateOn = !current[id]
              setStoredClimateMode(nextClimateOn ? 'climate' : 'constant')
              return nextClimateOn
            })()
          : !current[id],
    }))
  }

  const settingCards = useMemo(
    () =>
      MODE_SETTING_CARDS.map((item) => ({
        ...item,
        hasTargetPage: Boolean(item.routePath),
      })),
    [],
  )

  const manualDeviceList = useMemo(
    () => buildManualDeviceList(manualDeviceType, manualDeviceStatusByType),
    [manualDeviceType, manualDeviceStatusByType],
  )
  const manualDeviceIcon = MANUAL_DEVICE_ICON_MAP[manualDeviceType] ?? heatPumpShutdownIcon

  const toggleManualDeviceStatus = (deviceId) => {
    setManualDeviceStatusByType((prev) => {
      const typeStatusMap = prev[manualDeviceType] ?? {}
      const currentStatus = typeStatusMap[deviceId] === 1 ? 1 : 0
      return {
        ...prev,
        [manualDeviceType]: {
          ...typeStatusMap,
          [deviceId]: currentStatus === 1 ? 0 : 1,
        },
      }
    })
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
            onClick={() => setFeatureMode(item.id)}
            className="mode-select-page__feature-card"
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
                onClick={() => setTemperatureMode(item.id)}
              />
            )
          })}
        </div>
      </section>

      {featureMode === 'smart' ? (
        <section className="mode-select-page__section">
          <h2 className="mode-select-page__section-title">模式调节</h2>
          <div className="mode-select-page__setting-grid">
            {settingCards.map((item) => (
              <ModeSettingCard
                key={item.id}
                id={item.id}
                title={item.title}
                subtitle={item.subtitle}
                description={item.description}
                isEnabled={Boolean(settingState[item.id])}
                onToggle={() => toggleSetting(item.id)}
                statusIcon={item.statusIcon}
                statusIconActive={item.statusIconActive}
                hasTargetPage={item.hasTargetPage}
                onArrowClick={item.routePath ? () => navigate(item.routePath) : undefined}
              />
            ))}
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
            onChange={setManualDeviceType}
            triggerAriaLabel="选择设备类型"
            listAriaLabel="设备类型列表"
          />

          <p className="mode-select-page__manual-tip">手动开关，单机触碰控制设备开关，蓝色代表开启，灰色代表关闭</p>

          <div className="mode-select-page__manual-device-grid" aria-label="手动设备列表">
            {manualDeviceList.map((device) => {
              const isActive = device.status === 1
              return (
                <button
                  key={device.id}
                  type="button"
                  className={`mode-select-page__manual-device${isActive ? ' is-active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => toggleManualDeviceStatus(device.id)}
                >
                  <img src={manualDeviceIcon} alt="" aria-hidden="true" className="mode-select-page__manual-device-icon" />
                  <span className="mode-select-page__manual-device-label">{device.label}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}

export default ModeSelectPage
