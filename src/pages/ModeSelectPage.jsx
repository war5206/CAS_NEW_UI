import { useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import ModeOptionCard from '../components/ModeOptionCard'
import './ModeSelectPage.css'

function SmartModeIcon() {
  return (
    <svg viewBox="0 0 32 32" className="mode-select-page__feature-icon" aria-hidden="true">
      <circle cx="16" cy="16" r="5" />
      <path d="M16 4.5v3.2M16 24.3v3.2M4.5 16h3.2M24.3 16h3.2M7.7 7.7l2.3 2.3M22 22l2.3 2.3M24.3 7.7L22 10M10 22l-2.3 2.3" />
    </svg>
  )
}

function HandModeIcon() {
  return (
    <svg viewBox="0 0 32 32" className="mode-select-page__feature-icon" aria-hidden="true">
      <path d="M8.5 17.2c-1.6-1.5-1.9-3.9-.5-5.5 1.3-1.5 3.6-1.7 5.2-.4l.6.5V8.9c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5v3.8h.8c1.3 0 2.4 1.1 2.4 2.4v1.3h.7c1.2 0 2.2 1 2.2 2.2v1.7c0 3.8-2.9 6.9-6.6 7.2-2.3.2-4.5-.7-6.1-2.2l-3.7-3.6Z" />
    </svg>
  )
}

function HeatingIcon() {
  return (
    <svg viewBox="0 0 56 56" className="mode-select-page__temp-icon is-heating" aria-hidden="true">
      <circle cx="28" cy="28" r="10" />
      <path d="M28 8v6M28 42v6M8 28h6M42 28h6M13.5 13.5l4.3 4.3M38.2 38.2l4.3 4.3M42.5 13.5l-4.3 4.3M17.8 38.2l-4.3 4.3" />
    </svg>
  )
}

function CoolingIcon() {
  return (
    <svg viewBox="0 0 56 56" className="mode-select-page__temp-icon is-cooling" aria-hidden="true">
      <path d="M28 8v40M13 16l30 24M43 16 13 40M28 8l6 6M28 8l-6 6M28 48l6-6M28 48l-6-6" />
    </svg>
  )
}

function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mode-select-page__status-icon" aria-hidden="true">
      <path d="M20 5c-6.6 0-11.2 2.5-13.7 7.4-.9 1.8-1.2 3.9-.9 5.9 2.2.4 4.4 0 6.4-1.1 4.8-2.6 7.1-7.2 8.2-12.2Z" />
      <path d="M7 17c2.6-1.1 4.8-2.9 6.6-5.3" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mode-select-page__status-icon" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.2v5.1l3.4 2" />
    </svg>
  )
}

function TimerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mode-select-page__status-icon" aria-hidden="true">
      <path d="M9 3.5h6M12 6v2.1" />
      <circle cx="12" cy="13.3" r="7.2" />
      <path d="M12 13.3 15.3 10.9" />
    </svg>
  )
}

function WaveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mode-select-page__status-icon" aria-hidden="true">
      <path d="M2.5 8.2c1.8 0 1.8 1.7 3.6 1.7s1.8-1.7 3.6-1.7 1.8 1.7 3.6 1.7 1.8-1.7 3.6-1.7 1.8 1.7 3.6 1.7" />
      <path d="M2.5 13.8c1.8 0 1.8 1.7 3.6 1.7s1.8-1.7 3.6-1.7 1.8 1.7 3.6 1.7 1.8-1.7 3.6-1.7 1.8 1.7 3.6 1.7" />
    </svg>
  )
}

function CouplingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mode-select-page__status-icon" aria-hidden="true">
      <circle cx="6.5" cy="12" r="3.2" />
      <circle cx="17.5" cy="7.2" r="3.2" />
      <circle cx="17.5" cy="16.8" r="3.2" />
      <path d="M9.4 10.6 14.5 8.3M9.4 13.4l5.1 2.3" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mode-select-page__status-icon" aria-hidden="true">
      <path d="M12 3.3 5.6 6v5.2c0 4.2 2.6 7.9 6.4 9.5 3.8-1.6 6.4-5.3 6.4-9.5V6L12 3.3Z" />
      <path d="M9.1 12.4 11 14.3l4-4" />
    </svg>
  )
}

function HeatPumpBoardIcon() {
  return (
    <svg viewBox="0 0 44 44" className="mode-select-page__manual-device-icon" aria-hidden="true">
      <rect x="1.8" y="4" width="40.4" height="34" rx="4.8" />
      <rect x="5.8" y="8" width="14.3" height="13.8" rx="1.8" />
      <rect x="23.9" y="8" width="14.3" height="13.8" rx="1.8" />
      <rect x="5.8" y="24.6" width="14.3" height="9.4" rx="1.5" />
      <rect x="23.9" y="24.6" width="14.3" height="9.4" rx="1.5" />
      <path d="M11 11.5h4M11 14.1h4M11 16.8h4M28.9 11.5h4M28.9 14.1h4M28.9 16.8h4" />
      <path d="M4.5 16.5h-2.2M41.8 16.5H39.5M14.7 40.2h14.6" />
    </svg>
  )
}

const FEATURE_OPTIONS = [
  { id: 'smart', title: '智能模式', description: '自动调节', icon: <SmartModeIcon /> },
  { id: 'manual', title: '手动模式', description: '手动调节', icon: <HandModeIcon /> },
]

const TEMPERATURE_OPTIONS = [
  { id: 'heating', label: '制热', icon: <HeatingIcon /> },
  { id: 'cooling', label: '制冷', icon: <CoolingIcon /> },
]

const MODE_SETTING_CARDS = [
  {
    id: 'climate',
    title: '气候补偿',
    subtitle: '定温模式',
    description: '开启时，根据环境温度不同自动调节回水目标温度，关闭时，固定温度运行',
    icon: LeafIcon,
  },
  {
    id: 'start-stop',
    title: '智能启停',
    description: '热泵自动启停参数',
    icon: ClockIcon,
  },
  {
    id: 'timer',
    title: '智能定时',
    description: '可选择全天候运行和定时',
    icon: TimerIcon,
  },
  {
    id: 'peak',
    title: '峰谷调节',
    description: '开启时，根据环境温度不同自动调节回水目标温度，关闭时，固定温度运行',
    icon: WaveIcon,
  },
  {
    id: 'coupling',
    title: '耦合能源',
    description: '开启时，耦合能源参与系统的运行',
    icon: CouplingIcon,
  },
  {
    id: 'protection',
    title: '热泵长时间运行防护',
    description: '可选择全天候运行和定时',
    icon: ShieldIcon,
  },
]

const INITIAL_CARD_SWITCH_STATE = {
  climate: true,
  'start-stop': true,
  timer: false,
  peak: true,
  coupling: true,
  protection: false,
}

const MANUAL_DEVICE_LIST = Array.from({ length: 16 }, (_, index) => ({
  id: `hp-${index + 1}`,
  label: '热泵八',
}))

function ModeSettingCard({ title, subtitle, description, isEnabled, onToggle, StatusIcon }) {
  const stateText = isEnabled ? '已开启' : '已关闭'
  const stateColor = isEnabled ? '#197CDF' : 'rgba(255, 255, 255, 0.60)'

  return (
    <article className="mode-select-page__setting-card">
      <button type="button" className="mode-select-page__setting-arrow" aria-label={`${title}详情`}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M5 2.5 10.5 8 5 13.5" />
        </svg>
      </button>

      <h3 className="mode-select-page__setting-title">
        {title}
        {subtitle ? <span className="mode-select-page__setting-subtitle"> / {subtitle}</span> : null}
      </h3>
      <p className="mode-select-page__setting-desc">{description}</p>

      <div className="mode-select-page__setting-footer">
        <span className="mode-select-page__setting-status" style={{ color: stateColor }}>
          <StatusIcon />
          <span>{stateText}</span>
        </span>

        <button
          type="button"
          className={`mode-select-page__switch${isEnabled ? ' is-on' : ''}`}
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
  const [featureMode, setFeatureMode] = useState('smart')
  const [temperatureMode, setTemperatureMode] = useState('heating')
  const [settingState, setSettingState] = useState(INITIAL_CARD_SWITCH_STATE)
  const [selectedManualDevice, setSelectedManualDevice] = useState('hp-4')

  const toggleSetting = (id) => {
    setSettingState((current) => ({
      ...current,
      [id]: !current[id],
    }))
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
          {TEMPERATURE_OPTIONS.map((item) => (
            <ModeOptionCard
              key={item.id}
              icon={item.icon}
              label={item.label}
              selected={temperatureMode === item.id}
              onClick={() => setTemperatureMode(item.id)}
            />
          ))}
        </div>
      </section>

      {featureMode === 'smart' ? (
        <section className="mode-select-page__section">
          <h2 className="mode-select-page__section-title">模式调节</h2>
          <div className="mode-select-page__setting-grid">
            {MODE_SETTING_CARDS.map((item) => (
              <ModeSettingCard
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                description={item.description}
                isEnabled={Boolean(settingState[item.id])}
                onToggle={() => toggleSetting(item.id)}
                StatusIcon={item.icon}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="mode-select-page__section mode-select-page__manual-section">
          <button type="button" className="mode-select-page__manual-type-trigger" aria-label="选择设备类型">
            <span>热泵</span>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M5 2.5 10.5 8 5 13.5" />
            </svg>
          </button>

          <p className="mode-select-page__manual-tip">手动开关，单机触碰控制设备开关，蓝色代表开启，灰色代表关闭</p>

          <div className="mode-select-page__manual-device-grid" aria-label="手动设备列表">
            {MANUAL_DEVICE_LIST.map((device) => {
              const isActive = device.id === selectedManualDevice
              return (
                <button
                  key={device.id}
                  type="button"
                  className={`mode-select-page__manual-device${isActive ? ' is-active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => setSelectedManualDevice(device.id)}
                >
                  <HeatPumpBoardIcon />
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
