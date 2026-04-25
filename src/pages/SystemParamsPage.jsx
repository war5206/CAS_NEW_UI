import { useEffect, useMemo, useRef, useState } from 'react'
import SelectDropdown from '../components/SelectDropdown'
import NumericKeypadModal from '../components/NumericKeypadModal'
import TimePickerModal from '../components/TimePickerModal'
import AttentionModal from '../components/AttentionModal'
import SystemParamsEnergyPrice from '../components/systemParams/SystemParamsEnergyPrice'
import SystemParamsUnitLayout from '../components/systemParams/SystemParamsUnitLayout'
import { CITY_DATA, PROVINCE_ORDER } from '@/shared/constants/areaData'
import {
  adaptCoupleEnergyFromQueryResponse,
  adaptCirculationPumpFromQueryResponse,
  adaptMotherboardFromQueryResponse,
  adaptProjectDataFromQueryResponse,
  createDefaultLoopPumpForm,
  createDefaultProjectForm,
  findProvinceNameByCode,
  toSaveCoupleEnergyPayload,
  toUpdateMotherboardPayload,
  toSaveCirculationPumpPayload,
  toSaveProjectDataPayload,
} from '@/api/adapters/systemParamsProject'
import {
  queryCoupleEnergy,
  queryCirculationPump,
  queryMotherboardData,
  queryProjectData,
  queryRealvalByLongNames,
  saveCirculationPump,
  saveCoupleEnergy,
  saveProjectData,
  updateMotherboardData,
} from '@/api/modules/settings'
import { isWriteSuccess } from '@/hooks/useWriteWithDelayedVerify'
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

const MAINBOARD_OPTIONS_MAP = {
  '1': { value: '1', label: '自制主板' },
  '2': { value: '2', label: '精创主板' },
}

const PROJECT_TYPE_OPTIONS = [
  { value: '1', label: '采暖' },
  { value: '2', label: '冷暖' },
  { value: '3', label: '热水' },
]

const TERMINAL_TYPE_OPTIONS = [
  { value: '1', label: '地暖' },
  { value: '2', label: '暖气片' },
  { value: '3', label: '风机盘管' },
]

const SYSTEM_TYPE_OPTIONS = [
  { value: '1', label: '一次系统' },
  { value: '2', label: '二次系统' },
]

const LOOP_PUMP_MAIN_OPTIONS = [
  { value: '1', label: '一台' },
  { value: '2', label: '二台' },
  { value: '3', label: '三台' },
  { value: '4', label: '四台' },
]

const LOOP_PUMP_STANDBY_OPTIONS = [
  { value: '1', label: '一台' },
  { value: '2', label: '两台' },
  { value: '0', label: '无' },
]

const TERMINAL_PUMP_MODE_OPTIONS = [
  { value: '定频', label: '定频' },
  { value: '变频', label: '变频' },
]

const COUPLE_ENERGY_TYPE_NONE_ID = '5'
const COUPLING_ENERGY_OPTIONS = [
  { id: '1', label: '电锅炉' },
  { id: '2', label: '燃气锅炉' },
  { id: '3', label: '水源热泵' },
  { id: '4', label: '风冷模块' },
  { id: '5', label: '无耦合能源' },
]
const COUPLING_ENERGY_LABEL_TO_ID = COUPLING_ENERGY_OPTIONS.reduce((acc, item) => {
  acc[item.label] = item.id
  return acc
}, {})
const COUPLING_ENERGY_ID_TO_LABEL = COUPLING_ENERGY_OPTIONS.reduce((acc, item) => {
  acc[item.id] = item.label
  return acc
}, {})

const PROVINCE_OPTIONS = PROVINCE_ORDER.filter((name) => CITY_DATA[name]?.cities?.length).map((name) => ({
  value: CITY_DATA[name].province_code,
  label: name,
}))

const DATE_PICKER_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)
const DATE_PICKER_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)
const UNSAVED_MESSAGE = '当前页面有未保存修改，是否退出？'
const SAVE_CONFIRM_MESSAGE = '确认保存当前参数吗？'
const DETAIL_MAIN_KEYS = ['project-system-type', 'loop-pump-count', 'unit-layout', 'energy-price', 'coupling-energy']

/** 保存成功后传给 queryRealvalByLongNames 的长名；由后端协定时填入 */
const PROJECT_SAVE_VERIFY_LONG_NAMES = []
const CIRCULATION_PUMP_SAVE_VERIFY_LONG_NAMES = []

const CARD_ICON_MAP = {
  'project-system-type': basicSettingSystemTypeIcon,
  'loop-pump-count': basicSettingWaterPumpIcon,
  'unit-layout': basicSettingHpPositionIcon,
  'energy-price': basicSettingEnergyPriceIcon,
}

let motherboardDataRequestPromise = null
let coupleEnergyRequestPromise = null

function queryMotherboardDataOnce() {
  if (!motherboardDataRequestPromise) {
    motherboardDataRequestPromise = queryMotherboardData().catch((error) => {
      motherboardDataRequestPromise = null
      throw error
    })
  }
  return motherboardDataRequestPromise
}

function queryCoupleEnergyOnce() {
  if (!coupleEnergyRequestPromise) {
    coupleEnergyRequestPromise = queryCoupleEnergy().catch((error) => {
      coupleEnergyRequestPromise = null
      throw error
    })
  }
  return coupleEnergyRequestPromise
}

const initialProjectForm = createDefaultProjectForm()

const initialLoopPumpForm = createDefaultLoopPumpForm()

const initialSimpleForms = {
  'energy-price': { value: '0.56' },
  'coupling-energy': { value: '电锅炉 2台' },
}

const initialCouplingEnergyState = {
  type: '无耦合能源',
  count: '0',
}

function formatHeatingMonthDay(value) {
  if (!value) {
    return '请选择'
  }
  const [a, b] = value.split('-')
  if (!a || !b) {
    return value
  }
  return `${Number(a)}月${Number(b)}日`
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

function parseMonthDay(value) {
  if (!value) {
    const now = new Date()
    return [now.getMonth() + 1, now.getDate()]
  }
  const parts = value.split('-').map((p) => Number(p))
  if (parts.length >= 3) {
    const month = parts[1]
    const day = parts[2]
    if (Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(day) && day >= 1) {
      return [month, day]
    }
  }
  if (parts.length >= 2) {
    const [month, day] = parts
    if (Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(day) && day >= 1) {
      return [month, day]
    }
  }
  const now = new Date()
  return [now.getMonth() + 1, now.getDate()]
}

function SystemParamsPage({
  onUnsavedGuardChange,
  onSecondaryNavVisibilityChange,
  onModuleTabsVisibilityChange,
  onDetailBreadcrumbChange,
  onUnitLayoutCommitted,
}) {
  const [activeView, setActiveView] = useState('overview')
  const [mainboard, setMainboard] = useState('')
  const [mainboardOptions, setMainboardOptions] = useState(() => Object.values(MAINBOARD_OPTIONS_MAP))
  const [mainboardRecordId, setMainboardRecordId] = useState('')
  const [mainboardDataLoading, setMainboardDataLoading] = useState(false)
  const [mainboardSaveLoading, setMainboardSaveLoading] = useState(false)
  const [projectForm, setProjectForm] = useState(() => deepClone(initialProjectForm))
  const [savedProjectForm, setSavedProjectForm] = useState(() => deepClone(initialProjectForm))
  const [loopPumpForm, setLoopPumpForm] = useState(() => deepClone(initialLoopPumpForm))
  const [savedLoopPumpForm, setSavedLoopPumpForm] = useState(() => deepClone(initialLoopPumpForm))
  const [simpleForms, setSimpleForms] = useState(() => deepClone(initialSimpleForms))
  const [savedSimpleForms, setSavedSimpleForms] = useState(() => deepClone(initialSimpleForms))
  const [couplingEnergyState, setCouplingEnergyState] = useState(() => deepClone(initialCouplingEnergyState))
  const [savedCouplingEnergyState, setSavedCouplingEnergyState] = useState(() => deepClone(initialCouplingEnergyState))
  const [couplingEnergyRecordId, setCouplingEnergyRecordId] = useState('')
  const [couplingEnergyProjectId, setCouplingEnergyProjectId] = useState('')
  const [couplingEnergySaveLoading, setCouplingEnergySaveLoading] = useState(false)
  const [keypadState, setKeypadState] = useState({ open: false, field: null, moduleKey: null })
  const [datePickerField, setDatePickerField] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, mode: null, targetView: null, title: '', message: '' })
  const [unitLayoutDirty, setUnitLayoutDirty] = useState(false)
  const [energyPriceDirty, setEnergyPriceDirty] = useState(false)
  const [projectDataLoading, setProjectDataLoading] = useState(false)
  const [projectSaveLoading, setProjectSaveLoading] = useState(false)
  const [circulationPumpDataLoading, setCirculationPumpDataLoading] = useState(false)
  const [circulationPumpSaveLoading, setCirculationPumpSaveLoading] = useState(false)
  const [energyPriceDataLoading, setEnergyPriceDataLoading] = useState(false)
  const [energyPriceSaveLoading, setEnergyPriceSaveLoading] = useState(false)

  const unitLayoutRef = useRef(null)
  const energyPriceRef = useRef(null)

  const selectedProvinceName = useMemo(
    () => findProvinceNameByCode(projectForm.provinceCode),
    [projectForm.provinceCode],
  )

  const cityOptions = useMemo(() => {
    const cities = CITY_DATA[selectedProvinceName]?.cities || []
    return cities.map((c) => ({ value: String(c.projectAreaId), label: c.city_name }))
  }, [selectedProvinceName])

  const datePickerValue = useMemo(() => {
    if (!datePickerField) {
      return []
    }
    return parseMonthDay(projectForm[datePickerField])
  }, [datePickerField, projectForm])

  useEffect(() => {
    const shouldHideSecondaryNav = activeView !== 'overview'
    onSecondaryNavVisibilityChange?.(shouldHideSecondaryNav)

    return () => {
      onSecondaryNavVisibilityChange?.(false)
    }
  }, [activeView, onSecondaryNavVisibilityChange])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setMainboardDataLoading(true)
      try {
        const response = await queryMotherboardDataOnce()
        const next = adaptMotherboardFromQueryResponse(response)
        if (cancelled || !next) {
          return
        }
        setMainboard(next.value)
        setMainboardRecordId(next.id)
        setMainboardOptions(next.options)
      } catch {
        if (!cancelled) {
          setMainboard('1')
          setMainboardRecordId('')
          setMainboardOptions(Object.values(MAINBOARD_OPTIONS_MAP))
        }
      } finally {
        if (!cancelled) {
          setMainboardDataLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const response = await queryCoupleEnergyOnce()
        const next = adaptCoupleEnergyFromQueryResponse(response)
        if (cancelled || !next) {
          return
        }
        const typeLabel = COUPLING_ENERGY_ID_TO_LABEL[next.typeId] || '无耦合能源'
        const normalizedCount = typeLabel === '无耦合能源' ? '0' : next.count
        const nextState = {
          type: typeLabel,
          count: normalizedCount,
        }
        setCouplingEnergyState(nextState)
        setSavedCouplingEnergyState(deepClone(nextState))
        setCouplingEnergyRecordId(next.id)
        setCouplingEnergyProjectId(next.projectId)
      } catch {
        // 保持当前耦合能源状态
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleMainboardChange = (nextValue) => {
    if (mainboardSaveLoading || mainboardDataLoading) {
      return
    }
    const normalizedValue = String(nextValue ?? '')
    if (!MAINBOARD_OPTIONS_MAP[normalizedValue]) {
      return
    }
    setMainboardSaveLoading(true)
    void (async () => {
      try {
        const payload = toUpdateMotherboardPayload({
          id: mainboardRecordId,
          motherboardModel: normalizedValue,
        })
        const saveRes = await updateMotherboardData(payload)
        if (isWriteSuccess(saveRes)) {
          setMainboard(normalizedValue)
          setConfirmDialog({
            open: true,
            mode: 'alert',
            targetView: null,
            title: '提示',
            message: '保存成功',
          })
          return
        }
        setConfirmDialog({
          open: true,
          mode: 'alert',
          targetView: null,
          title: '提示',
          message: '保存失败',
        })
      } catch {
        setConfirmDialog({
          open: true,
          mode: 'alert',
          targetView: null,
          title: '提示',
          message: '保存失败，请检查网络',
        })
      } finally {
        setMainboardSaveLoading(false)
      }
    })()
  }

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

  useEffect(() => {
    if (activeView !== 'project-system-type') {
      return undefined
    }
    let cancelled = false
    ;(async () => {
      setProjectDataLoading(true)
      try {
        const response = await queryProjectData()
        const next = adaptProjectDataFromQueryResponse(response)
        if (cancelled || !next) {
          return
        }
        setProjectForm(next)
        setSavedProjectForm(deepClone(next))
      } catch {
        // 保留当前表单，使用上次成功或默认
      } finally {
        if (!cancelled) {
          setProjectDataLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeView])

  useEffect(() => {
    if (activeView !== 'loop-pump-count') {
      return undefined
    }
    let cancelled = false
    ;(async () => {
      setCirculationPumpDataLoading(true)
      try {
        const response = await queryCirculationPump()
        const next = adaptCirculationPumpFromQueryResponse(response)
        if (cancelled || !next) {
          return
        }
        setLoopPumpForm(next)
        setSavedLoopPumpForm(deepClone(next))
      } catch {
        // 保留当前表单
      } finally {
        if (!cancelled) {
          setCirculationPumpDataLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeView])

  useEffect(() => {
    if (activeView !== 'energy-price') {
      return undefined
    }
    let cancelled = false
    ;(async () => {
      setEnergyPriceDataLoading(true)
      try {
        const ok = await energyPriceRef.current?.loadFromServer?.()
        if (!ok && !cancelled) {
          setConfirmDialog({
            open: true,
            mode: 'alert',
            targetView: null,
            title: '提示',
            message: '能源价格读取失败，已回退默认值',
          })
        }
      } catch {
        if (!cancelled) {
          setConfirmDialog({
            open: true,
            mode: 'alert',
            targetView: null,
            title: '提示',
            message: '能源价格读取失败，请检查网络',
          })
        }
      } finally {
        if (!cancelled) {
          setEnergyPriceDataLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeView])

  const showTerminalLoopPumpSection = loopPumpForm.systemTypeUuid === '2'

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
      return
    }

    if (activeView === 'loop-pump-count') {
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
      if (activeView === 'project-system-type') {
        if (projectSaveLoading || projectDataLoading) {
          return
        }
        setProjectSaveLoading(true)
        void (async () => {
          try {
            const payload = toSaveProjectDataPayload(projectForm)
            const saveRes = await saveProjectData(payload)
            if (!isWriteSuccess(saveRes)) {
              setConfirmDialog({
                open: true,
                mode: 'alert',
                targetView: null,
                title: '提示',
                message: '保存失败',
              })
              return
            }
            if (PROJECT_SAVE_VERIFY_LONG_NAMES.length > 0) {
              try {
                await queryRealvalByLongNames(PROJECT_SAVE_VERIFY_LONG_NAMES)
              } catch {
                // 回读失败仍继续拉取项目数据
              }
            }
            const refresh = await queryProjectData()
            const next = adaptProjectDataFromQueryResponse(refresh)
            if (next) {
              setProjectForm(next)
              setSavedProjectForm(deepClone(next))
            } else {
              setSavedProjectForm(deepClone(projectForm))
            }
            closeConfirmDialog()
            setConfirmDialog({
              open: true,
              mode: 'alert',
              targetView: null,
              title: '提示',
              message: '保存成功',
            })
          } catch {
            setConfirmDialog({
              open: true,
              mode: 'alert',
              targetView: null,
              title: '提示',
              message: '保存失败，请检查网络',
            })
          } finally {
            setProjectSaveLoading(false)
          }
        })()
        return
      }
      if (activeView === 'loop-pump-count') {
        if (circulationPumpSaveLoading || circulationPumpDataLoading) {
          return
        }
        setCirculationPumpSaveLoading(true)
        void (async () => {
          try {
            const projectData = toSaveCirculationPumpPayload(loopPumpForm)
            const saveRes = await saveCirculationPump(projectData)
            if (!isWriteSuccess(saveRes)) {
              setConfirmDialog({
                open: true,
                mode: 'alert',
                targetView: null,
                title: '提示',
                message: '保存失败',
              })
              return
            }
            if (CIRCULATION_PUMP_SAVE_VERIFY_LONG_NAMES.length > 0) {
              try {
                await queryRealvalByLongNames(CIRCULATION_PUMP_SAVE_VERIFY_LONG_NAMES)
              } catch {
                // 回读失败仍继续拉取
              }
            }
            const refresh = await queryCirculationPump()
            const next = adaptCirculationPumpFromQueryResponse(refresh)
            if (next) {
              setLoopPumpForm(next)
              setSavedLoopPumpForm(deepClone(next))
            } else {
              setSavedLoopPumpForm(deepClone(loopPumpForm))
            }
            closeConfirmDialog()
            setConfirmDialog({
              open: true,
              mode: 'alert',
              targetView: null,
              title: '提示',
              message: '保存成功',
            })
          } catch {
            setConfirmDialog({
              open: true,
              mode: 'alert',
              targetView: null,
              title: '提示',
              message: '保存失败，请检查网络',
            })
          } finally {
            setCirculationPumpSaveLoading(false)
          }
        })()
        return
      }
      if (activeView === 'energy-price') {
        if (energyPriceDataLoading || energyPriceSaveLoading) {
          return
        }
        setEnergyPriceSaveLoading(true)
        void (async () => {
          try {
            const ok = await energyPriceRef.current?.saveToServer?.()
            if (!ok) {
              return
            }
            closeConfirmDialog()
            setConfirmDialog({
              open: true,
              mode: 'alert',
              targetView: null,
              title: '提示',
              message: '保存成功',
            })
          } finally {
            setEnergyPriceSaveLoading(false)
          }
        })()
        return
      }
      if (activeView === 'coupling-energy') {
        if (couplingEnergySaveLoading) {
          return
        }
        setCouplingEnergySaveLoading(true)
        void (async () => {
          try {
            const payload = toSaveCoupleEnergyPayload({
              coupleEnergyTypeId: COUPLING_ENERGY_LABEL_TO_ID[couplingEnergyState.type] || '',
              id: couplingEnergyRecordId,
              projectId: couplingEnergyProjectId,
              coupleEnergyNumber: couplingEnergyState.count,
            })
            const saveRes = await saveCoupleEnergy(payload)
            const state = String(saveRes?.data?.data?.state ?? '')
            if (state !== 'success') {
              setConfirmDialog({
                open: true,
                mode: 'alert',
                targetView: null,
                title: '提示',
                message: '保存失败',
              })
              return
            }
            setSavedCouplingEnergyState(deepClone(couplingEnergyState))
            closeConfirmDialog()
            setConfirmDialog({
              open: true,
              mode: 'alert',
              targetView: null,
              title: '提示',
              message: '保存成功',
            })
          } catch {
            setConfirmDialog({
              open: true,
              mode: 'alert',
              targetView: null,
              title: '提示',
              message: '保存失败，请检查网络',
            })
          } finally {
            setCouplingEnergySaveLoading(false)
          }
        })()
        return
      }
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
    if (!datePickerField || !Array.isArray(nextDateParts) || nextDateParts.length < 2) {
      setDatePickerField(null)
      return
    }

    const rawMonth = Number(nextDateParts[0])
    const rawDay = Number(nextDateParts[1])
    const now = new Date()
    const month = Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : now.getMonth() + 1
    const maxDay = new Date(2024, month, 0).getDate()
    const day =
      Number.isInteger(rawDay) && rawDay >= 1
        ? Math.min(rawDay, maxDay)
        : Math.min(now.getDate(), maxDay)
    setProjectForm((previous) => ({
      ...previous,
      [datePickerField]: `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    }))
    setDatePickerField(null)
  }

  const renderDetailHeader = (title, options = {}) => {
    const { saveDisabled = false } = options
    return (
      <div className="system-params-detail__header">
        <button type="button" className="system-params-back" onClick={handleBackToOverview}>
          <img src={arrowLeftSelectedIcon} alt="" aria-hidden="true" />
        </button>
        <h3>{title}</h3>
        <button type="button" className="system-params-save" onClick={handleSaveClick} disabled={saveDisabled}>
          保存
        </button>
      </div>
    )
  }

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
          options={mainboardOptions}
          onChange={handleMainboardChange}
          triggerAriaLabel="选择主板类型"
          className="system-params-select"
          disabled={mainboardDataLoading || mainboardSaveLoading}
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
    <div className={`system-params-detail${projectDataLoading ? ' is-project-loading' : ''}`}>
      {renderDetailHeader('项目系统类型', {
        saveDisabled: projectDataLoading || projectSaveLoading,
      })}

      <div className="system-params-form-grid system-params-form-grid--project">
        <label className="system-params-field">
          <span>项目类型</span>
          <SelectDropdown
            value={projectForm.projectType}
            options={PROJECT_TYPE_OPTIONS}
            onChange={(value) => setProjectForm((prev) => ({ ...prev, projectType: value }))}
            disabled={projectDataLoading}
          />
        </label>

        <label className="system-params-field">
          <span>末端类型</span>
          <SelectDropdown
            value={projectForm.terminalType}
            options={TERMINAL_TYPE_OPTIONS}
            onChange={(value) => setProjectForm((prev) => ({ ...prev, terminalType: value }))}
            disabled={projectDataLoading}
          />
        </label>

        <label className="system-params-field">
          <span>系统类型</span>
          <SelectDropdown
            value={projectForm.systemType}
            options={SYSTEM_TYPE_OPTIONS}
            onChange={(value) => setProjectForm((prev) => ({ ...prev, systemType: value }))}
            disabled={projectDataLoading}
          />
        </label>

        <div className="system-params-field system-params-field--region">
          <span>区域</span>
          <div className="system-params-region-grid">
            <SelectDropdown
              value={projectForm.provinceCode}
              options={PROVINCE_OPTIONS}
              onChange={(value) => {
                const name = findProvinceNameByCode(value)
                const first = CITY_DATA[name]?.cities?.[0]
                setProjectForm((prev) => ({
                  ...prev,
                  provinceCode: value,
                  projectAreaId: first ? String(first.projectAreaId) : prev.projectAreaId,
                }))
              }}
              disabled={projectDataLoading}
            />
            <SelectDropdown
              value={projectForm.projectAreaId}
              options={cityOptions}
              onChange={(v) => setProjectForm((prev) => ({ ...prev, projectAreaId: v }))}
              disabled={projectDataLoading}
            />
          </div>
        </div>

        <button
          type="button"
          className="system-params-field system-params-field--input"
          onClick={() => openNumberPad('heatPumpCount')}
          disabled={projectDataLoading}
        >
          <span>热泵总台数</span>
          <div className="system-params-input-display">
            <span>{projectForm.heatPumpCount}</span>
            <span className="system-params-input-unit">台</span>
          </div>
        </button>

        <button
          type="button"
          className="system-params-field system-params-field--input"
          onClick={() => openNumberPad('heatingArea')}
          disabled={projectDataLoading}
        >
          <span>供暖面积</span>
          <div className="system-params-input-display">
            <span>{projectForm.heatingArea}</span>
            <span className="system-params-input-unit">m²</span>
          </div>
        </button>

        <div className="system-params-field system-params-field--date">
          <span>采暖季</span>
          <div className="system-params-date-range">
            <button type="button" onClick={() => setDatePickerField('heatingSeasonStart')} disabled={projectDataLoading}>
              <span className="system-params-date-value">{formatHeatingMonthDay(projectForm.heatingSeasonStart)}</span>
              <img src={dateIcon} alt="" aria-hidden="true" className="system-params-date-icon" />
            </button>
            <em>-</em>
            <button type="button" onClick={() => setDatePickerField('heatingSeasonEnd')} disabled={projectDataLoading}>
              <span className="system-params-date-value">{formatHeatingMonthDay(projectForm.heatingSeasonEnd)}</span>
              <img src={dateIcon} alt="" aria-hidden="true" className="system-params-date-icon" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderLoopPumpCountDetail = () => (
    <div className={`system-params-detail${circulationPumpDataLoading ? ' is-circulation-pump-loading' : ''}`}>
      {renderDetailHeader('循环泵台数', {
        saveDisabled: circulationPumpDataLoading || circulationPumpSaveLoading,
      })}

      <div className="system-params-loop-pump">
        <div className="system-params-pump-block">
          <div className="system-params-pump-divider" role="separator">
            热泵循环泵
          </div>
          <div className="system-params-form-grid system-params-form-grid--loop-pump">
            <label className="system-params-field">
              <span>主泵台数</span>
              <SelectDropdown
                value={loopPumpForm.heatMain}
                options={LOOP_PUMP_MAIN_OPTIONS}
                onChange={(value) => setLoopPumpForm((prev) => ({ ...prev, heatMain: value }))}
                disabled={circulationPumpDataLoading}
              />
            </label>
            <label className="system-params-field">
              <span>备泵台数</span>
              <SelectDropdown
                value={loopPumpForm.heatSpare}
                options={LOOP_PUMP_STANDBY_OPTIONS}
                onChange={(value) => setLoopPumpForm((prev) => ({ ...prev, heatSpare: value }))}
                disabled={circulationPumpDataLoading}
              />
            </label>
          </div>
        </div>

        {showTerminalLoopPumpSection ? (
          <div className="system-params-pump-block system-params-pump-block--terminal">
            <div className="system-params-pump-divider" role="separator">
              末端循环泵
            </div>
            <div className="system-params-form-grid system-params-form-grid--loop-pump system-params-form-grid--loop-pump-terminal">
              <label className="system-params-field">
                <span>主泵台数</span>
                <SelectDropdown
                  value={loopPumpForm.terminalMain}
                  options={LOOP_PUMP_MAIN_OPTIONS}
                  onChange={(value) => setLoopPumpForm((prev) => ({ ...prev, terminalMain: value }))}
                  disabled={circulationPumpDataLoading}
                />
              </label>
              <label className="system-params-field">
                <span>备泵台数</span>
                <SelectDropdown
                  value={loopPumpForm.terminalSpare}
                  options={LOOP_PUMP_STANDBY_OPTIONS}
                  onChange={(value) => setLoopPumpForm((prev) => ({ ...prev, terminalSpare: value }))}
                  disabled={circulationPumpDataLoading}
                />
              </label>
              <label className="system-params-field system-params-field--full-row">
                <span>运行模式</span>
                <SelectDropdown
                  value={loopPumpForm.terminalMode}
                  options={TERMINAL_PUMP_MODE_OPTIONS}
                  onChange={(value) => setLoopPumpForm((prev) => ({ ...prev, terminalMode: value }))}
                  disabled={circulationPumpDataLoading}
                />
              </label>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )

  const renderCouplingEnergyDetail = () => (
    <div className="system-params-detail">
      {renderDetailHeader('耦合能源', {
        saveDisabled: couplingEnergySaveLoading,
      })}

      <div className="coupling-energy-detail">
        <div className="coupling-energy-detail__label">能源类型</div>
        <div className="coupling-energy-detail__types">
          {COUPLING_ENERGY_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`coupling-energy-type${couplingEnergyState.type === item.label ? ' is-active' : ''}`}
              onClick={() =>
                setCouplingEnergyState((previous) => ({
                  ...previous,
                  type: item.label,
                  count: item.id === COUPLE_ENERGY_TYPE_NONE_ID ? '0' : previous.count,
                }))
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="system-params-field system-params-field--input coupling-energy-count"
          onClick={() => openNumberPad('value', 'coupling-count')}
          disabled={COUPLING_ENERGY_LABEL_TO_ID[couplingEnergyState.type] === COUPLE_ENERGY_TYPE_NONE_ID}
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
        <SystemParamsEnergyPrice
          ref={energyPriceRef}
          variant="settings"
          settingsHeader={renderDetailHeader('能源价格', {
            saveDisabled: energyPriceDataLoading || energyPriceSaveLoading,
          })}
          onDirtyChange={setEnergyPriceDirty}
        />
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
        isLoading={
          confirmDialog.mode === 'save' &&
          ((activeView === 'project-system-type' && projectSaveLoading) ||
            (activeView === 'loop-pump-count' && circulationPumpSaveLoading) ||
            (activeView === 'energy-price' && energyPriceSaveLoading) ||
            (activeView === 'coupling-energy' && couplingEnergySaveLoading))
        }
        loadingText="保存中"
        onClose={closeConfirmDialog}
        onConfirm={handleConfirmDialogConfirm}
        onCancel={closeConfirmDialog}
      />
    </div>
  )
}

export default SystemParamsPage

