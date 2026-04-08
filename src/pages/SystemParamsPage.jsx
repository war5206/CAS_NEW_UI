import { useEffect, useMemo, useRef, useState } from 'react'
import SelectDropdown from '../components/SelectDropdown'
import NumericKeypadModal from '../components/NumericKeypadModal'
import TimePickerModal from '../components/TimePickerModal'
import AttentionModal from '../components/AttentionModal'
import SystemParamsEnergyPrice from '../components/systemParams/SystemParamsEnergyPrice'
import SystemParamsUnitLayout from '../components/systemParams/SystemParamsUnitLayout'
import basicSettingWaterPumpIcon from '../assets/basic-setting-water-pump.svg'
import basicSettingHpPositionIcon from '../assets/basic-setting-hp-position.svg'
import basicSettingSystemTypeIcon from '../assets/basic-setting-system-type.svg'
import basicSettingEnergyPriceIcon from '../assets/basic-setting-energy-price.svg'
import basicSettingMotherBoardIcon from '../assets/basic-setting-mother-board.svg'
import couplingEnergyIcon from '../assets/icons/couple-energy.svg'
import arrowRightSelectedIcon from '../assets/arrow-right-blackbg.svg'
import arrowLeftSelectedIcon from '../assets/arrow-left-blackbg.svg'
import dateIcon from '../assets/icons/date.svg'
import './SystemParamsPage.css'

const MODULE_ITEMS = [
  { key: 'project-system-type', label: '项目系统类型' },
  { key: 'loop-pump-count', label: '循环泵台数' },
  { key: 'unit-layout', label: '机组排布' },
  { key: 'energy-price', label: '能源价格' },
  { key: 'coupling-energy', label: '耦合能源' },
]

const MAINBOARD_OPTIONS = [
  { value: 'jingchuang', label: '精创主板' },
  { value: 'other', label: '自制主板' },
]

const PROJECT_TYPE_OPTIONS = [
  { value: 'heating', label: '采暖' },
  { value: 'cooling-heating', label: '冷暖' },
  { value: 'hot-water', label: '热水' },
]

const TERMINAL_TYPE_OPTIONS = [
  { value: 'floor-heating', label: '地暖' },
  { value: 'radiator', label: '暖气片' },
  { value: 'fan-coil', label: '风机盘管' },
]

const SYSTEM_TYPE_OPTIONS = [
  { value: 'primary', label: '一次系统' },
  { value: 'secondary', label: '二次系统' },
]

const LOOP_PUMP_COUNT_OPTIONS = [
  { value: '1', label: '1台' },
  { value: '2', label: '2台' },
  { value: '3', label: '3台' },
  { value: '4', label: '4台' },
  { value: '5', label: '5台' },
]

const COUPLING_ENERGY_TYPES = ['电锅炉', '燃气锅炉', '水源热泵', '风冷模块', '无耦合能源']

const REGION_OPTIONS = [
  {
    value: 'jiangsu',
    label: '江苏省',
    cities: [
      { value: 'nanjing', label: '南京市' },
      { value: 'lianyungang', label: '连云港市' },
      { value: 'suzhou', label: '苏州市' },
    ],
  },
  {
    value: 'zhejiang',
    label: '浙江省',
    cities: [
      { value: 'hangzhou', label: '杭州市' },
      { value: 'ningbo', label: '宁波市' },
    ],
  },
  {
    value: 'beijing',
    label: '北京市',
    cities: [
      { value: 'chaoyang', label: '朝阳区' },
      { value: 'haidian', label: '海淀区' },
    ],
  },
]

const DATE_PICKER_YEARS = Array.from({ length: 61 }, (_, index) => 2000 + index)
const DATE_PICKER_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)
const DATE_PICKER_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)
const UNSAVED_MESSAGE = '当前页面有未保存修改，是否退出？'
const SAVE_CONFIRM_MESSAGE = '确认保存当前参数吗？'
const DETAIL_MAIN_KEYS = ['project-system-type', 'loop-pump-count', 'unit-layout', 'energy-price', 'coupling-energy']

const CARD_ICON_MAP = {
  'project-system-type': basicSettingSystemTypeIcon,
  'loop-pump-count': basicSettingWaterPumpIcon,
  'unit-layout': basicSettingHpPositionIcon,
  'energy-price': basicSettingEnergyPriceIcon,
}

const initialProjectForm = {
  projectType: 'cooling-heating',
  terminalType: 'floor-heating',
  systemType: 'primary',
  province: 'jiangsu',
  city: 'lianyungang',
  heatPumpCount: '33',
  heatingArea: '27000',
  heatingSeasonStart: '2024-06-01',
  heatingSeasonEnd: '',
}

const initialLoopPumpForm = {
  mainPumpCount: '2',
  standbyPumpCount: '1',
}

const initialSimpleForms = {
  'energy-price': { value: '0.56' },
  'coupling-energy': { value: '电锅炉 2台' },
}

const initialCouplingEnergyState = {
  type: '无耦合能源',
  count: '0',
}

function formatDateInput(value) {
  if (!value) {
    return '请选择时间'
  }

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) {
    return value
  }
  return `${year}年${month}月${day}日`
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

function parseDateString(value) {
  if (!value) {
    const now = new Date()
    return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
  }

  const [rawYear, rawMonth, rawDay] = value.split('-').map((item) => Number(item))
  if (!Number.isInteger(rawYear) || !Number.isInteger(rawMonth) || !Number.isInteger(rawDay)) {
    const now = new Date()
    return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
  }

  return [rawYear, rawMonth, rawDay]
}

function formatDateString(year, month, day) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function SystemParamsPage({
  onUnsavedGuardChange,
  onSecondaryNavVisibilityChange,
  onModuleTabsVisibilityChange,
  onDetailBreadcrumbChange,
  onUnitLayoutCommitted,
}) {
  const [activeView, setActiveView] = useState('overview')
  const [mainboard, setMainboard] = useState('jingchuang')
  const [projectForm, setProjectForm] = useState(() => deepClone(initialProjectForm))
  const [savedProjectForm, setSavedProjectForm] = useState(() => deepClone(initialProjectForm))
  const [loopPumpForm, setLoopPumpForm] = useState(() => deepClone(initialLoopPumpForm))
  const [savedLoopPumpForm, setSavedLoopPumpForm] = useState(() => deepClone(initialLoopPumpForm))
  const [simpleForms, setSimpleForms] = useState(() => deepClone(initialSimpleForms))
  const [savedSimpleForms, setSavedSimpleForms] = useState(() => deepClone(initialSimpleForms))
  const [couplingEnergyState, setCouplingEnergyState] = useState(() => deepClone(initialCouplingEnergyState))
  const [savedCouplingEnergyState, setSavedCouplingEnergyState] = useState(() => deepClone(initialCouplingEnergyState))
  const [keypadState, setKeypadState] = useState({ open: false, field: null, moduleKey: null })
  const [datePickerField, setDatePickerField] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, mode: null, targetView: null, title: '', message: '' })
  const [unitLayoutDirty, setUnitLayoutDirty] = useState(false)
  const [energyPriceDirty, setEnergyPriceDirty] = useState(false)

  const unitLayoutRef = useRef(null)
  const energyPriceRef = useRef(null)

  const activeProvince = useMemo(
    () => REGION_OPTIONS.find((item) => item.value === projectForm.province) ?? REGION_OPTIONS[0],
    [projectForm.province],
  )

  const cityOptions = activeProvince?.cities ?? []

  const datePickerValue = useMemo(() => {
    if (!datePickerField) {
      return []
    }
    return parseDateString(projectForm[datePickerField])
  }, [datePickerField, projectForm])

  useEffect(() => {
    const shouldHideSecondaryNav = activeView !== 'overview'
    onSecondaryNavVisibilityChange?.(shouldHideSecondaryNav)

    return () => {
      onSecondaryNavVisibilityChange?.(false)
    }
  }, [activeView, onSecondaryNavVisibilityChange])

  useEffect(() => {
    const shouldHideModuleTabs = activeView !== 'overview'
    onModuleTabsVisibilityChange?.(shouldHideModuleTabs)

    return () => {
      onModuleTabsVisibilityChange?.(false)
    }
  }, [activeView, onModuleTabsVisibilityChange])

  const activeDetailLabel = useMemo(() => {
    if (activeView === 'overview') {
      return null
    }
    return MODULE_ITEMS.find((item) => item.key === activeView)?.label ?? null
  }, [activeView])

  useEffect(() => {
    onDetailBreadcrumbChange?.(activeDetailLabel)
  }, [activeDetailLabel, onDetailBreadcrumbChange])

  useEffect(() => () => onDetailBreadcrumbChange?.(null), [onDetailBreadcrumbChange])

  const activeDirty = useMemo(() => {
    if (activeView === 'project-system-type') {
      return JSON.stringify(projectForm) !== JSON.stringify(savedProjectForm)
    }

    if (activeView === 'loop-pump-count') {
      return JSON.stringify(loopPumpForm) !== JSON.stringify(savedLoopPumpForm)
    }

    if (activeView === 'unit-layout') {
      return unitLayoutDirty
    }

    if (activeView === 'energy-price') {
      return energyPriceDirty
    }

    if (activeView === 'coupling-energy') {
      return JSON.stringify(couplingEnergyState) !== JSON.stringify(savedCouplingEnergyState)
    }

    if (MODULE_ITEMS.some((item) => item.key === activeView && !DETAIL_MAIN_KEYS.includes(item.key))) {
      return JSON.stringify(simpleForms[activeView]) !== JSON.stringify(savedSimpleForms[activeView])
    }

    return false
  }, [
    activeView,
    projectForm,
    savedProjectForm,
    loopPumpForm,
    savedLoopPumpForm,
    unitLayoutDirty,
    energyPriceDirty,
    couplingEnergyState,
    savedCouplingEnergyState,
    simpleForms,
    savedSimpleForms,
  ])

  useEffect(() => {
    const shouldEnableGuard = activeView !== 'overview' && activeDirty
    onUnsavedGuardChange?.({ active: shouldEnableGuard, message: UNSAVED_MESSAGE })

    return () => {
      onUnsavedGuardChange?.({ active: false, message: UNSAVED_MESSAGE })
    }
  }, [activeDirty, activeView, onUnsavedGuardChange])

  const openNumberPad = (field, moduleKey = null) => {
    setKeypadState({ open: true, field, moduleKey })
  }

  const openDiscardConfirm = (targetView = null) => {
    setConfirmDialog({ open: true, mode: 'discard', targetView, title: '', message: '' })
  }

  const openSaveConfirm = () => {
    setConfirmDialog({ open: true, mode: 'save', targetView: null, title: '', message: '' })
  }

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, mode: null, targetView: null, title: '', message: '' })
  }

  const handleBackToOverview = () => {
    if (activeDirty) {
      openDiscardConfirm()
      return
    }
    setDatePickerField(null)
    setActiveView('overview')
  }

  const handleOpenModule = (moduleKey) => {
    if (activeView !== 'overview' && activeDirty) {
      openDiscardConfirm(moduleKey)
      return
    }
    setDatePickerField(null)
    setActiveView(moduleKey)
  }

  const saveCurrentView = () => {
    if (activeView === 'project-system-type') {
      setSavedProjectForm(deepClone(projectForm))
      return
    }

    if (activeView === 'loop-pump-count') {
      setSavedLoopPumpForm(deepClone(loopPumpForm))
      return
    }

    if (activeView === 'unit-layout') {
      unitLayoutRef.current?.commit()
      return true
    }

    if (activeView === 'energy-price') {
      return energyPriceRef.current?.commit() ?? false
    }

    if (activeView === 'coupling-energy') {
      setSavedCouplingEnergyState(deepClone(couplingEnergyState))
      return
    }

    if (MODULE_ITEMS.some((item) => item.key === activeView && !DETAIL_MAIN_KEYS.includes(item.key))) {
      setSavedSimpleForms((previous) => ({
        ...previous,
        [activeView]: deepClone(simpleForms[activeView]),
      }))
    }
  }

  const handleConfirmDialogConfirm = () => {
    if (confirmDialog.mode === 'alert') {
      closeConfirmDialog()
      return
    }

    if (confirmDialog.mode === 'save') {
      const saveResult = saveCurrentView()
      if (saveResult === false) {
        return
      }
      closeConfirmDialog()
      return
    }

    if (confirmDialog.mode === 'discard') {
      setDatePickerField(null)
      if (confirmDialog.targetView) {
        setActiveView(confirmDialog.targetView)
      } else {
        setActiveView('overview')
      }
      closeConfirmDialog()
    }
  }

  const handleSaveClick = () => {
    openSaveConfirm()
  }

  const handleKeypadConfirm = (value) => {
    if (keypadState.moduleKey === 'coupling-count') {
      setCouplingEnergyState((previous) => ({ ...previous, count: value }))
    } else if (keypadState.moduleKey) {
      setSimpleForms((previous) => ({
        ...previous,
        [keypadState.moduleKey]: {
          value,
        },
      }))
    } else if (keypadState.field) {
      setProjectForm((previous) => ({
        ...previous,
        [keypadState.field]: value,
      }))
    }
    setKeypadState({ open: false, field: null, moduleKey: null })
  }

  const handleDateConfirm = (nextDateParts) => {
    if (!datePickerField || !Array.isArray(nextDateParts) || nextDateParts.length < 3) {
      setDatePickerField(null)
      return
    }

    const [rawYear, rawMonth, rawDay] = nextDateParts.map((item) => Number(item))
    const now = new Date()
    const year = Number.isInteger(rawYear) ? rawYear : now.getFullYear()
    const month = Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : now.getMonth() + 1
    const maxDay = new Date(year, month, 0).getDate()
    const day = Number.isInteger(rawDay) && rawDay >= 1 ? Math.min(rawDay, maxDay) : now.getDate()

    setProjectForm((previous) => ({
      ...previous,
      [datePickerField]: formatDateString(year, month, day),
    }))
    setDatePickerField(null)
  }

  const renderDetailHeader = (title) => (
    <div className="system-params-detail__header">
      <button type="button" className="system-params-back" onClick={handleBackToOverview}>
        <img src={arrowLeftSelectedIcon} alt="" aria-hidden="true" />
      </button>
      <h3>{title}</h3>
      <button type="button" className="system-params-save" onClick={handleSaveClick}>
        保存
      </button>
    </div>
  )

  const renderOverview = () => (
    <div className="system-params-overview">
      {MODULE_ITEMS.slice(0, 4).map((item) => (
        <button key={item.key} type="button" className="system-params-card" onClick={() => handleOpenModule(item.key)}>
          <span className="system-params-card__main">
            <img src={CARD_ICON_MAP[item.key]} alt="" aria-hidden="true" className="system-params-card__icon" />
            <span className="system-params-card__label">{item.label}</span>
          </span>
          <span className="system-params-card__arrow">
            <img src={arrowRightSelectedIcon} alt="" aria-hidden="true" />
          </span>
        </button>
      ))}

      <div className="system-params-card system-params-card--inline">
        <span className="system-params-card__main">
          <img src={basicSettingMotherBoardIcon} alt="" aria-hidden="true" className="system-params-card__icon" />
          <span className="system-params-card__label">主板类型</span>
        </span>
        <SelectDropdown
          value={mainboard}
          options={MAINBOARD_OPTIONS}
          onChange={setMainboard}
          triggerAriaLabel="选择主板类型"
          className="system-params-select"
        />
      </div>

      <button
        type="button"
        className="system-params-card system-params-card--inline system-params-card--coupling"
        onClick={() => handleOpenModule('coupling-energy')}
      >
        <span className="system-params-card__main">
          <img src={couplingEnergyIcon} alt="" aria-hidden="true" className="system-params-card__icon" />
          <span className="system-params-card__label">耦合能源</span>
        </span>
        <span className="system-params-card__tail">
          <span className="system-params-inline-meta">{`${couplingEnergyState.type} ${couplingEnergyState.count}台`}</span>
          <span className="system-params-card__arrow">
            <img src={arrowRightSelectedIcon} alt="" aria-hidden="true" />
          </span>
        </span>
      </button>
    </div>
  )

  const renderProjectSystemTypeForm = () => (
    <div className="system-params-detail">
      {renderDetailHeader('项目系统类型')}

      <div className="system-params-form-grid system-params-form-grid--project">
        <label className="system-params-field">
          <span>项目类型</span>
          <SelectDropdown value={projectForm.projectType} options={PROJECT_TYPE_OPTIONS} onChange={(value) => setProjectForm((prev) => ({ ...prev, projectType: value }))} />
        </label>

        <label className="system-params-field">
          <span>末端类型</span>
          <SelectDropdown value={projectForm.terminalType} options={TERMINAL_TYPE_OPTIONS} onChange={(value) => setProjectForm((prev) => ({ ...prev, terminalType: value }))} />
        </label>

        <label className="system-params-field">
          <span>系统类型</span>
          <SelectDropdown value={projectForm.systemType} options={SYSTEM_TYPE_OPTIONS} onChange={(value) => setProjectForm((prev) => ({ ...prev, systemType: value }))} />
        </label>

        <div className="system-params-field system-params-field--region">
          <span>区域</span>
          <div className="system-params-region-grid">
            <SelectDropdown
              value={projectForm.province}
              options={REGION_OPTIONS.map(({ value, label }) => ({ value, label }))}
              onChange={(value) => {
                const selectedProvince = REGION_OPTIONS.find((item) => item.value === value)
                setProjectForm((prev) => ({ ...prev, province: value, city: selectedProvince?.cities?.[0]?.value ?? '' }))
              }}
            />
            <SelectDropdown value={projectForm.city} options={cityOptions} onChange={(value) => setProjectForm((prev) => ({ ...prev, city: value }))} />
          </div>
        </div>

        <button type="button" className="system-params-field system-params-field--input" onClick={() => openNumberPad('heatPumpCount')}>
          <span>热泵总台数</span>
          <div className="system-params-input-display">
            <span>{projectForm.heatPumpCount}</span>
            <span className="system-params-input-unit">台</span>
          </div>
        </button>

        <button type="button" className="system-params-field system-params-field--input" onClick={() => openNumberPad('heatingArea')}>
          <span>供应面积</span>
          <div className="system-params-input-display">
            <span>{projectForm.heatingArea}</span>
            <span className="system-params-input-unit">m²</span>
          </div>
        </button>

        <div className="system-params-field system-params-field--date">
          <span>采暖季</span>
          <div className="system-params-date-range">
            <button type="button" onClick={() => setDatePickerField('heatingSeasonStart')}>
              <span className="system-params-date-value">{formatDateInput(projectForm.heatingSeasonStart)}</span>
              <img src={dateIcon} alt="" aria-hidden="true" className="system-params-date-icon" />
            </button>
            <em>-</em>
            <button type="button" onClick={() => setDatePickerField('heatingSeasonEnd')}>
              <span className="system-params-date-value">{formatDateInput(projectForm.heatingSeasonEnd)}</span>
              <img src={dateIcon} alt="" aria-hidden="true" className="system-params-date-icon" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderLoopPumpCountDetail = () => (
    <div className="system-params-detail">
      {renderDetailHeader('循环泵台数')}

      <div className="system-params-form-grid system-params-form-grid--loop-pump">
        <label className="system-params-field">
          <span>主泵循环台数</span>
          <SelectDropdown value={loopPumpForm.mainPumpCount} options={LOOP_PUMP_COUNT_OPTIONS} onChange={(value) => setLoopPumpForm((prev) => ({ ...prev, mainPumpCount: value }))} />
        </label>

        <label className="system-params-field">
          <span>备泵循环台数</span>
          <SelectDropdown value={loopPumpForm.standbyPumpCount} options={LOOP_PUMP_COUNT_OPTIONS} onChange={(value) => setLoopPumpForm((prev) => ({ ...prev, standbyPumpCount: value }))} />
        </label>
      </div>
    </div>
  )

  const renderCouplingEnergyDetail = () => (
    <div className="system-params-detail">
      {renderDetailHeader('耦合能源')}

      <div className="coupling-energy-detail">
        <div className="coupling-energy-detail__label">能源类型</div>
        <div className="coupling-energy-detail__types">
          {COUPLING_ENERGY_TYPES.map((item) => (
            <button
              key={item}
              type="button"
              className={`coupling-energy-type${couplingEnergyState.type === item ? ' is-active' : ''}`}
              onClick={() =>
                setCouplingEnergyState((previous) => ({
                  ...previous,
                  type: item,
                  count: item === '无耦合能源' ? '0' : previous.count,
                }))
              }
            >
              {item}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="system-params-field system-params-field--input coupling-energy-count"
          onClick={() => openNumberPad('value', 'coupling-count')}
          disabled={couplingEnergyState.type === '无耦合能源'}
        >
          <span>耦合能源台数</span>
          <div className="system-params-input-display">
            <span>{couplingEnergyState.count}</span>
            <span className="system-params-input-unit">台</span>
          </div>
        </button>
      </div>
    </div>
  )

  const renderSimpleDetail = () => {
    const activeItem = MODULE_ITEMS.find((item) => item.key === activeView)
    return (
      <div className="system-params-detail">
        {renderDetailHeader(activeItem?.label)}

        <button type="button" className="system-params-field system-params-field--input system-params-simple-input" onClick={() => openNumberPad('value', activeView)}>
          <span>参数值</span>
          <div>{simpleForms[activeView].value}</div>
        </button>
      </div>
    )
  }

  const confirmDialogMessage = confirmDialog.mode === 'save' ? SAVE_CONFIRM_MESSAGE : UNSAVED_MESSAGE

  return (
    <div className={`system-params-page${activeView === 'overview' ? ' is-overview' : ''}`}>
      {activeView === 'overview' ? renderOverview() : null}
      {activeView === 'project-system-type' ? renderProjectSystemTypeForm() : null}
      {activeView === 'loop-pump-count' ? renderLoopPumpCountDetail() : null}
      {activeView === 'unit-layout' ? (
        <SystemParamsUnitLayout
          ref={unitLayoutRef}
          variant="settings"
          heatPumpCount={projectForm.heatPumpCount}
          queryArrangeOnMount
          settingsHeader={renderDetailHeader('机组排布')}
          onDirtyChange={setUnitLayoutDirty}
          onUnitLayoutCommitted={onUnitLayoutCommitted}
        />
      ) : null}
      {activeView === 'energy-price' ? (
        <SystemParamsEnergyPrice ref={energyPriceRef} variant="settings" settingsHeader={renderDetailHeader('能源价格')} onDirtyChange={setEnergyPriceDirty} />
      ) : null}
      {activeView === 'coupling-energy' ? renderCouplingEnergyDetail() : null}
      {activeView !== 'overview' && !DETAIL_MAIN_KEYS.includes(activeView) ? renderSimpleDetail() : null}

      <NumericKeypadModal
        isOpen={keypadState.open}
        initialValue={
          keypadState.moduleKey === 'coupling-count'
            ? couplingEnergyState.count
            : keypadState.moduleKey
              ? simpleForms[keypadState.moduleKey]?.value
              : projectForm[keypadState.field]
        }
        title={
          keypadState.moduleKey === 'coupling-count'
            ? '耦合能源台数'
            : !keypadState.moduleKey && keypadState.field === 'heatPumpCount'
              ? '热泵总台数'
              : !keypadState.moduleKey && keypadState.field === 'heatingArea'
                ? '供应面积'
                : '输入参数'
        }
        onConfirm={handleKeypadConfirm}
        onClose={() => setKeypadState({ open: false, field: null, moduleKey: null })}
      />

      <TimePickerModal
        isOpen={Boolean(datePickerField)}
        title="日期选择"
        columns={[
          { key: 'year', options: DATE_PICKER_YEARS, formatter: (value) => String(value) },
          { key: 'month', options: DATE_PICKER_MONTHS, formatter: (value) => String(value).padStart(2, '0') },
          { key: 'day', options: DATE_PICKER_DAYS, formatter: (value) => String(value).padStart(2, '0') },
        ]}
        value={datePickerValue}
        onClose={() => setDatePickerField(null)}
        onConfirm={handleDateConfirm}
      />

      <AttentionModal
        isOpen={confirmDialog.open}
        title={
          confirmDialog.mode === 'alert'
            ? (confirmDialog.title || '提示')
            : confirmDialog.mode === 'save'
              ? '确认保存'
              : '确认退出'
        }
        message={confirmDialog.mode === 'alert' ? confirmDialog.message : confirmDialogMessage}
        confirmText={confirmDialog.mode === 'alert' ? '我知道了' : '确定'}
        showCancel={confirmDialog.mode !== 'alert'}
        onClose={closeConfirmDialog}
        onConfirm={handleConfirmDialogConfirm}
        onCancel={closeConfirmDialog}
      />
    </div>
  )
}

export default SystemParamsPage

