import { useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import SliderSettingRow from '../components/SliderSettingRow'
import SelectDropdown from '../components/SelectDropdown'
import groupControlIcon from '../assets/heat-pump/heat-pump-group-control.svg'
import malfunctionIcon from '../assets/heat-pump/hp-modal-malfunction.svg'
import checkMarkIcon from '../assets/icons/check-mark.svg'
import './HeatPumpPage.css'

const HEAT_PUMP_OPTIONS = Array.from({ length: 33 }, (_, index) => ({
  id: index + 1,
  label: `热泵${index + 1}`,
}))

const PARAMETER_ROWS = [
  { id: 'heatingTemp', label: '制热温度（℃）', min: 20, max: 60, step: 1, suffix: '℃' },
  { id: 'coolingTemp', label: '制冷温度（℃）', min: 7, max: 20, step: 1, suffix: '℃' },
  { id: 'heatControlDiff', label: '制热控制回差（℃）', min: 0, max: 5, step: 1, suffix: '℃' },
  { id: 'coolControlDiff', label: '制冷控制回差（℃）', min: 0, max: 5, step: 1, suffix: '℃' },
  { id: 'runProtectionJudge', label: '热泵持续运行保护判断时长（h）', min: 0, max: 50, step: 1, suffix: 'h' },
  { id: 'shutdownProtection', label: '热泵运行保护停机时长（min）', min: 0, max: 60, step: 1, suffix: 'min' },
]

const DETAIL_METRICS = [
  { key: 'inletWaterTemp', label: '进水温度(℃)', value: '-10' },
  { key: 'outletWaterTemp', label: '出水温度(℃)', value: '-10' },
  { key: 'ambientTemp', label: '环境温度(℃)', value: '-10' },
  { key: 'compressor1Current', label: '压缩机1电流(A)', value: '2' },
  { key: 'compressor2Current', label: '压缩机2电流(A)', value: '2' },
  { key: 'totalRunHours', label: '累计运行时长(h)', value: '0' },
  { key: 'defrostState', label: '防冻状态', value: '开' },
  { key: 'modeState', label: '模式状态', value: '制热' },
  { key: 'frostState', label: '化霜状态', value: '关' },
  { key: 'faultState', label: '故障状态', value: '关' },
  { key: 'mainboardSignalA', label: '主板开机信号状态', value: '关' },
  { key: 'continuousRunA', label: '持续运行时长(h)', value: '正常' },
  { key: 'faultStateB', label: '故障状态', value: '关' },
  { key: 'mainboardSignalB', label: '主板开机信号状态', value: '关' },
  { key: 'continuousRunB', label: '持续运行时长(h)', value: '正常' },
]

function HeatPumpPage() {
  const [isGroupControlEnabled, setIsGroupControlEnabled] = useState(true)
  const [selectedHeatPumpId, setSelectedHeatPumpId] = useState(1)
  const [parameters, setParameters] = useState({
    heatingTemp: '50',
    coolingTemp: '15',
    heatControlDiff: '3',
    coolControlDiff: '3',
    runProtectionJudge: '25',
    shutdownProtection: '30',
  })

  const updateParameter = (key, value) => {
    setParameters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const detailTitle = !isGroupControlEnabled ? `热泵${selectedHeatPumpId}详细参数` : '热泵详细参数'
  const stateLabel = !isGroupControlEnabled ? `热泵${selectedHeatPumpId}状态` : '热泵状态'
  const parameterTitle = !isGroupControlEnabled ? `热泵${selectedHeatPumpId}参数设置` : '参数设置'

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
              options={HEAT_PUMP_OPTIONS.map((item) => ({
                value: item.id,
                label: item.label,
              }))}
              value={selectedHeatPumpId}
              onChange={setSelectedHeatPumpId}
              triggerAriaLabel="选择热泵"
              listAriaLabel="热泵列表"
              confirmConfig={({ nextValue }) => ({ message: `确认切换为热泵${nextValue}吗？` })}
            />
          </div>

          <h3 className="heat-pump-page__section-title">{detailTitle}</h3>

          <div className="heat-pump-page__state-card">
            <span className="heat-pump-page__state-label">{stateLabel}</span>
            <span className="heat-pump-page__state-value">
              <img src={malfunctionIcon} alt="" aria-hidden="true" />
              故障
            </span>
          </div>

          <div className="heat-pump-page__metrics-grid">
            {DETAIL_METRICS.map((item) => (
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
              onChange={(value) => updateParameter(row.id, value)}
              keypadTitle={row.label}
              confirmConfig={({ nextValue }) => ({ message: `确认将${row.label}设置为 ${nextValue}${row.suffix} 吗？` })}
            />
          ))}
        </div>
      </section>
    </main>
  )
}

export default HeatPumpPage
