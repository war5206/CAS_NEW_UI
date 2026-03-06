import { useEffect, useMemo, useRef, useState } from 'react'
import SelectDropdown from '../components/SelectDropdown'
import NumericKeypadModal from '../components/NumericKeypadModal'
import TimePickerModal from '../components/TimePickerModal'
import hpRunningIcon from '../assets/heat-pump/hp-running.svg'
import hpNullIcon from '../assets/heat-pump/hp-null.svg'
import basicSettingWaterPumpIcon from '../assets/basic-setting-water-pump.svg'
import basicSettingHpPositionIcon from '../assets/basic-setting-hp-position.svg'
import basicSettingSystemTypeIcon from '../assets/basic-setting-system-type.svg'
import basicSettingEnergyPriceIcon from '../assets/basic-setting-energy-price.svg'
import basicSettingMotherBoardIcon from '../assets/basic-setting-mother-board.svg'
import couplingEnergyIcon from '../assets/icons/couple-energy.svg'
import arrowRightSelectedIcon from '../assets/arrow-right-blackbg.svg'
import arrowLeftSelectedIcon from '../assets/arrow-left-blackbg.svg'
import showIcon from '../assets/icons/show.svg'
import hideIcon from '../assets/icons/hide.svg'
import longArrowDownBlueIcon from '../assets/long-arrow-down-blue.svg'
import longArrowDownGrayIcon from '../assets/long-arrow-down-gray.svg'
import addIcon from '../assets/icons/add.svg'
import editIcon from '../assets/edit.svg'
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

const ENERGY_PRICE_TABS = [
  { value: 'water', label: '水' },
  { value: 'electricity', label: '电' },
  { value: 'gas', label: '气' },
]

const COUPLING_ENERGY_TYPES = ['电锅炉', '燃气锅炉', '水源热泵', '风冷热泵', '无耦合能源']

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
const UNIT_LAYOUT_ROWS = 10
const UNIT_TOTAL = 33
const DATE_PICKER_YEARS = Array.from({ length: 61 }, (_, index) => 2000 + index)
const DATE_PICKER_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)
const DATE_PICKER_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)
const TIME_PICKER_HOURS = Array.from({ length: 25 }, (_, index) => index)
const TIME_PICKER_MINUTES = Array.from({ length: 60 }, (_, index) => index)
const UNSAVED_MESSAGE = '当前页面有未保存修改，是否退出？'
const SAVE_CONFIRM_MESSAGE = '确认保存当前参数吗？'
const ENERGY_PRICE_PLAN_TIME_INVALID_MESSAGE = '时段价格设置需覆盖24小时：首段开始时间必须为00:00，末段结束时间必须为24:00。'
const ENERGY_PRICE_SEGMENT_INVALID_MESSAGE = '时段设置无效：每段结束时间必须晚于开始时间。'
/** 能源价格各时段条块颜色，按索引循环使用 */
const ENERGY_PRICE_SEGMENT_COLORS = ['#2387f0', '#efc443', '#ff7a45', '#2dd283', '#9b6bcc', '#00b4d8']
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

const initialEnergyPriceState = {
  tab: 'water',
  waterFixed: '9.00',
  gasFixed: '4.80',
  electricPlans: [
    {
      id: 1,
      startDate: '01-01',
      endDate: '06-30',
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
  type: '无耦合能源',
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
  layoutLocked: true,
  numberingDone: true,
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
  return `No${String(id).padStart(2, '0')}`
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

function parseTimeToMinutes(value) {
  if (!value || typeof value !== 'string') return 0
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return 0
  return Math.min(24 * 60, Math.max(0, hour * 60 + minute))
}

function formatMinutesToTime(totalMinutes) {
  const safe = Math.min(24 * 60, Math.max(0, Number(totalMinutes) || 0))
  const hour = Math.floor(safe / 60)
  const minute = safe % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function parseMonthDay(value) {
  if (!value || typeof value !== 'string') return [1, 1]
  const [monthText, dayText] = value.split('-')
  const month = Number(monthText)
  const day = Number(dayText)
  const safeMonth = Number.isInteger(month) && month >= 1 && month <= 12 ? month : 1
  const safeDay = Number.isInteger(day) && day >= 1 && day <= 31 ? day : 1
  return [safeMonth, safeDay]
}

function formatMonthDay(month, day) {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatMonthDayText(value) {
  const [month, day] = parseMonthDay(value)
  return `${month}月${day}日`
}

function parseTimeValue(value) {
  if (!value || typeof value !== 'string') return [0, 0]
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const safeHour = Number.isInteger(hour) && hour >= 0 && hour <= 24 ? hour : 0
  const safeMinute = Number.isInteger(minute) && minute >= 0 && minute <= 59 ? minute : 0
  return [safeHour, safeMinute]
}

function normalizeEnergyPlanDraftSegments(segments) {
  const source = Array.isArray(segments) ? segments : []
  if (source.length === 0) {
    return [{ start: '00:00', end: '24:00', price: '', color: ENERGY_PRICE_SEGMENT_COLORS[0] }]
  }

  const normalized = source.map((segment, index) => ({
    ...segment,
    start: formatMinutesToTime(parseTimeToMinutes(segment?.start)),
    end: formatMinutesToTime(parseTimeToMinutes(segment?.end)),
    price: segment?.price ?? '',
    color: segment?.color ?? ENERGY_PRICE_SEGMENT_COLORS[index % ENERGY_PRICE_SEGMENT_COLORS.length],
  }))

  normalized[0].start = '00:00'
  for (let index = 1; index < normalized.length; index += 1) {
    normalized[index - 1].end = normalized[index].start
  }

  return normalized
}

function cloneUnitLayoutState(state) {
  return {
    slots: [...state.slots],
    pendingIds: [...state.pendingIds],
    layoutLocked: state.layoutLocked,
    numberingDone: state.numberingDone,
    numberingMap: { ...state.numberingMap },
    showOriginalNo: state.showOriginalNo,
  }
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
  const [energyPriceState, setEnergyPriceState] = useState(() => deepClone(initialEnergyPriceState))
  const [savedEnergyPriceState, setSavedEnergyPriceState] = useState(() => deepClone(initialEnergyPriceState))
  const [couplingEnergyState, setCouplingEnergyState] = useState(() => deepClone(initialCouplingEnergyState))
  const [savedCouplingEnergyState, setSavedCouplingEnergyState] = useState(() => deepClone(initialCouplingEnergyState))
  const [energyPriceModalOpen, setEnergyPriceModalOpen] = useState(false)
  const [editingEnergyPlanId, setEditingEnergyPlanId] = useState(null)
  const [energyPriceModalDraft, setEnergyPriceModalDraft] = useState({ startDate: '01-01', endDate: '12-31', segments: [] })
  const [energyPricePickerState, setEnergyPricePickerState] = useState({ open: false, type: null, segmentIndex: null })
  const [keypadState, setKeypadState] = useState({ open: false, field: null, moduleKey: null })
  const [datePickerField, setDatePickerField] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, mode: null, targetView: null, title: '', message: '' })

  const [unitSlots, setUnitSlots] = useState(() => [...INITIAL_UNIT_LAYOUT_STATE.slots])
  const [pendingUnitIds, setPendingUnitIds] = useState(() => [...INITIAL_UNIT_LAYOUT_STATE.pendingIds])
  const [unitLayoutLocked, setUnitLayoutLocked] = useState(INITIAL_UNIT_LAYOUT_STATE.layoutLocked)
  const [unitNumberingMap, setUnitNumberingMap] = useState(() => ({ ...INITIAL_UNIT_LAYOUT_STATE.numberingMap }))
  const [unitNumberingDone, setUnitNumberingDone] = useState(INITIAL_UNIT_LAYOUT_STATE.numberingDone)
  const [showOriginalNo, setShowOriginalNo] = useState(INITIAL_UNIT_LAYOUT_STATE.showOriginalNo)
  const [longPressedPendingIds, setLongPressedPendingIds] = useState(() => ({}))
  const [smartScanEnabled, setSmartScanEnabled] = useState(false)
  const [hasUnitLayoutReset, setHasUnitLayoutReset] = useState(false)
  const [manualDraggingPumpId, setManualDraggingPumpId] = useState(null)
  const [manualDraggingSource, setManualDraggingSource] = useState(null)
  const [manualDragPointer, setManualDragPointer] = useState({ x: 0, y: 0 })
  const [savedUnitLayoutState, setSavedUnitLayoutState] = useState(() => cloneUnitLayoutState(INITIAL_UNIT_LAYOUT_STATE))
  const pendingLongPressTimerRef = useRef(null)
  const draggingPumpIdRef = useRef(null)
  const manualDraggingPumpIdRef = useRef(null)
  const pendingListRef = useRef(null)
  const unitLayoutLockedRef = useRef(unitLayoutLocked)
  const movePumpToSlotRef = useRef(null)
  const dragStartPointRef = useRef({ x: 0, y: 0 })
  const didManualDragMoveRef = useRef(false)
  const suppressNextClickRef = useRef(false)
  const previousActiveViewRef = useRef(activeView)

  const activeProvince = useMemo(
    () => REGION_OPTIONS.find((item) => item.value === projectForm.province) ?? REGION_OPTIONS[0],
    [projectForm.province],
  )

  const cityOptions = activeProvince?.cities ?? []

  const addedUnitIds = useMemo(() => unitSlots.filter((id) => id != null), [unitSlots])
  const nextUnitNumber = useMemo(() => Object.keys(unitNumberingMap).length + 1, [unitNumberingMap])
  const canFinishLayout = pendingUnitIds.length === 0 && addedUnitIds.length > 0 && !unitLayoutLocked
  const canFinishNumbering = unitLayoutLocked && !unitNumberingDone && Object.keys(unitNumberingMap).length === addedUnitIds.length
  const isAfterResetLayoutStage = hasUnitLayoutReset && !unitLayoutLocked
  const isAfterLayoutCompleteStage = hasUnitLayoutReset && unitLayoutLocked && !unitNumberingDone
  const canToggleOriginalNo = unitNumberingDone
  const datePickerValue = useMemo(() => {
    if (!datePickerField) {
      return []
    }
    return parseDateString(projectForm[datePickerField])
  }, [datePickerField, projectForm])
  const energyPricePickerValue = useMemo(() => {
    if (!energyPricePickerState.open) return []
    if (energyPricePickerState.type === 'startDate') return parseMonthDay(energyPriceModalDraft.startDate)
    if (energyPricePickerState.type === 'endDate') return parseMonthDay(energyPriceModalDraft.endDate)
    if (energyPricePickerState.type === 'segment-start') return parseTimeValue(energyPriceModalDraft.segments[energyPricePickerState.segmentIndex]?.start)
    if (energyPricePickerState.type === 'segment-end') return parseTimeValue(energyPriceModalDraft.segments[energyPricePickerState.segmentIndex]?.end)
    return []
  }, [energyPriceModalDraft, energyPricePickerState])

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

  useEffect(() => () => {
    if (pendingLongPressTimerRef.current) {
      clearTimeout(pendingLongPressTimerRef.current)
      pendingLongPressTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    const dropByClientPoint = (clientX, clientY, source) => {
      const dragId = draggingPumpIdRef.current
      if (!dragId || unitLayoutLockedRef.current || !manualDraggingPumpIdRef.current) {
        return
      }

      const element = document.elementFromPoint(clientX, clientY)
      const slotElement = element?.closest?.('[data-slot-index]')
      if (!slotElement) {
        return
      }

      const slotIndex = Number(slotElement.getAttribute('data-slot-index'))
      if (!Number.isInteger(slotIndex)) {
        return
      }

      if (UNIT_PUMP_ID_SET.has(dragId)) {
        console.log('[UnitLayout] slot drop by global pointer up', { pumpId: dragId, slotIndex, source })
        movePumpToSlotRef.current?.(dragId, slotIndex)
      }
    }

    const clearDragState = () => {
      draggingPumpIdRef.current = null
      setManualDraggingPumpId(null)
      setManualDraggingSource(null)
      clearPendingLongPressTimer()
    }

    const handleGlobalMouseMove = (event) => {
      if (!manualDraggingPumpIdRef.current) {
        return
      }
      if (!didManualDragMoveRef.current) {
        const deltaX = Math.abs(event.clientX - dragStartPointRef.current.x)
        const deltaY = Math.abs(event.clientY - dragStartPointRef.current.y)
        if (deltaX > 4 || deltaY > 4) {
          didManualDragMoveRef.current = true
        }
      }
      setManualDragPointer({ x: event.clientX, y: event.clientY })
    }

    const handleGlobalTouchMove = (event) => {
      if (!manualDraggingPumpIdRef.current) {
        return
      }
      const point = event.touches?.[0]
      if (!point) {
        return
      }
      if (!didManualDragMoveRef.current) {
        const deltaX = Math.abs(point.clientX - dragStartPointRef.current.x)
        const deltaY = Math.abs(point.clientY - dragStartPointRef.current.y)
        if (deltaX > 4 || deltaY > 4) {
          didManualDragMoveRef.current = true
        }
      }
      event.preventDefault()
      setManualDragPointer({ x: point.clientX, y: point.clientY })
    }

    const handleGlobalMouseUp = (event) => {
      dropByClientPoint(event.clientX, event.clientY, 'mouse')
      suppressNextClickRef.current = didManualDragMoveRef.current
      didManualDragMoveRef.current = false
      clearDragState()
    }

    const handleGlobalTouchEnd = (event) => {
      const point = event.changedTouches?.[0]
      if (point) {
        dropByClientPoint(point.clientX, point.clientY, 'touch')
      }
      suppressNextClickRef.current = didManualDragMoveRef.current
      didManualDragMoveRef.current = false
      clearDragState()
    }

    const handleGlobalClickCapture = (event) => {
      if (!suppressNextClickRef.current) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      suppressNextClickRef.current = false
    }

    window.addEventListener('mouseup', handleGlobalMouseUp, true)
    window.addEventListener('mousemove', handleGlobalMouseMove, true)
    window.addEventListener('touchend', handleGlobalTouchEnd, true)
    window.addEventListener('touchmove', handleGlobalTouchMove, { capture: true, passive: false })
    window.addEventListener('click', handleGlobalClickCapture, true)
    window.addEventListener('blur', clearDragState)

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp, true)
      window.removeEventListener('mousemove', handleGlobalMouseMove, true)
      window.removeEventListener('touchend', handleGlobalTouchEnd, true)
      window.removeEventListener('touchmove', handleGlobalTouchMove, true)
      window.removeEventListener('click', handleGlobalClickCapture, true)
      window.removeEventListener('blur', clearDragState)
    }
  }, [])

  useEffect(() => {
    unitLayoutLockedRef.current = unitLayoutLocked
  }, [unitLayoutLocked])

  useEffect(() => {
    manualDraggingPumpIdRef.current = manualDraggingPumpId
  }, [manualDraggingPumpId])

  useEffect(() => {
    const shouldLockScroll = Boolean(manualDraggingPumpId)
    document.body.classList.toggle('unit-layout-drag-lock', shouldLockScroll)
    return () => {
      document.body.classList.remove('unit-layout-drag-lock')
    }
  }, [manualDraggingPumpId])

  useEffect(() => {
    const previousActiveView = previousActiveViewRef.current
    if (previousActiveView === 'unit-layout' && activeView !== 'unit-layout' && !unitNumberingDone) {
      setUnitSlots([...INITIAL_UNIT_LAYOUT_STATE.slots])
      setPendingUnitIds([...INITIAL_UNIT_LAYOUT_STATE.pendingIds])
      setUnitLayoutLocked(INITIAL_UNIT_LAYOUT_STATE.layoutLocked)
      setUnitNumberingDone(INITIAL_UNIT_LAYOUT_STATE.numberingDone)
      setUnitNumberingMap({ ...INITIAL_UNIT_LAYOUT_STATE.numberingMap })
      setShowOriginalNo(INITIAL_UNIT_LAYOUT_STATE.showOriginalNo)
      setLongPressedPendingIds({})
      setSmartScanEnabled(false)
      setHasUnitLayoutReset(false)
      setManualDraggingPumpId(null)
      setManualDraggingSource(null)
      draggingPumpIdRef.current = null
    }
    previousActiveViewRef.current = activeView
  }, [activeView, unitNumberingDone])

  const activeDirty = useMemo(() => {
    if (activeView === 'project-system-type') {
      return JSON.stringify(projectForm) !== JSON.stringify(savedProjectForm)
    }

    if (activeView === 'loop-pump-count') {
      return JSON.stringify(loopPumpForm) !== JSON.stringify(savedLoopPumpForm)
    }

    if (activeView === 'unit-layout') {
      return JSON.stringify({
        slots: unitSlots,
        pendingIds: pendingUnitIds,
        layoutLocked: unitLayoutLocked,
        numberingDone: unitNumberingDone,
        numberingMap: unitNumberingMap,
        showOriginalNo,
      }) !== JSON.stringify(savedUnitLayoutState)
    }

    if (activeView === 'energy-price') {
      return JSON.stringify(energyPriceState) !== JSON.stringify(savedEnergyPriceState)
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
    unitSlots,
    pendingUnitIds,
    unitLayoutLocked,
    unitNumberingDone,
    unitNumberingMap,
    showOriginalNo,
    savedUnitLayoutState,
    energyPriceState,
    savedEnergyPriceState,
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

  const openAlertDialog = (title, message) => {
    setConfirmDialog({ open: true, mode: 'alert', targetView: null, title, message })
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
      setSavedUnitLayoutState(
        cloneUnitLayoutState({
          slots: unitSlots,
          pendingIds: pendingUnitIds,
          layoutLocked: unitLayoutLocked,
          numberingDone: unitNumberingDone,
          numberingMap: unitNumberingMap,
          showOriginalNo,
        }),
      )
      return
    }

    if (activeView === 'energy-price') {
      const hasInvalidPlanTime = energyPriceState.electricPlans.some((plan) => {
        const segments = Array.isArray(plan?.segments) ? plan.segments : []
        if (segments.length === 0) return true
        return segments[0]?.start !== '00:00' || segments[segments.length - 1]?.end !== '24:00'
      })
      if (hasInvalidPlanTime) {
        openAlertDialog('提示', ENERGY_PRICE_PLAN_TIME_INVALID_MESSAGE)
        return false
      }
      setSavedEnergyPriceState(deepClone(energyPriceState))
      return true
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
    if (keypadState.moduleKey === 'energy-water') {
      setEnergyPriceState((previous) => ({ ...previous, waterFixed: value }))
    } else if (keypadState.moduleKey === 'energy-gas') {
      setEnergyPriceState((previous) => ({ ...previous, gasFixed: value }))
    } else if (keypadState.moduleKey === 'coupling-count') {
      setCouplingEnergyState((previous) => ({ ...previous, count: value }))
    } else if (keypadState.moduleKey === 'energy-plan-price' && Number.isInteger(keypadState.field)) {
      setEnergyPriceModalDraft((previous) => ({
        ...previous,
        segments: previous.segments.map((segment, index) => (index === keypadState.field ? { ...segment, price: value } : segment)),
      }))
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

  const handleEnergyPricePickerConfirm = (nextValueParts) => {
    if (!Array.isArray(nextValueParts) || nextValueParts.length < 2) {
      setEnergyPricePickerState({ open: false, type: null, segmentIndex: null })
      return
    }

    const [rawA, rawB] = nextValueParts.map((item) => Number(item))
    const a = Number.isInteger(rawA) ? rawA : 0
    const b = Number.isInteger(rawB) ? rawB : 0

    if (energyPricePickerState.type === 'startDate' || energyPricePickerState.type === 'endDate') {
      const month = Math.min(12, Math.max(1, a))
      const maxDay = new Date(2024, month, 0).getDate()
      const day = Math.min(maxDay, Math.max(1, b))
      setEnergyPriceModalDraft((previous) => ({
        ...previous,
        [energyPricePickerState.type]: formatMonthDay(month, day),
      }))
    } else if ((energyPricePickerState.type === 'segment-start' || energyPricePickerState.type === 'segment-end') && Number.isInteger(energyPricePickerState.segmentIndex)) {
      const hour = Math.min(24, Math.max(0, a))
      const minute = Math.min(59, Math.max(0, b))
      const nextTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      const targetIndex = energyPricePickerState.segmentIndex
      setEnergyPriceModalDraft((previous) => ({
        ...previous,
        segments: previous.segments.map((segment, index) => {
          if (energyPricePickerState.type === 'segment-start') {
            if (index === 0) {
              return { ...segment, start: '00:00' }
            }
            if (index === targetIndex) {
              return { ...segment, start: nextTime }
            }
            if (index === targetIndex - 1) {
              return { ...segment, end: nextTime }
            }
            return segment
          }

          if (index === targetIndex) {
            return { ...segment, end: nextTime }
          }
          if (index === targetIndex + 1) {
            return { ...segment, start: nextTime }
          }
          return segment
        }),
      }))
    }

    setEnergyPricePickerState({ open: false, type: null, segmentIndex: null })
  }

  const resetUnitLayout = () => {
    const allCurrentIds = [...new Set([...pendingUnitIds, ...addedUnitIds])]
      .filter((id) => UNIT_PUMP_ID_SET.has(id))
      .sort((a, b) => a - b)
    console.log('[UnitLayout] reset clicked', {
      beforePendingCount: pendingUnitIds.length,
      beforeAddedCount: addedUnitIds.length,
      resetToPendingCount: allCurrentIds.length,
    })
    setPendingUnitIds(allCurrentIds)
    setUnitSlots(Array.from({ length: UNIT_LAYOUT_COLS * UNIT_LAYOUT_ROWS }, () => null))
    setUnitLayoutLocked(false)
    setUnitNumberingDone(false)
    setUnitNumberingMap({})
    setShowOriginalNo(false)
    setLongPressedPendingIds({})
    setSmartScanEnabled(true)
    setHasUnitLayoutReset(true)
    setManualDraggingPumpId(null)
    setManualDraggingSource(null)
    draggingPumpIdRef.current = null
  }

  const handleSmartScan = () => {
    const rawTargetCount = Number(projectForm.heatPumpCount)
    if (!smartScanEnabled) {
      return
    }
    const targetCount = Number.isInteger(rawTargetCount) ? Math.max(0, Math.min(rawTargetCount, UNIT_TOTAL)) : 0
    const availableIds = Array.from({ length: UNIT_TOTAL }, (_, index) => index + 1)

    const currentAddedIds = unitSlots.filter((id) => id != null && UNIT_PUMP_ID_SET.has(id))
    const currentPendingIds = pendingUnitIds.filter((id) => UNIT_PUMP_ID_SET.has(id))
    const currentAllIds = [...new Set([...currentAddedIds, ...currentPendingIds])]
    console.log('[UnitLayout] smart scan start', {
      heatPumpCount: projectForm.heatPumpCount,
      targetCount,
      currentPendingCount: currentPendingIds.length,
      currentAddedCount: currentAddedIds.length,
      currentTotalCount: currentAllIds.length,
    })

    let nextPendingIds = [...currentPendingIds]
    let nextSlots = [...unitSlots]

    if (currentAllIds.length < targetCount) {
      const missingCount = targetCount - currentAllIds.length
      const idsToAdd = availableIds.filter((id) => !currentAllIds.includes(id)).slice(0, missingCount)
      nextPendingIds = [...nextPendingIds, ...idsToAdd]
    } else if (currentAllIds.length > targetCount) {
      let removeCount = currentAllIds.length - targetCount

      const removablePending = [...nextPendingIds].sort((a, b) => b - a)
      while (removeCount > 0 && removablePending.length > 0) {
        const removingId = removablePending.shift()
        nextPendingIds = nextPendingIds.filter((id) => id !== removingId)
        removeCount -= 1
      }

      if (removeCount > 0) {
        const removableAdded = [...new Set(currentAddedIds)].sort((a, b) => b - a)
        for (let index = 0; index < removableAdded.length && removeCount > 0; index += 1) {
          const removingId = removableAdded[index]
          nextSlots = nextSlots.map((id) => (id === removingId ? null : id))
          removeCount -= 1
        }
      }
    }

    const finalPendingIds = Array.from(new Set(nextPendingIds)).sort((a, b) => a - b)
    const finalAddedIds = nextSlots.filter((id) => id != null && UNIT_PUMP_ID_SET.has(id))
    console.log('[UnitLayout] smart scan result', {
      finalPendingCount: finalPendingIds.length,
      finalAddedCount: finalAddedIds.length,
      finalTotalCount: new Set([...finalPendingIds, ...finalAddedIds]).size,
      targetCount,
    })

    setPendingUnitIds(finalPendingIds)
    setUnitSlots(nextSlots)
    setUnitLayoutLocked(false)
    setUnitNumberingDone(false)
    setUnitNumberingMap({})
    setShowOriginalNo(false)
    setManualDraggingPumpId(null)
    setManualDraggingSource(null)
    draggingPumpIdRef.current = null
  }

  const clearPendingLongPressTimer = () => {
    if (pendingLongPressTimerRef.current) {
      clearTimeout(pendingLongPressTimerRef.current)
      pendingLongPressTimerRef.current = null
    }
  }

  const startManualDrag = (pumpId, source, event) => {
    if (!pumpId || (source === 'pending' && unitLayoutLocked)) {
      return
    }
    if (event?.button != null && event.button !== 0) {
      return
    }
    event?.preventDefault?.()

    draggingPumpIdRef.current = pumpId
    setManualDraggingPumpId(pumpId)
    setManualDraggingSource(source)
    const pointer = event?.touches?.[0] ?? event
    if (pointer?.clientX != null && pointer?.clientY != null) {
      setManualDragPointer({ x: pointer.clientX, y: pointer.clientY })
      dragStartPointRef.current = { x: pointer.clientX, y: pointer.clientY }
    }
    didManualDragMoveRef.current = false
    console.log('[UnitLayout] pending press start', { pumpId, source })

    clearPendingLongPressTimer()
    if (source === 'pending') {
      pendingLongPressTimerRef.current = setTimeout(() => {
        setLongPressedPendingIds((previous) => ({
          ...previous,
          [pumpId]: true,
        }))
        pendingLongPressTimerRef.current = null
      }, 3000)
    }
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

  useEffect(() => {
    movePumpToSlotRef.current = movePumpToSlot
  }, [movePumpToSlot])

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
    onUnitLayoutCommitted?.([...unitSlots])
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

  const scrollPendingList = (direction) => {
    const listElement = pendingListRef.current
    if (!listElement) {
      return
    }
    const offset = direction === 'left' ? -360 : 360
    listElement.scrollBy({ left: offset, behavior: 'smooth' })
  }

  const renderDetailHeader = (title) => (
    <div className="system-params-detail__header">
      <button type="button" className="system-params-back" onClick={handleBackToOverview}>
        <img src={arrowLeftSelectedIcon} alt="" aria-hidden="true" />
      </button>
      <h3>{title}</h3>
      <button type="button" className="system-params-save" onClick={handleSaveClick}>保存</button>
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
            <SelectDropdown
              value={projectForm.city}
              options={cityOptions}
              onChange={(value) => setProjectForm((prev) => ({ ...prev, city: value }))}
            />
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
            </button>
            <em>-</em>
            <button type="button" onClick={() => setDatePickerField('heatingSeasonEnd')}>
              <span className="system-params-date-value">{formatDateInput(projectForm.heatingSeasonEnd)}</span>
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

  const renderUnitLayoutDetail = () => {
    const isStep1Done = addedUnitIds.length === UNIT_TOTAL
    const isStep1Active = !isStep1Done
    const isStep2Active = isStep1Done && !unitLayoutLocked
    const isStep2Done = unitLayoutLocked
    const isStep3Active = unitLayoutLocked && !unitNumberingDone
    const isStep3Done = unitNumberingDone
    const pendingDisplayIds = pendingUnitIds.length > 0
      ? [
          ...pendingUnitIds,
          ...Array.from({ length: Math.max(0, UNIT_TOTAL - pendingUnitIds.length) }, () => null),
        ]
      : Array.from({ length: UNIT_TOTAL }, () => null)

    return (
      <div className="system-params-detail system-layout-detail">
        {renderDetailHeader('机组排布')}

        <div className="unit-layout-wrap">
          <div className="unit-layout-main">
            <div className="unit-layout-pending-header">
              <strong>待添加（{pendingUnitIds.length}）</strong>
              <span>操作提示：单击可选中，长按可启动风扇热点。可拖动到下方区域进行布置。</span>
            </div>
            <div className={`unit-layout-pending-scroller${pendingUnitIds.length === 0 ? ' is-empty' : ''}`}>
              <button
                type="button"
                className="unit-layout-pending-arrow unit-layout-pending-arrow--left"
                onClick={() => scrollPendingList('left')}
                aria-label="向左滚动待添加热泵"
              >
                <img src={arrowLeftSelectedIcon} alt="" aria-hidden="true" />
              </button>

              <div ref={pendingListRef} className={`unit-layout-pending-list${pendingUnitIds.length === 0 ? ' is-empty' : ''}`}>
                {pendingDisplayIds.map((id, index) => (
                  <button
                    key={id ? `pending-${id}` : `pending-placeholder-${index}`}
                    type="button"
                    className={`unit-layout-pending-card${id ? '' : ' is-placeholder'}${longPressedPendingIds[id] ? ' is-long-press' : ''}${manualDraggingPumpId === id && manualDraggingSource === 'pending' ? ' is-dragging' : ''}`}
                    draggable={false}
                    disabled={!id}
                    onMouseDown={(event) => startManualDrag(id, 'pending', event)}
                    onTouchStart={(event) => startManualDrag(id, 'pending', event)}
                  >
                    {id ? <span>{toNoLabel(id)}</span> : <span aria-hidden="true" />}
                    <img src={longPressedPendingIds[id] ? hpRunningIcon : hpNullIcon} alt="" aria-hidden="true" />
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="unit-layout-pending-arrow unit-layout-pending-arrow--right"
                onClick={() => scrollPendingList('right')}
                aria-label="向右滚动待添加热泵"
              >
                <img src={arrowRightSelectedIcon} alt="" aria-hidden="true" />
              </button>
            </div>

            <div className="unit-layout-added-title">已添加（{addedUnitIds.length}）</div>
            <div className="unit-layout-grid-head">
              <span aria-hidden="true" />
              {Array.from({ length: UNIT_LAYOUT_COLS }, (_, index) => (
                <span key={`col-${index + 1}`}>{index + 1}</span>
              ))}
            </div>

            <div className={`unit-layout-grid-body${manualDraggingPumpId ? ' is-dragging' : ''}`}>
              <div className="unit-layout-row-labels">
                {Array.from({ length: UNIT_LAYOUT_ROWS }, (_, index) => (
                  <span key={`row-${index + 1}`} className="unit-layout-row-label">{index + 1}</span>
                ))}
              </div>

              <div className="unit-layout-grid">
                {unitSlots.map((pumpId, index) => {
                  const displayLabel = pumpId
                    ? showOriginalNo
                      ? toNoLabel(pumpId)
                      : unitLayoutLocked
                        ? (unitNumberingMap[pumpId] ?? toNoLabel(pumpId))
                        : toNoLabel(pumpId)
                    : ''

                  return (
                    <button
                      key={`slot-${index}`}
                      type="button"
                      data-slot-index={index}
                      className={`unit-layout-slot${pumpId ? ' has-pump' : ''}${unitLayoutLocked && !unitNumberingDone ? ' is-numbering' : ''}`}
                      draggable={false}
                      onMouseDown={(event) => {
                        if (!unitLayoutLocked && pumpId) {
                          startManualDrag(pumpId, 'slot', event)
                        }
                      }}
                      onTouchStart={(event) => {
                        if (!unitLayoutLocked && pumpId) {
                          startManualDrag(pumpId, 'slot', event)
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

            <div className="unit-layout-flow__step-item">
              <div className={`unit-layout-flow__step-indicator${isStep1Active ? ' is-active' : ''}${isStep1Done ? ' is-done' : ''}`}>
                <span>01</span>
                <img src={longArrowDownBlueIcon} alt="" aria-hidden="true" />
              </div>
              <div className="unit-layout-flow__step">
                <div className="unit-layout-flow__title">添加热泵{addedUnitIds.length}/{UNIT_TOTAL}</div>
                <small>读取处于激活状态的热泵</small>
                <button
                  type="button"
                  className={`unit-layout-flow__smart-scan${isAfterResetLayoutStage ? ' is-active' : ''}`}
                  onClick={handleSmartScan}
                  disabled={!isAfterResetLayoutStage || !smartScanEnabled}
                >
                  智能扫描
                </button>
              </div>
            </div>

            <div className="unit-layout-flow__step-item">
              <div className={`unit-layout-flow__step-indicator${isStep2Active ? ' is-active' : ''}${isStep2Done ? ' is-done' : ''}`}>
                <span>02</span>
                <img src={isStep2Active || isStep2Done ? longArrowDownBlueIcon : longArrowDownGrayIcon} alt="" aria-hidden="true" />
              </div>
              <div className="unit-layout-flow__step">
                <div className="unit-layout-flow__title">热泵布局</div>
                <small>布局完成不可更改</small>
                <button
                  type="button"
                  className={`unit-layout-flow__complete-layout${isAfterResetLayoutStage ? ' is-active' : ''}`}
                  onClick={handleCompleteLayout}
                  disabled={!isAfterResetLayoutStage}
                >
                  布局完成
                </button>
              </div>
            </div>

            <div className="unit-layout-flow__step-item">
              <div className={`unit-layout-flow__step-indicator${isStep3Active ? ' is-active' : ''}${isStep3Done ? ' is-done' : ''}`}>
                <span>03</span>
              </div>
              <div className="unit-layout-flow__step">
                <div className="unit-layout-flow__title">热泵编号</div>
                <small>{unitLayoutLocked && !unitNumberingDone ? `点击热泵按顺序编号，下一位：${nextUnitNumber}` : '编号完成后可切换显示'}</small>
                <button
                  type="button"
                  className={isAfterLayoutCompleteStage ? 'is-active' : ''}
                  disabled={!isAfterLayoutCompleteStage}
                  onClick={() => {
                    if (unitLayoutLocked) {
                      setUnitNumberingDone(false)
                      setUnitNumberingMap({})
                      setShowOriginalNo(false)
                    }
                  }}
                >
                  重新编号
                </button>
                <div className="unit-layout-flow__row">
                  <button type="button" className={isAfterLayoutCompleteStage ? 'is-active' : ''} onClick={handleCompleteNumbering} disabled={!isAfterLayoutCompleteStage}>编号完成</button>
                  <button type="button" className="unit-layout-flow__eye" disabled={!canToggleOriginalNo} onClick={() => setShowOriginalNo((prev) => !prev)}>
                    {showOriginalNo ? <img src={hideIcon} alt="" aria-hidden="true" /> : <img src={showIcon} alt="" aria-hidden="true" />}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    )
  }

  const renderEnergyPriceDetail = () => {
    const isWater = energyPriceState.tab === 'water'
    const isElectricity = energyPriceState.tab === 'electricity'
    const isGas = energyPriceState.tab === 'gas'
    const openEnergyPriceModal = (plan = null) => {
      if (plan) {
        setEditingEnergyPlanId(plan.id)
        setEnergyPriceModalDraft({
          startDate: plan.startDate ?? '01-01',
          endDate: plan.endDate ?? '12-31',
          segments: normalizeEnergyPlanDraftSegments(deepClone(plan.segments ?? [])),
        })
      } else {
        setEditingEnergyPlanId(null)
        setEnergyPriceModalDraft({
          startDate: '01-01',
          endDate: '12-31',
          segments: [{ start: '00:00', end: '24:00', price: '', color: ENERGY_PRICE_SEGMENT_COLORS[0] }],
        })
      }
      setEnergyPriceModalOpen(true)
    }
    const closeEnergyPriceModal = () => {
      setEnergyPriceModalOpen(false)
      setEditingEnergyPlanId(null)
      setEnergyPricePickerState({ open: false, type: null, segmentIndex: null })
    }
    const handleAddEnergyPlanDraftSegment = () => {
      const last = energyPriceModalDraft.segments.at(-1)
      const lastEndMinutes = parseTimeToMinutes(last?.end ?? '00:00')
      if (lastEndMinutes >= 24 * 60) return
      const nextStart = formatMinutesToTime(lastEndMinutes)
      setEnergyPriceModalDraft((previous) => ({
        ...previous,
        segments: [
          ...previous.segments,
          { start: nextStart, end: '24:00', price: '', color: ENERGY_PRICE_SEGMENT_COLORS[previous.segments.length % ENERGY_PRICE_SEGMENT_COLORS.length] },
        ],
      }))
    }
    const handleRemoveEnergyPlanDraftSegment = (index) => {
      setEnergyPriceModalDraft((previous) => ({
        ...previous,
        segments: normalizeEnergyPlanDraftSegments(previous.segments.filter((_, segmentIndex) => segmentIndex !== index)),
      }))
    }
    const canAddEnergyPriceSegment = parseTimeToMinutes(energyPriceModalDraft.segments.at(-1)?.end ?? '00:00') < 24 * 60
    const handleConfirmEnergyPlanModal = () => {
      const hasInvalidDraftSegment = energyPriceModalDraft.segments.some(
        (segment) => parseTimeToMinutes(segment?.end) <= parseTimeToMinutes(segment?.start),
      )
      if (hasInvalidDraftSegment) {
        openAlertDialog('提示', ENERGY_PRICE_SEGMENT_INVALID_MESSAGE)
        return
      }

      const normalizedDraftSegments = normalizeEnergyPlanDraftSegments(energyPriceModalDraft.segments)
      const hasInvalidSegment = normalizedDraftSegments.some((segment) => parseTimeToMinutes(segment.end) <= parseTimeToMinutes(segment.start))
      if (hasInvalidSegment) {
        openAlertDialog('提示', ENERGY_PRICE_SEGMENT_INVALID_MESSAGE)
        return
      }
      const normalizedSegments = normalizedDraftSegments.map((segment, index) => {
        const startMinutes = parseTimeToMinutes(segment.start)
        const endMinutes = parseTimeToMinutes(segment.end)
        if (endMinutes <= startMinutes) return null
        return {
          start: formatMinutesToTime(startMinutes),
          end: formatMinutesToTime(endMinutes),
          price: segment.price ?? '',
          color: segment.color ?? ENERGY_PRICE_SEGMENT_COLORS[index % ENERGY_PRICE_SEGMENT_COLORS.length],
        }
      }).filter(Boolean)
      if (normalizedSegments.length === 0) {
        openAlertDialog('提示', ENERGY_PRICE_SEGMENT_INVALID_MESSAGE)
        return
      }
      if (normalizedSegments[0]?.start !== '00:00' || normalizedSegments.at(-1)?.end !== '24:00') {
        openAlertDialog('提示', ENERGY_PRICE_PLAN_TIME_INVALID_MESSAGE)
        return
      }
      setEnergyPriceState((previous) => {
        const nextPlan = {
          id: editingEnergyPlanId ?? Date.now(),
          startDate: energyPriceModalDraft.startDate ?? '01-01',
          endDate: energyPriceModalDraft.endDate ?? '12-31',
          segments: normalizedSegments,
        }
        if (editingEnergyPlanId == null) return { ...previous, electricPlans: [...previous.electricPlans, nextPlan] }
        return { ...previous, electricPlans: previous.electricPlans.map((plan) => (plan.id === editingEnergyPlanId ? nextPlan : plan)) }
      })
      closeEnergyPriceModal()
    }
    const handleDeleteEnergyPlan = () => {
      if (editingEnergyPlanId == null) {
        closeEnergyPriceModal()
        return
      }
      setEnergyPriceState((previous) => ({ ...previous, electricPlans: previous.electricPlans.filter((plan) => plan.id !== editingEnergyPlanId) }))
      closeEnergyPriceModal()
    }

    return (
      <div className="system-params-detail">
        {renderDetailHeader('能源价格')}

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
            <span>{isWater ? '水固定价格' : '气固定价格'}</span>
            <div className="system-params-input-display">
              <span>{isWater ? energyPriceState.waterFixed : energyPriceState.gasFixed}</span>
              <span className="system-params-input-unit">元/m³</span>
            </div>
          </button>
        ) : null}

        {isElectricity ? (
          <div className="energy-price-electric">
            <button type="button" className="energy-price-add" onClick={() => openEnergyPriceModal()}>
              <img src={addIcon} alt="" aria-hidden="true" />
              <span>新增</span>
            </button>
            {energyPriceState.electricPlans.map((plan) => {
              const bars = plan.segments.map((segment, index) => {
                const start = parseTimeToMinutes(segment.start)
                const end = parseTimeToMinutes(segment.end)
                const duration = Math.max(1, end - start)
                return { key: `${plan.id}-${index}`, start: formatMinutesToTime(start), end: formatMinutesToTime(end), duration, price: segment.price, color: segment.color }
              })
              const totalDuration = bars.reduce((sum, item) => sum + item.duration, 0) || 1
              const boundaries = []
              let passed = 0
              bars.forEach((item, index) => {
                boundaries.push({ key: `${item.key}-start`, time: item.start, left: (passed / totalDuration) * 100 })
                passed += item.duration
                if (index === bars.length - 1) boundaries.push({ key: `${item.key}-end`, time: item.end, left: 100 })
              })

              return (
                <div key={plan.id} className="energy-price-plan">
                  <div className="energy-price-plan__head">
                    <span>{`${formatMonthDayText(plan.startDate)} - ${formatMonthDayText(plan.endDate)}`}</span>
                    <button type="button" onClick={() => openEnergyPriceModal(plan)}>
                      <img src={editIcon} alt="" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="energy-price-plan__times">
                    <div className="energy-price-plan__times-track">
                      {boundaries.map((item) => {
                        const [hh, mm] = item.time.split(':')
                        return (
                          <span key={item.key} className="energy-price-plan__time-marker" style={{ left: `${item.left}%` }}>
                            <span>{hh}</span>
                            <span className="energy-price-plan__time-sep">:</span>
                            <span>{mm}</span>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  <div className="energy-price-plan__bar">
                    {bars.map((segment) => (
                      <div key={`${segment.key}-bar`} style={{ background: segment.color, flexGrow: segment.duration, flexBasis: 0 }}>
                        {segment.price ? `${segment.price} 元/kWh` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        {energyPriceModalOpen ? (
          <div className="energy-price-modal-backdrop" onClick={closeEnergyPriceModal}>
            <div className="energy-price-modal" onClick={(event) => event.stopPropagation()}>
              <div className="energy-price-modal__header">
                <h4>{editingEnergyPlanId == null ? '新增价格' : '编辑价格'}</h4>
                <button type="button" onClick={closeEnergyPriceModal}>×</button>
              </div>
              <div className="energy-price-modal__body">
                <section>
                  <h5>月份</h5>
                  <div className="energy-price-modal__label energy-price-modal__month">
                    <button
                      type="button"
                      onClick={() => setEnergyPricePickerState({ open: true, type: 'startDate', segmentIndex: null })}
                    >
                      <span>开始时间</span>
                      <strong>{formatMonthDayText(energyPriceModalDraft.startDate)}</strong>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnergyPricePickerState({ open: true, type: 'endDate', segmentIndex: null })}
                    >
                      <span>结束时间</span>
                      <strong>{formatMonthDayText(energyPriceModalDraft.endDate)}</strong>
                    </button>
                  </div>
                </section>
                <section>
                  <h5>时段价格设置</h5>
                  {energyPriceModalDraft.segments.map((segment, index) => (
                    <div key={`modal-segment-${index}`} className="energy-price-modal__row">
                      <button type="button" onClick={() => setEnergyPricePickerState({ open: true, type: 'segment-start', segmentIndex: index })} disabled={index === 0}>{segment.start}</button>
                      <em>-</em>
                      <button type="button" onClick={() => setEnergyPricePickerState({ open: true, type: 'segment-end', segmentIndex: index })}>{segment.end}</button>
                      <button type="button" className={`energy-price-modal__value${segment.price ? '' : ' is-placeholder'}`} onClick={() => openNumberPad(index, 'energy-plan-price')}>{segment.price || '请输入价格'}</button>
                      <button type="button" className="energy-price-modal__remove" onClick={() => handleRemoveEnergyPlanDraftSegment(index)}>删除</button>
                    </div>
                  ))}
                  <button type="button" className="energy-price-modal__add" onClick={handleAddEnergyPlanDraftSegment} disabled={!canAddEnergyPriceSegment}>新增时段</button>
                </section>
              </div>
              <div className="energy-price-modal__actions">
                <button type="button" className="is-danger" onClick={handleDeleteEnergyPlan}>删除方案</button>
                <button type="button" className="is-primary" onClick={handleConfirmEnergyPlanModal}>确定</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

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
      {activeView === 'unit-layout' ? renderUnitLayoutDetail() : null}
      {activeView === 'energy-price' ? renderEnergyPriceDetail() : null}
      {activeView === 'coupling-energy' ? renderCouplingEnergyDetail() : null}
      {activeView !== 'overview' && !DETAIL_MAIN_KEYS.includes(activeView) ? renderSimpleDetail() : null}

        <NumericKeypadModal
        isOpen={keypadState.open}
        initialValue={
          keypadState.moduleKey === 'energy-water'
            ? energyPriceState.waterFixed
            : keypadState.moduleKey === 'energy-gas'
              ? energyPriceState.gasFixed
              : keypadState.moduleKey === 'coupling-count'
                ? couplingEnergyState.count
                : keypadState.moduleKey === 'energy-plan-price' && Number.isInteger(keypadState.field)
                  ? energyPriceModalDraft.segments[keypadState.field]?.price ?? ''
                : keypadState.moduleKey
                  ? simpleForms[keypadState.moduleKey]?.value
                  : projectForm[keypadState.field]
        }
        title={
          keypadState.moduleKey === 'energy-water'
            ? '水固定价格'
            : keypadState.moduleKey === 'energy-gas'
              ? '气固定价格'
              : keypadState.moduleKey === 'energy-plan-price'
                ? '时段电价'
                : keypadState.moduleKey === 'coupling-count'
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
        isOpen={energyPricePickerState.open}
        title={energyPricePickerState.type === 'startDate' || energyPricePickerState.type === 'endDate' ? '日期选择' : '时间选择'}
        columns={
          energyPricePickerState.type === 'startDate' || energyPricePickerState.type === 'endDate'
            ? [
                { key: 'month', options: DATE_PICKER_MONTHS, formatter: (value) => `${String(value).padStart(2, '0')}月` },
                { key: 'day', options: DATE_PICKER_DAYS, formatter: (value) => `${String(value).padStart(2, '0')}日` },
              ]
            : [
                { key: 'hour', options: TIME_PICKER_HOURS, formatter: (value) => String(value).padStart(2, '0') },
                { key: 'minute', options: TIME_PICKER_MINUTES, formatter: (value) => String(value).padStart(2, '0') },
              ]
        }
        value={energyPricePickerValue}
        onClose={() => setEnergyPricePickerState({ open: false, type: null, segmentIndex: null })}
        onConfirm={handleEnergyPricePickerConfirm}
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

      {manualDraggingPumpId ? (
        <div
          className={`unit-layout-drag-preview${longPressedPendingIds[manualDraggingPumpId] ? ' is-long-press' : ''}`}
          style={{ left: manualDragPointer.x, top: manualDragPointer.y }}
        >
          <span>{toNoLabel(manualDraggingPumpId)}</span>
          <img src={longPressedPendingIds[manualDraggingPumpId] ? hpRunningIcon : hpNullIcon} alt="" aria-hidden="true" />
        </div>
      ) : null}

      {confirmDialog.open ? (
        <div className="system-params-confirm-backdrop" role="presentation" onClick={closeConfirmDialog}>
          <section
            className="system-params-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-label="确认提示"
            onClick={(event) => event.stopPropagation()}
          >
            <h4>{confirmDialog.mode === 'alert' ? (confirmDialog.title || '提示') : confirmDialog.mode === 'save' ? '确认保存' : '确认退出'}</h4>
            <p>{confirmDialog.mode === 'alert' ? confirmDialog.message : confirmDialogMessage}</p>
            <div className="system-params-confirm-actions">
              {confirmDialog.mode === 'alert' ? null : <button type="button" className="is-cancel" onClick={closeConfirmDialog}>取消</button>}
              <button type="button" className="is-confirm" onClick={handleConfirmDialogConfirm}>{confirmDialog.mode === 'alert' ? '我知道了' : '确定'}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default SystemParamsPage

