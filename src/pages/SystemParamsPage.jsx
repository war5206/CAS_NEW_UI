import { useEffect, useMemo, useState } from 'react'
import SelectDropdown from '../components/SelectDropdown'
import NumericKeypadModal from '../components/NumericKeypadModal'
import hpRunningIcon from '../assets/heat-pump/hp-running.svg'
import hpNullIcon from '../assets/heat-pump/hp-null.svg'
import { HEAT_PUMP_GRID_ITEMS } from '../config/homeHeatPumps'
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
  { value: 'other', label: '其他主板' },
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

const ENERGY_PRICE_TABS = [
  { value: 'water', label: '水' },
  { value: 'electricity', label: '电' },
  { value: 'gas', label: '气' },
]

const COUPLING_ENERGY_TYPES = ['电锅炉', '燃气锅炉', '水源热泵', '风冷热块', '无耦合能源']

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

const UNIT_LAYOUT_COLS = 10
const UNIT_LAYOUT_ROWS = 6
const UNIT_TOTAL = 14

const initialProjectForm = {
  projectType: 'cooling-heating',
  terminalType: 'floor-heating',
  systemType: 'primary',
  province: 'jiangsu',
  city: 'lianyungang',
  heatPumpCount: '12',
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

const initialEnergyPriceState = {
  tab: 'water',
  waterFixed: '9.00',
  gasFixed: '4.80',
  electricPlans: [
    {
      id: 1,
      label: '1月1日 - 6月30日',
      segments: [
        { start: '00:00', end: '06:00', price: '0.38', color: '#2387f0' },
        { start: '06:00', end: '12:00', price: '0.60', color: '#efc443' },
        { start: '12:00', end: '16:00', price: '0.75', color: '#ff7a45' },
        { start: '16:00', end: '20:00', price: '0.52', color: '#2dd283' },
        { start: '20:00', end: '24:00', price: '0.75', color: '#ff7a45' },
      ],
    },
  ],
}

const initialCouplingEnergyState = {
  type: '电锅炉',
  count: '0',
}

const UNIT_PUMP_ITEMS = HEAT_PUMP_GRID_ITEMS.filter((item) => item.id !== null)
  .sort((a, b) => a.id - b.id)
  .slice(0, UNIT_TOTAL)

const UNIT_PUMP_ID_SET = new Set(UNIT_PUMP_ITEMS.map((item) => item.id))

function createInitialUnitSlots() {
  const slots = Array.from({ length: UNIT_LAYOUT_COLS * UNIT_LAYOUT_ROWS }, () => null)

  UNIT_PUMP_ITEMS.forEach((item) => {
    if (item.row > UNIT_LAYOUT_ROWS || item.col > UNIT_LAYOUT_COLS) {
      return
    }
    const index = (item.row - 1) * UNIT_LAYOUT_COLS + (item.col - 1)
    slots[index] = item.id
  })

  return slots
}

const INITIAL_UNIT_LAYOUT_STATE = {
  slots: createInitialUnitSlots(),
  pendingIds: [],
  layoutLocked: false,
  numberingDone: false,
  numberingMap: {},
  showOriginalNo: false,
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

function toNoLabel(id) {
  return `NO${String(id).padStart(2, '0')}`
}

function SystemParamsPage({ onUnsavedGuardChange, onSecondaryNavVisibilityChange, onModuleTabsVisibilityChange }) {
  const [activeView, setActiveView] = useState('overview')
  const [mainboard, setMainboard] = useState('jingchuang')
  const [projectForm, setProjectForm] = useState(initialProjectForm)
  const [loopPumpForm, setLoopPumpForm] = useState(initialLoopPumpForm)
  const [simpleForms, setSimpleForms] = useState(initialSimpleForms)
  const [energyPriceState, setEnergyPriceState] = useState(initialEnergyPriceState)
  const [couplingEnergyState, setCouplingEnergyState] = useState(initialCouplingEnergyState)
  const [energyPriceModalOpen, setEnergyPriceModalOpen] = useState(false)
  const [keypadState, setKeypadState] = useState({ open: false, field: null, moduleKey: null })

  const [unitSlots, setUnitSlots] = useState(INITIAL_UNIT_LAYOUT_STATE.slots)
  const [pendingUnitIds, setPendingUnitIds] = useState(INITIAL_UNIT_LAYOUT_STATE.pendingIds)
  const [unitLayoutLocked, setUnitLayoutLocked] = useState(INITIAL_UNIT_LAYOUT_STATE.layoutLocked)
  const [unitNumberingMap, setUnitNumberingMap] = useState(INITIAL_UNIT_LAYOUT_STATE.numberingMap)
  const [unitNumberingDone, setUnitNumberingDone] = useState(INITIAL_UNIT_LAYOUT_STATE.numberingDone)
  const [showOriginalNo, setShowOriginalNo] = useState(INITIAL_UNIT_LAYOUT_STATE.showOriginalNo)

  const activeProvince = useMemo(
    () => REGION_OPTIONS.find((item) => item.value === projectForm.province) ?? REGION_OPTIONS[0],
    [projectForm.province],
  )

  const cityOptions = activeProvince?.cities ?? []

  const addedUnitIds = useMemo(() => unitSlots.filter((id) => id != null), [unitSlots])
  const nextUnitNumber = useMemo(() => Object.keys(unitNumberingMap).length + 1, [unitNumberingMap])
  const canFinishLayout = pendingUnitIds.length === 0 && addedUnitIds.length > 0 && !unitLayoutLocked
  const canFinishNumbering = unitLayoutLocked && !unitNumberingDone && Object.keys(unitNumberingMap).length === addedUnitIds.length

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

  const activeDirty = useMemo(() => {
    if (activeView === 'project-system-type') {
      return JSON.stringify(projectForm) !== JSON.stringify(initialProjectForm)
    }

    if (activeView === 'loop-pump-count') {
      return JSON.stringify(loopPumpForm) !== JSON.stringify(initialLoopPumpForm)
    }

    if (activeView === 'unit-layout') {
      return JSON.stringify({
        slots: unitSlots,
        pendingIds: pendingUnitIds,
        layoutLocked: unitLayoutLocked,
        numberingDone: unitNumberingDone,
        numberingMap: unitNumberingMap,
        showOriginalNo,
      }) !== JSON.stringify(INITIAL_UNIT_LAYOUT_STATE)
    }

    if (activeView === 'energy-price') {
      return JSON.stringify(energyPriceState) !== JSON.stringify(initialEnergyPriceState)
    }

    if (activeView === 'coupling-energy') {
      return JSON.stringify(couplingEnergyState) !== JSON.stringify(initialCouplingEnergyState)
    }

    if (MODULE_ITEMS.some((item) => item.key === activeView && !['project-system-type', 'loop-pump-count', 'unit-layout', 'energy-price', 'coupling-energy'].includes(item.key))) {
      return JSON.stringify(simpleForms[activeView]) !== JSON.stringify(initialSimpleForms[activeView])
    }

    return false
  }, [
    activeView,
    projectForm,
    loopPumpForm,
    unitSlots,
    pendingUnitIds,
    unitLayoutLocked,
    unitNumberingDone,
    unitNumberingMap,
    showOriginalNo,
    energyPriceState,
    couplingEnergyState,
    simpleForms,
  ])

  useEffect(() => {
    const shouldEnableGuard = activeView !== 'overview' && activeDirty
    onUnsavedGuardChange?.({ active: shouldEnableGuard, message: '当前页面有未保存更改，是否退出？' })

    return () => {
      onUnsavedGuardChange?.({ active: false, message: '当前页面有未保存更改，是否退出？' })
    }
  }, [activeDirty, activeView, onUnsavedGuardChange])

  const openNumberPad = (field, moduleKey = null) => {
    setKeypadState({ open: true, field, moduleKey })
  }

  const handleBackToOverview = () => {
    if (activeDirty && !window.confirm('当前页面有未保存更改，是否退出？')) {
      return
    }
    setActiveView('overview')
  }

  const handleOpenModule = (moduleKey) => {
    if (activeView !== 'overview' && activeDirty && !window.confirm('当前页面有未保存更改，是否退出？')) {
      return
    }
    setActiveView(moduleKey)
  }

  const handleKeypadConfirm = (value) => {
    if (keypadState.moduleKey === 'energy-water') {
      setEnergyPriceState((previous) => ({ ...previous, waterFixed: value }))
    } else if (keypadState.moduleKey === 'energy-gas') {
      setEnergyPriceState((previous) => ({ ...previous, gasFixed: value }))
    } else if (keypadState.moduleKey === 'coupling-count') {
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

  const resetUnitLayout = () => {
    setUnitSlots(INITIAL_UNIT_LAYOUT_STATE.slots)
    setPendingUnitIds(INITIAL_UNIT_LAYOUT_STATE.pendingIds)
    setUnitLayoutLocked(INITIAL_UNIT_LAYOUT_STATE.layoutLocked)
    setUnitNumberingDone(INITIAL_UNIT_LAYOUT_STATE.numberingDone)
    setUnitNumberingMap(INITIAL_UNIT_LAYOUT_STATE.numberingMap)
    setShowOriginalNo(INITIAL_UNIT_LAYOUT_STATE.showOriginalNo)
  }

  const handleSmartScan = () => {
    const allIds = [...new Set([...pendingUnitIds, ...addedUnitIds])].filter((id) => UNIT_PUMP_ID_SET.has(id)).sort((a, b) => a - b)
    setPendingUnitIds(allIds)
    setUnitSlots(Array.from({ length: UNIT_LAYOUT_COLS * UNIT_LAYOUT_ROWS }, () => null))
    setUnitLayoutLocked(false)
    setUnitNumberingDone(false)
    setUnitNumberingMap({})
    setShowOriginalNo(false)
  }

  const movePumpToSlot = (pumpId, targetIndex) => {
    if (unitLayoutLocked) {
      return
    }

    setUnitSlots((previous) => {
      const next = [...previous]
      const sourceIndex = next.findIndex((id) => id === pumpId)
      if (sourceIndex >= 0) {
        next[sourceIndex] = null
      }

      const displacedId = next[targetIndex]
      next[targetIndex] = pumpId

      setPendingUnitIds((previousPending) => {
        let nextPending = previousPending.filter((id) => id !== pumpId)
        if (displacedId != null) {
          nextPending = [...nextPending, displacedId]
        }
        return Array.from(new Set(nextPending)).sort((a, b) => a - b)
      })

      return next
    })
  }

  const handleCompleteLayout = () => {
    if (!canFinishLayout) {
      return
    }
    setUnitLayoutLocked(true)
    setUnitNumberingDone(false)
    setUnitNumberingMap({})
    setShowOriginalNo(false)
  }

  const handleUnitCardClick = (pumpId) => {
    if (!unitLayoutLocked || unitNumberingDone || unitNumberingMap[pumpId]) {
      return
    }

    setUnitNumberingMap((previous) => ({
      ...previous,
      [pumpId]: Object.keys(previous).length + 1,
    }))
  }

  const handleCompleteNumbering = () => {
    if (!canFinishNumbering) {
      return
    }
    setUnitNumberingDone(true)
  }

  const renderOverview = () => (
    <div className="system-params-overview">
      {MODULE_ITEMS.slice(0, 4).map((item) => (
        <button key={item.key} type="button" className="system-params-card" onClick={() => handleOpenModule(item.key)}>
          <span>{item.label}</span>
          <span className="system-params-card__arrow">›</span>
        </button>
      ))}

      <div className="system-params-card system-params-card--inline">
        <span>主板类型</span>
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
        className="system-params-card system-params-card--inline"
        onClick={() => handleOpenModule('coupling-energy')}
      >
        <span>耦合能源</span>
        <span className="system-params-inline-meta">{`${couplingEnergyState.type}，${couplingEnergyState.count}台`}</span>
        <span className="system-params-card__arrow">›</span>
      </button>
    </div>
  )

  const renderProjectSystemTypeForm = () => (
    <div className="system-params-detail">
      <div className="system-params-detail__header">
        <button type="button" className="system-params-back" onClick={handleBackToOverview}>‹</button>
        <h3>项目系统类型</h3>
        <button type="button" className="system-params-save">保存</button>
      </div>

      <div className="system-params-form-grid">
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
            <SelectDropdown
              value={projectForm.city}
              options={cityOptions}
              onChange={(value) => setProjectForm((prev) => ({ ...prev, city: value }))}
            />
          </div>
        </div>

        <button type="button" className="system-params-field system-params-field--input" onClick={() => openNumberPad('heatPumpCount')}>
          <span>热泵总台数</span>
          <div>{projectForm.heatPumpCount} 台</div>
        </button>

        <button type="button" className="system-params-field system-params-field--input" onClick={() => openNumberPad('heatingArea')}>
          <span>供暖面积</span>
          <div>{projectForm.heatingArea} m²</div>
        </button>

        <div className="system-params-field system-params-field--date">
          <span>采暖季</span>
          <div className="system-params-date-range">
            <label>
              <input type="date" value={projectForm.heatingSeasonStart} onChange={(event) => setProjectForm((prev) => ({ ...prev, heatingSeasonStart: event.target.value }))} />
              <span>{formatDateInput(projectForm.heatingSeasonStart)}</span>
            </label>
            <em>-</em>
            <label>
              <input type="date" value={projectForm.heatingSeasonEnd} onChange={(event) => setProjectForm((prev) => ({ ...prev, heatingSeasonEnd: event.target.value }))} />
              <span>{formatDateInput(projectForm.heatingSeasonEnd)}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )

  const renderLoopPumpCountDetail = () => (
    <div className="system-params-detail">
      <div className="system-params-detail__header">
        <button type="button" className="system-params-back" onClick={handleBackToOverview}>‹</button>
        <h3>循环泵台数</h3>
        <button type="button" className="system-params-save">保存</button>
      </div>

      <div className="system-params-form-grid">
        <label className="system-params-field">
          <span>主泵循环台数</span>
          <SelectDropdown value={loopPumpForm.mainPumpCount} options={LOOP_PUMP_COUNT_OPTIONS} onChange={(value) => setLoopPumpForm((prev) => ({ ...prev, mainPumpCount: value }))} />
        </label>

        <label className="system-params-field">
          <span>备泵循环泵台数</span>
          <SelectDropdown value={loopPumpForm.standbyPumpCount} options={LOOP_PUMP_COUNT_OPTIONS} onChange={(value) => setLoopPumpForm((prev) => ({ ...prev, standbyPumpCount: value }))} />
        </label>
      </div>
    </div>
  )

  const renderUnitLayoutDetail = () => (
    <div className="system-params-detail system-layout-detail">
      <div className="system-params-detail__header">
        <button type="button" className="system-params-back" onClick={handleBackToOverview}>‹</button>
        <h3>机组排布</h3>
      </div>

      <div className="unit-layout-wrap">
        <div className="unit-layout-main">
          <div className="unit-layout-pending-header">
            <strong>待添加（{pendingUnitIds.length}）</strong>
            <span>操作提醒：点击1次即选中，长按3秒即启动风扇点。可拖动到下层区域进行布局</span>
          </div>
          <div className="unit-layout-pending-list">
            {pendingUnitIds.map((id) => (
              <button
                key={`pending-${id}`}
                type="button"
                className="unit-layout-pending-card"
                draggable={!unitLayoutLocked}
                onDragStart={(event) => event.dataTransfer.setData('text/plain', String(id))}
              >
                <span>{toNoLabel(id)}</span>
                <img src={hpNullIcon} alt="" aria-hidden="true" />
              </button>
            ))}
          </div>

          <div className="unit-layout-added-title">已添加（{addedUnitIds.length}）</div>
          <div className="unit-layout-grid-head">
            {Array.from({ length: UNIT_LAYOUT_COLS }, (_, index) => (
              <span key={`col-${index + 1}`}>{index + 1}</span>
            ))}
            <em>列</em>
          </div>

          <div className="unit-layout-grid-body">
            {Array.from({ length: UNIT_LAYOUT_ROWS }, (_, index) => (
              <span key={`row-${index + 1}`} className="unit-layout-row-label">{index + 1}</span>
            ))}

            <div className="unit-layout-grid">
              {unitSlots.map((pumpId, index) => {
                const displayLabel = pumpId
                  ? showOriginalNo
                    ? toNoLabel(pumpId)
                    : unitNumberingMap[pumpId] ?? toNoLabel(pumpId)
                  : ''

                return (
                  <button
                    key={`slot-${index}`}
                    type="button"
                    className={`unit-layout-slot${pumpId ? ' has-pump' : ''}${unitLayoutLocked && !unitNumberingDone ? ' is-numbering' : ''}`}
                    draggable={Boolean(pumpId) && !unitLayoutLocked}
                    onDragStart={(event) => {
                      if (pumpId) {
                        event.dataTransfer.setData('text/plain', String(pumpId))
                      }
                    }}
                    onDragOver={(event) => {
                      if (!unitLayoutLocked) {
                        event.preventDefault()
                      }
                    }}
                    onDrop={(event) => {
                      if (unitLayoutLocked) {
                        return
                      }
                      event.preventDefault()
                      const dragId = Number(event.dataTransfer.getData('text/plain'))
                      if (dragId) {
                        movePumpToSlot(dragId, index)
                      }
                    }}
                    onClick={() => {
                      if (pumpId) {
                        handleUnitCardClick(pumpId)
                      }
                    }}
                  >
                    {pumpId ? <div className="unit-layout-slot-label">{displayLabel}</div> : null}
                    <img src={pumpId ? hpRunningIcon : hpNullIcon} alt="" aria-hidden="true" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <aside className="unit-layout-flow">
          <div className="unit-layout-flow__header">
            <h4>操作流程</h4>
            <button type="button" onClick={resetUnitLayout}>复位</button>
          </div>

          <div className="unit-layout-flow__step">
            <b>01 添加热泵{pendingUnitIds.length}/{UNIT_TOTAL}</b>
            <small>读取处于激活状态的热泵</small>
            <button type="button" className="is-active" onClick={handleSmartScan}>智能扫描</button>
          </div>

          <div className="unit-layout-flow__step">
            <b>02 热泵布局</b>
            <small>布局完成不可更改</small>
            <button type="button" className={canFinishLayout ? 'is-active' : ''} onClick={handleCompleteLayout}>布局完成</button>
          </div>

          <div className="unit-layout-flow__step">
            <b>03 热泵编号</b>
            <small>{unitLayoutLocked && !unitNumberingDone ? `点击热泵按顺序编号，下一位：${nextUnitNumber}` : '编号完成后可切换显示'}</small>
            <button
              type="button"
              className={unitLayoutLocked && !unitNumberingDone ? 'is-active' : ''}
              onClick={() => {
                if (unitLayoutLocked) {
                  setUnitNumberingDone(false)
                  setShowOriginalNo(false)
                }
              }}
            >
              重新编号
            </button>
            <div className="unit-layout-flow__row">
              <button type="button" className={canFinishNumbering ? 'is-active' : ''} onClick={handleCompleteNumbering}>编号完成</button>
              <button type="button" className="unit-layout-flow__eye" onClick={() => setShowOriginalNo((prev) => !prev)}>
                {showOriginalNo ? '🙈' : '👁'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )


  const renderEnergyPriceDetail = () => {
    const isWater = energyPriceState.tab === 'water'
    const isElectricity = energyPriceState.tab === 'electricity'
    const isGas = energyPriceState.tab === 'gas'

    return (
      <div className="system-params-detail">
        <div className="system-params-detail__header">
          <button type="button" className="system-params-back" onClick={handleBackToOverview}>‹</button>
          <h3>能源价格</h3>
          <button type="button" className="system-params-save">保存</button>
        </div>

        <div className="energy-price-tabs">
          {ENERGY_PRICE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`energy-price-tab${energyPriceState.tab === tab.value ? ' is-active' : ''}`}
              onClick={() => setEnergyPriceState((previous) => ({ ...previous, tab: tab.value }))}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <p className="energy-price-tip">填写固定价格，峰谷电价格将统一设置为相同的固定值。</p>

        {isWater || isGas ? (
          <button
            type="button"
            className="system-params-field system-params-field--input energy-price-fixed"
            onClick={() => openNumberPad('value', isWater ? 'energy-water' : 'energy-gas')}
          >
            <span>固定价格</span>
            <div>{isWater ? energyPriceState.waterFixed : energyPriceState.gasFixed} 元/m²</div>
          </button>
        ) : null}

        {isElectricity ? (
          <div className="energy-price-electric">
            <button type="button" className="energy-price-add" onClick={() => setEnergyPriceModalOpen(true)}>＋ 新增</button>
            {energyPriceState.electricPlans.map((plan) => (
              <div key={plan.id} className="energy-price-plan">
                <div className="energy-price-plan__head">
                  <span>{plan.label}</span>
                  <button type="button" onClick={() => setEnergyPriceModalOpen(true)}>✎</button>
                </div>
                <div className="energy-price-plan__times">
                  {plan.segments.map((segment) => (
                    <span key={`${plan.id}-${segment.start}`}>{segment.start}</span>
                  ))}
                  <span>24:00</span>
                </div>
                <div className="energy-price-plan__bar">
                  {plan.segments.map((segment) => (
                    <div key={`${plan.id}-${segment.start}-bar`} style={{ background: segment.color }}>
                      {segment.price}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {energyPriceModalOpen ? (
          <div className="energy-price-modal-backdrop" onClick={() => setEnergyPriceModalOpen(false)}>
            <div className="energy-price-modal" onClick={(event) => event.stopPropagation()}>
              <div className="energy-price-modal__header">
                <h4>新增价格</h4>
                <button type="button" onClick={() => setEnergyPriceModalOpen(false)}>×</button>
              </div>
              <div className="energy-price-modal__body">
                <section>
                  <h5>月份</h5>
                  <div className="energy-price-modal__row">
                    <span>00:00</span><em>—</em><span>08:00</span>
                  </div>
                </section>
                <section>
                  <h5>时段价格设置</h5>
                  <div className="energy-price-modal__row">
                    <span>00:00</span><em>—</em><span>08:00</span><span>0.38</span>
                  </div>
                  <div className="energy-price-modal__row">
                    <span>00:00</span><em>—</em><span>08:00</span><span className="is-placeholder">请输入价格</span>
                  </div>
                  <button type="button" className="energy-price-modal__add">＋ 新增时段</button>
                </section>
              </div>
              <div className="energy-price-modal__actions">
                <button type="button" className="is-danger">删除方案</button>
                <button type="button" className="is-primary" onClick={() => setEnergyPriceModalOpen(false)}>确定</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  const renderCouplingEnergyDetail = () => (
    <div className="system-params-detail">
      <div className="system-params-detail__header">
        <button type="button" className="system-params-back" onClick={handleBackToOverview}>‹</button>
        <h3>耦合能源</h3>
        <button type="button" className="system-params-save">保存</button>
      </div>

      <div className="coupling-energy-detail">
        <div className="coupling-energy-detail__label">能源类型</div>
        <div className="coupling-energy-detail__types">
          {COUPLING_ENERGY_TYPES.map((item) => (
            <button
              key={item}
              type="button"
              className={`coupling-energy-type${couplingEnergyState.type === item ? ' is-active' : ''}`}
              onClick={() => setCouplingEnergyState((previous) => ({ ...previous, type: item }))}
            >
              {item}
            </button>
          ))}
        </div>

        <button type="button" className="system-params-field system-params-field--input coupling-energy-count" onClick={() => openNumberPad('value', 'coupling-count')}>
          <span>耦合能源台数</span>
          <div>{couplingEnergyState.count} 台</div>
        </button>
      </div>
    </div>
  )

  const renderSimpleDetail = () => {
    const activeItem = MODULE_ITEMS.find((item) => item.key === activeView)
    return (
      <div className="system-params-detail">
        <div className="system-params-detail__header">
          <button type="button" className="system-params-back" onClick={handleBackToOverview}>‹</button>
          <h3>{activeItem?.label}</h3>
          <button type="button" className="system-params-save">保存</button>
        </div>

        <button type="button" className="system-params-field system-params-field--input system-params-simple-input" onClick={() => openNumberPad('value', activeView)}>
          <span>参数值</span>
          <div>{simpleForms[activeView].value}</div>
        </button>
      </div>
    )
  }

  return (
    <div className="system-params-page">
      {activeView === 'overview' ? renderOverview() : null}
      {activeView === 'project-system-type' ? renderProjectSystemTypeForm() : null}
      {activeView === 'loop-pump-count' ? renderLoopPumpCountDetail() : null}
      {activeView === 'unit-layout' ? renderUnitLayoutDetail() : null}
      {activeView === 'energy-price' ? renderEnergyPriceDetail() : null}
      {activeView === 'coupling-energy' ? renderCouplingEnergyDetail() : null}
      {activeView !== 'overview' && !['project-system-type', 'loop-pump-count', 'unit-layout', 'energy-price', 'coupling-energy'].includes(activeView) ? renderSimpleDetail() : null}

      <NumericKeypadModal
        isOpen={keypadState.open}
        initialValue={
          keypadState.moduleKey === 'energy-water'
            ? energyPriceState.waterFixed
            : keypadState.moduleKey === 'energy-gas'
              ? energyPriceState.gasFixed
              : keypadState.moduleKey === 'coupling-count'
                ? couplingEnergyState.count
                : keypadState.moduleKey
                  ? simpleForms[keypadState.moduleKey]?.value
                  : projectForm[keypadState.field]
        }
        title="输入参数"
        onConfirm={handleKeypadConfirm}
        onClose={() => setKeypadState({ open: false, field: null, moduleKey: null })}
      />
    </div>
  )
}

export default SystemParamsPage
