import { createPortal } from 'react-dom'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import AttentionModal from '../AttentionModal'
import hpRunningIcon from '../../assets/heat-pump/hp-running.svg'
import hpNullIcon from '../../assets/heat-pump/hp-null.svg'
import arrowRightSelectedIcon from '../../assets/arrow-right-blackbg.svg'
import arrowLeftSelectedIcon from '../../assets/arrow-left-blackbg.svg'
import showIcon from '../../assets/icons/show.svg'
import hideIcon from '../../assets/icons/hide.svg'
import longArrowDownBlueIcon from '../../assets/long-arrow-down-blue.svg'
import longArrowDownGrayIcon from '../../assets/long-arrow-down-gray.svg'
import { HEAT_PUMP_GRID_ITEMS } from '../../config/homeHeatPumps'
import { queryDeviceArrange, saveDeviceArrange, scanDeviceState } from '../../api/modules/home'

const UNIT_LAYOUT_COLS = 10
const UNIT_LAYOUT_ROWS = 10
const UNIT_TOTAL = 33

const UNIT_PUMP_ITEMS = HEAT_PUMP_GRID_ITEMS.filter((item) => item.id !== null)
  .sort((a, b) => a.id - b.id)
  .slice(0, UNIT_TOTAL)

const UNIT_PUMP_ID_SET = new Set(UNIT_PUMP_ITEMS.map((item) => item.id))

const INITIAL_UNIT_LAYOUT_STATE = {
  slots: Array.from({ length: UNIT_LAYOUT_COLS * UNIT_LAYOUT_ROWS }, () => null),
  pendingIds: [],
  layoutLocked: false,
  numberingDone: false,
  numberingMap: {},
  showOriginalNo: false,
}

function toNoLabel(id) {
  return `No${String(id).padStart(2, '0')}`
}

function toDeviceCode(id) {
  return `No${id}`
}

function parsePumpId(value) {
  const text = String(value ?? '').trim()
  if (!text) {
    return null
  }
  if (/^\d+$/.test(text)) {
    const asNumber = Number(text)
    return Number.isInteger(asNumber) && UNIT_PUMP_ID_SET.has(asNumber) ? asNumber : null
  }
  const matched = text.match(/^No0*(\d+)$/i)
  if (!matched) {
    return null
  }
  const asNumber = Number(matched[1])
  return Number.isInteger(asNumber) && UNIT_PUMP_ID_SET.has(asNumber) ? asNumber : null
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

function normalizeHeatPumpCount(value) {
  const count = Number(value)
  if (!Number.isInteger(count)) {
    return UNIT_TOTAL
  }
  return Math.max(0, Math.min(count, UNIT_TOTAL))
}

/**
 * `post()` 返回 `{ status, data, headers }`，业务包在 `data` 内：`{ code, msg, success, data }`。
 */
function parseAlgorithmProcessPayload(httpResponse) {
  const payload = httpResponse?.data
  if (payload == null || typeof payload !== 'object') {
    return { ok: false, msg: '', data: undefined }
  }
  const codeNum = Number(payload.code)
  const ok = payload.success === true || codeNum === 200
  const msg = typeof payload.msg === 'string' ? payload.msg : ''
  return { ok, msg, data: payload.data }
}

const SystemParamsUnitLayout = forwardRef(function SystemParamsUnitLayout(
  {
    variant = 'settings',
    heatPumpCount,
    settingsHeader = null,
    onDirtyChange,
    onUnitLayoutCommitted,
    onLayoutStatusChange,
    queryArrangeOnMount = false,
    arrangeViewOnly = false,
    onArrangeViewOnlyExit,
  },
  ref,
) {
  const [unitSlots, setUnitSlots] = useState(() => [...INITIAL_UNIT_LAYOUT_STATE.slots])
  const [pendingUnitIds, setPendingUnitIds] = useState(() => [...INITIAL_UNIT_LAYOUT_STATE.pendingIds])
  const [unitLayoutLocked, setUnitLayoutLocked] = useState(INITIAL_UNIT_LAYOUT_STATE.layoutLocked)
  const [unitNumberingMap, setUnitNumberingMap] = useState(() => ({ ...INITIAL_UNIT_LAYOUT_STATE.numberingMap }))
  const [unitNumberingDone, setUnitNumberingDone] = useState(INITIAL_UNIT_LAYOUT_STATE.numberingDone)
  const [showOriginalNo, setShowOriginalNo] = useState(INITIAL_UNIT_LAYOUT_STATE.showOriginalNo)
  const [longPressedPendingIds, setLongPressedPendingIds] = useState(() => ({}))
  const [smartScanEnabled, setSmartScanEnabled] = useState(true)
  const [hasUnitLayoutReset, setHasUnitLayoutReset] = useState(false)
  const [manualDraggingPumpId, setManualDraggingPumpId] = useState(null)
  const [manualDraggingSource, setManualDraggingSource] = useState(null)
  const [manualDragPointer, setManualDragPointer] = useState({ x: 0, y: 0 })
  const [savedUnitLayoutState, setSavedUnitLayoutState] = useState(() => cloneUnitLayoutState(INITIAL_UNIT_LAYOUT_STATE))
  const [detectedHeatPumpCount, setDetectedHeatPumpCount] = useState(0)
  const [projectId, setProjectId] = useState('')
  const [isOperating, setIsOperating] = useState(false)
  const [alertDialog, setAlertDialog] = useState({ open: false, title: '', message: '' })
  const pendingLongPressTimerRef = useRef(null)
  const draggingPumpIdRef = useRef(null)
  const manualDraggingPumpIdRef = useRef(null)
  const pendingListRef = useRef(null)
  const unitLayoutLockedRef = useRef(unitLayoutLocked)
  const movePumpToSlotRef = useRef(null)
  const dragStartPointRef = useRef({ x: 0, y: 0 })
  const dragPreviewOffsetRef = useRef({ x: 52, y: 50 })
  const didManualDragMoveRef = useRef(false)
  const suppressNextClickRef = useRef(false)

  const openAlertDialog = useCallback((title, message) => {
    setAlertDialog({ open: true, title, message })
  }, [])

  const closeAlertDialog = useCallback(() => {
    setAlertDialog({ open: false, title: '', message: '' })
  }, [])

  const addedUnitIds = useMemo(() => unitSlots.filter((id) => id != null), [unitSlots])
  const nextUnitNumber = useMemo(() => Object.keys(unitNumberingMap).length + 1, [unitNumberingMap])
  const totalHeatPumpCount = useMemo(() => normalizeHeatPumpCount(detectedHeatPumpCount), [detectedHeatPumpCount])
  const canFinishLayout = pendingUnitIds.length === 0 && addedUnitIds.length > 0 && !unitLayoutLocked
  const canFinishNumbering = unitLayoutLocked && !unitNumberingDone && Object.keys(unitNumberingMap).length === addedUnitIds.length
  const canToggleOriginalNo = unitNumberingDone && !arrangeViewOnly
  const isGuideVariant = variant === 'guide'
  const isSettingsVariant = variant === 'settings'
  const canReset = !isOperating && (isSettingsVariant || hasUnitLayoutReset || unitLayoutLocked || unitNumberingDone)
  const canSmartScan =
    !arrangeViewOnly && !isOperating && !unitLayoutLocked && !unitNumberingDone && (isGuideVariant || hasUnitLayoutReset)
  const canClickCompleteLayout = !arrangeViewOnly && !isOperating && !unitLayoutLocked && !unitNumberingDone && hasUnitLayoutReset
  const canRenumber = !arrangeViewOnly && !isOperating && unitLayoutLocked && !unitNumberingDone
  const canClickCompleteNumbering = !arrangeViewOnly && !isOperating && unitLayoutLocked && !unitNumberingDone

  const snapshot = useMemo(
    () => ({
      slots: unitSlots,
      pendingIds: pendingUnitIds,
      layoutLocked: unitLayoutLocked,
      numberingDone: unitNumberingDone,
      numberingMap: unitNumberingMap,
      showOriginalNo,
    }),
    [unitSlots, pendingUnitIds, unitLayoutLocked, unitNumberingDone, unitNumberingMap, showOriginalNo],
  )

  const isDirty = useMemo(() => JSON.stringify(snapshot) !== JSON.stringify(savedUnitLayoutState), [snapshot, savedUnitLayoutState])

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(() => {
    onLayoutStatusChange?.({ numberingDone: unitNumberingDone })
  }, [unitNumberingDone, onLayoutStatusChange])

  const commit = useCallback(() => {
    setSavedUnitLayoutState(cloneUnitLayoutState(snapshot))
    return true
  }, [snapshot])

  useImperativeHandle(ref, () => ({ commit }), [commit])

  useEffect(
    () => () => {
      if (pendingLongPressTimerRef.current) {
        clearTimeout(pendingLongPressTimerRef.current)
        pendingLongPressTimerRef.current = null
      }
    },
    [],
  )

  useEffect(() => {
    const getPreviewPosition = (clientX, clientY) => {
      const offset = dragPreviewOffsetRef.current
      return {
        x: clientX - offset.x,
        y: clientY - offset.y,
      }
    }

    const dropByClientPoint = (clientX, clientY) => {
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
        movePumpToSlotRef.current?.(dragId, slotIndex)
      }
    }

    const clearDragState = () => {
      draggingPumpIdRef.current = null
      setManualDraggingPumpId(null)
      setManualDraggingSource(null)
      dragPreviewOffsetRef.current = { x: 52, y: 50 }
      if (pendingLongPressTimerRef.current) {
        clearTimeout(pendingLongPressTimerRef.current)
        pendingLongPressTimerRef.current = null
      }
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
      setManualDragPointer(getPreviewPosition(event.clientX, event.clientY))
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
      setManualDragPointer(getPreviewPosition(point.clientX, point.clientY))
    }

    const handleGlobalMouseUp = (event) => {
      dropByClientPoint(event.clientX, event.clientY)
      suppressNextClickRef.current = didManualDragMoveRef.current
      didManualDragMoveRef.current = false
      clearDragState()
    }

    const handleGlobalTouchEnd = (event) => {
      const point = event.changedTouches?.[0]
      if (point) {
        dropByClientPoint(point.clientX, point.clientY)
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

  const applyQueryArrangeData = useCallback((responseData) => {
    const arrangeList = Array.isArray(responseData?.pumpArrange) ? responseData.pumpArrange : []
    const nextProjectId = String(responseData?.projectId ?? '')
    const nextSlots = Array.from({ length: UNIT_LAYOUT_COLS * UNIT_LAYOUT_ROWS }, () => null)
    const nextNumberingMap = {}
    const usedIds = new Set()
    let maxArrangeCode = 0

    arrangeList.forEach((item) => {
      const pumpId = parsePumpId(item?.device_uuid)
      const rowNumber = Number(item?.row_number)
      const columnNumber = Number(item?.column_number)
      if (!pumpId) {
        return
      }
      if (!Number.isInteger(rowNumber) || !Number.isInteger(columnNumber)) {
        return
      }
      if (rowNumber < 1 || rowNumber > UNIT_LAYOUT_ROWS || columnNumber < 1 || columnNumber > UNIT_LAYOUT_COLS) {
        return
      }
      const slotIndex = (rowNumber - 1) * UNIT_LAYOUT_COLS + (columnNumber - 1)
      nextSlots[slotIndex] = pumpId
      usedIds.add(pumpId)
      const arrangeCode = Number(item?.arrange_code)
      if (Number.isInteger(arrangeCode) && arrangeCode > 0) {
        nextNumberingMap[pumpId] = arrangeCode
        if (arrangeCode > maxArrangeCode) {
          maxArrangeCode = arrangeCode
        }
      }
    })

    const addedIds = nextSlots.filter((id) => id != null)
    const placedCount = addedIds.length

    // 后端无已保存排布时：与首次进入一致，待添加为空，需用户点击「智能扫描」，勿把 1..台数 预填进待添加
    if (placedCount === 0) {
      const freshState = {
        slots: Array.from({ length: UNIT_LAYOUT_COLS * UNIT_LAYOUT_ROWS }, () => null),
        pendingIds: [],
        layoutLocked: false,
        numberingDone: false,
        numberingMap: {},
        showOriginalNo: false,
      }
      setProjectId(nextProjectId)
      setDetectedHeatPumpCount(0)
      setUnitSlots(freshState.slots)
      setPendingUnitIds(freshState.pendingIds)
      setUnitLayoutLocked(freshState.layoutLocked)
      setUnitNumberingDone(freshState.numberingDone)
      setUnitNumberingMap(freshState.numberingMap)
      setShowOriginalNo(false)
      setLongPressedPendingIds({})
      setSmartScanEnabled(true)
      setHasUnitLayoutReset(false)
      setManualDraggingPumpId(null)
      setManualDraggingSource(null)
      draggingPumpIdRef.current = null
      setSavedUnitLayoutState(cloneUnitLayoutState(freshState))
      return
    }

    const configuredCap = normalizeHeatPumpCount(Number(heatPumpCount))
    // 与向导「热泵台数」一致，避免出现 待添加(30) / 添加热泵 3/0；无有效配置时用已排布台数
    const effectiveTotal =
      configuredCap > 0 ? Math.max(configuredCap, placedCount) : Math.max(placedCount, 1)
    const pendingIds = Array.from({ length: effectiveTotal }, (_, index) => index + 1).filter((id) => !usedIds.has(id))
    const hasArrangedPumps = placedCount > 0
    const hasFullNumbering = hasArrangedPumps && Object.keys(nextNumberingMap).length === addedIds.length

    const nextState = {
      slots: nextSlots,
      pendingIds,
      layoutLocked: hasArrangedPumps,
      numberingDone: hasFullNumbering,
      numberingMap: hasFullNumbering ? nextNumberingMap : {},
      showOriginalNo: false,
    }

    setProjectId(nextProjectId)
    setDetectedHeatPumpCount(effectiveTotal)
    setUnitSlots(nextState.slots)
    setPendingUnitIds(nextState.pendingIds)
    setUnitLayoutLocked(nextState.layoutLocked)
    setUnitNumberingDone(nextState.numberingDone)
    setUnitNumberingMap(nextState.numberingMap)
    setShowOriginalNo(false)
    setLongPressedPendingIds({})
    setSmartScanEnabled(true)
    setHasUnitLayoutReset(hasArrangedPumps)
    setManualDraggingPumpId(null)
    setManualDraggingSource(null)
    draggingPumpIdRef.current = null
    setSavedUnitLayoutState(cloneUnitLayoutState(nextState))
  }, [heatPumpCount])

  useEffect(() => {
    if (!queryArrangeOnMount) {
      return
    }
    let cancelled = false

    const run = async () => {
      setIsOperating(true)
      try {
        const response = await queryDeviceArrange()
        if (cancelled) {
          return
        }
        const { ok, msg, data } = parseAlgorithmProcessPayload(response)
        if (!ok) {
          openAlertDialog('提示', msg || '查询机组排布失败，请稍后重试。')
          return
        }
        applyQueryArrangeData(data ?? {})
      } catch (error) {
        if (!cancelled) {
          openAlertDialog('提示', error?.message || '查询机组排布失败，请稍后重试。')
        }
      } finally {
        if (!cancelled) {
          setIsOperating(false)
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [applyQueryArrangeData, openAlertDialog, queryArrangeOnMount])

  const resetUnitLayout = async () => {
    if (isOperating) {
      return
    }
    setIsOperating(true)
    try {
      const response = await scanDeviceState('reset')
      const { ok, msg, data } = parseAlgorithmProcessPayload(response)
      if (!ok) {
        openAlertDialog('提示', msg || '复位失败，请稍后重试。')
        return
      }
      const scannedDeviceList = Array.isArray(data?.device) ? data.device : []
      setDetectedHeatPumpCount(data?.heatPump)
      const scannedIds = scannedDeviceList
        .map((item) => parsePumpId(item?.code))
        .filter((id) => id != null)
        .sort((a, b) => a - b)
      const allCurrentIds = [...new Set(scannedIds)]
        .filter((id) => UNIT_PUMP_ID_SET.has(id))
        .sort((a, b) => a - b)
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
      if (arrangeViewOnly) {
        onArrangeViewOnlyExit?.()
      }
    } catch (error) {
      openAlertDialog('提示', error?.message || '复位失败，请稍后重试。')
    } finally {
      setIsOperating(false)
    }
  }

  const handleSmartScan = async () => {
    if (arrangeViewOnly) {
      return
    }
    const rawTargetCount = Number(heatPumpCount)
    if (!smartScanEnabled || isOperating) {
      return
    }
    setIsOperating(true)
    let scannedIds = []
    let scannedHeatPumpCount = null
    try {
      const response = await scanDeviceState('')
      const { ok, msg, data } = parseAlgorithmProcessPayload(response)
      if (!ok) {
        openAlertDialog('提示', msg || '智能扫描失败，请稍后重试。')
        return
      }
      const scannedDeviceList = Array.isArray(data?.device) ? data.device : []
      scannedHeatPumpCount = data?.heatPump
      scannedIds = scannedDeviceList
        .map((item) => parsePumpId(item?.code))
        .filter((id) => id != null)
    } catch (error) {
      openAlertDialog('提示', error?.message || '智能扫描失败，请稍后重试。')
      return
    } finally {
      setIsOperating(false)
    }

    const targetCount = Number.isInteger(rawTargetCount) ? Math.max(0, Math.min(rawTargetCount, UNIT_TOTAL)) : UNIT_TOTAL
    const availableIds = Array.from(new Set(scannedIds))
      .filter((id) => UNIT_PUMP_ID_SET.has(id))
      .slice(0, targetCount)

    const currentAddedIds = unitSlots.filter((id) => id != null && UNIT_PUMP_ID_SET.has(id))
    const currentPendingIds = pendingUnitIds.filter((id) => UNIT_PUMP_ID_SET.has(id))
    const currentAllIds = [...new Set([...currentAddedIds, ...currentPendingIds])]

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

    // 智能扫描仅采用后端返回设备，移除任何不在扫描列表中的本地占位数据。
    const scannedSet = new Set(availableIds)
    nextPendingIds = nextPendingIds.filter((id) => scannedSet.has(id))
    nextSlots = nextSlots.map((id) => (id != null && scannedSet.has(id) ? id : null))

    const finalPendingIds = Array.from(new Set(nextPendingIds)).sort((a, b) => a - b)
    if (scannedHeatPumpCount != null) {
      setDetectedHeatPumpCount(scannedHeatPumpCount)
    }

    setPendingUnitIds(finalPendingIds)
    setUnitSlots(nextSlots)
    setUnitLayoutLocked(false)
    setUnitNumberingDone(false)
    setUnitNumberingMap({})
    setShowOriginalNo(false)
    setManualDraggingPumpId(null)
    setManualDraggingSource(null)
    draggingPumpIdRef.current = null
    setHasUnitLayoutReset(true)
  }

  const clearPendingLongPressTimer = () => {
    if (pendingLongPressTimerRef.current) {
      clearTimeout(pendingLongPressTimerRef.current)
      pendingLongPressTimerRef.current = null
    }
  }

  const startManualDrag = (pumpId, source, event) => {
    if (arrangeViewOnly) {
      return
    }
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
      const targetElement = event?.currentTarget
      if (targetElement instanceof HTMLElement) {
        const rect = targetElement.getBoundingClientRect()
        dragPreviewOffsetRef.current = {
          x: pointer.clientX - rect.left,
          y: pointer.clientY - rect.top,
        }
      } else {
        dragPreviewOffsetRef.current = { x: 52, y: 50 }
      }
      setManualDragPointer({
        x: pointer.clientX - dragPreviewOffsetRef.current.x,
        y: pointer.clientY - dragPreviewOffsetRef.current.y,
      })
      dragStartPointRef.current = { x: pointer.clientX, y: pointer.clientY }
    }
    didManualDragMoveRef.current = false

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

  const movePumpToSlot = useCallback(
    (pumpId, targetIndex) => {
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
    },
    [unitLayoutLocked],
  )

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
    if (arrangeViewOnly) {
      return
    }
    if (!unitLayoutLocked || unitNumberingDone || unitNumberingMap[pumpId]) {
      return
    }

    setUnitNumberingMap((previous) => ({
      ...previous,
      [pumpId]: Object.keys(previous).length + 1,
    }))
  }

  const handleCompleteNumbering = async () => {
    if (!canFinishNumbering) {
      return
    }
    if (isOperating) {
      return
    }

    const deviceArrange = []
    unitSlots.forEach((pumpId, index) => {
      if (!pumpId) {
        return
      }
      const rowNumber = Math.floor(index / UNIT_LAYOUT_COLS) + 1
      const columnNumber = (index % UNIT_LAYOUT_COLS) + 1
      const arrangeCode = unitNumberingMap[pumpId]
      deviceArrange.push({
        id: String(index + 1),
        projectId: projectId || '',
        deviceId: toDeviceCode(pumpId),
        arrangeState: '1',
        codeState: '1',
        rowNumber: String(rowNumber),
        columnNumber: String(columnNumber),
        arrangeCode: String(arrangeCode ?? ''),
      })
    })

    setIsOperating(true)
    try {
      const response = await saveDeviceArrange(deviceArrange)
      const { ok, msg } = parseAlgorithmProcessPayload(response)
      if (!ok) {
        openAlertDialog('提示', msg || '保存机组排布失败，请稍后重试。')
        return
      }
      setUnitNumberingDone(true)
      onUnitLayoutCommitted?.([...unitSlots])
    } catch (error) {
      openAlertDialog('提示', error?.message || '保存机组排布失败，请稍后重试。')
    } finally {
      setIsOperating(false)
    }
  }

  const scrollPendingList = (direction) => {
    const listElement = pendingListRef.current
    if (!listElement) {
      return
    }
    const offset = direction === 'left' ? -360 : 360
    listElement.scrollBy({ left: offset, behavior: 'smooth' })
  }

  const isStep1Done = totalHeatPumpCount > 0 ? addedUnitIds.length >= totalHeatPumpCount : false
  const isStep1Active = !isStep1Done
  const isStep2Active = isStep1Done && !unitLayoutLocked
  const isStep2Done = unitLayoutLocked
  const isStep3Active = unitLayoutLocked && !unitNumberingDone
  const isStep3Done = unitNumberingDone
  const pendingListPoolSize = totalHeatPumpCount > 0 ? totalHeatPumpCount : UNIT_TOTAL
  const pendingDisplayIds =
    pendingUnitIds.length > 0
      ? [...pendingUnitIds, ...Array.from({ length: Math.max(0, pendingListPoolSize - pendingUnitIds.length) }, () => null)]
      : Array.from({ length: pendingListPoolSize }, () => null)

  const rootClass = [
    'system-params-detail',
    'system-layout-detail',
    variant === 'guide' ? 'guide-unit-layout' : '',
    arrangeViewOnly ? 'guide-unit-layout--arrange-view-only' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClass}>
      {variant === 'settings' ? settingsHeader : null}

      <div className="unit-layout-wrap">
        <div className="unit-layout-main">
          <div className="unit-layout-pending-header">
            <strong>待添加（{pendingUnitIds.length}）</strong>
            <span>操作提示：单击可选中，长按可启动风扇热点。可拖动到下方区域进行布置。</span>
          </div>
          <div className={`unit-layout-pending-scroller${pendingUnitIds.length === 0 ? ' is-empty' : ''}${arrangeViewOnly ? ' is-arrange-view-only' : ''}`}>
            <button
              type="button"
              className="unit-layout-pending-arrow unit-layout-pending-arrow--left"
              onClick={() => scrollPendingList('left')}
              disabled={arrangeViewOnly}
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
                  disabled={arrangeViewOnly || !id}
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
              disabled={arrangeViewOnly}
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

          <div className={`unit-layout-grid-body${manualDraggingPumpId ? ' is-dragging' : ''}${arrangeViewOnly ? ' is-arrange-view-only' : ''}`}>
            <div className="unit-layout-row-labels">
              {Array.from({ length: UNIT_LAYOUT_ROWS }, (_, index) => (
                <span key={`row-${index + 1}`} className="unit-layout-row-label">
                  {index + 1}
                </span>
              ))}
            </div>

            <div className="unit-layout-grid">
              {unitSlots.map((pumpId, index) => {
                const displayLabel = pumpId
                  ? showOriginalNo
                    ? toNoLabel(pumpId)
                    : unitLayoutLocked
                      ? unitNumberingMap[pumpId] ?? toNoLabel(pumpId)
                      : toNoLabel(pumpId)
                  : ''

                return (
                  <button
                    key={`slot-${index}`}
                    type="button"
                    data-slot-index={index}
                    className={`unit-layout-slot${pumpId ? ' has-pump' : ''}${unitLayoutLocked && !unitNumberingDone ? ' is-numbering' : ''}${arrangeViewOnly ? ' is-arrange-view-only' : ''}`}
                    draggable={false}
                    onMouseDown={(event) => {
                      if (arrangeViewOnly) {
                        return
                      }
                      if (!unitLayoutLocked && pumpId) {
                        startManualDrag(pumpId, 'slot', event)
                      }
                    }}
                    onTouchStart={(event) => {
                      if (arrangeViewOnly) {
                        return
                      }
                      if (!unitLayoutLocked && pumpId) {
                        startManualDrag(pumpId, 'slot', event)
                      }
                    }}
                    onClick={() => {
                      if (arrangeViewOnly) {
                        return
                      }
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
            <button type="button" className="unit-layout-flow__reset" onClick={resetUnitLayout} disabled={!canReset}>
              复位
            </button>
          </div>

          <div className="unit-layout-flow__step-item">
            <div className={`unit-layout-flow__step-indicator${isStep1Active ? ' is-active' : ''}${isStep1Done ? ' is-done' : ''}`}>
              <span>01</span>
              <img src={longArrowDownBlueIcon} alt="" aria-hidden="true" />
            </div>
            <div className="unit-layout-flow__step">
              <div className="unit-layout-flow__title">
                添加热泵{addedUnitIds.length}/{totalHeatPumpCount}
              </div>
              <small>读取处于激活状态的热泵</small>
              <button
                type="button"
                className={`unit-layout-flow__smart-scan${canSmartScan ? ' is-active' : ''}`}
                onClick={handleSmartScan}
                disabled={!smartScanEnabled || !canSmartScan}
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
                className={`unit-layout-flow__complete-layout${canClickCompleteLayout ? ' is-active' : ''}`}
                onClick={handleCompleteLayout}
                disabled={!canClickCompleteLayout}
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
                className={canRenumber ? 'is-active' : ''}
                disabled={!canRenumber}
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
                <button
                  type="button"
                  className={canClickCompleteNumbering ? 'is-active' : ''}
                  onClick={handleCompleteNumbering}
                  disabled={!canClickCompleteNumbering}
                >
                  编号完成
                </button>
                <button type="button" className="unit-layout-flow__eye" disabled={!canToggleOriginalNo} onClick={() => setShowOriginalNo((prev) => !prev)}>
                  {showOriginalNo ? <img src={hideIcon} alt="" aria-hidden="true" /> : <img src={showIcon} alt="" aria-hidden="true" />}
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {manualDraggingPumpId && typeof document !== 'undefined'
        ? createPortal(
            <div className={`unit-layout-drag-preview${longPressedPendingIds[manualDraggingPumpId] ? ' is-long-press' : ''}`} style={{ left: manualDragPointer.x, top: manualDragPointer.y }}>
              <span>{toNoLabel(manualDraggingPumpId)}</span>
              <img src={longPressedPendingIds[manualDraggingPumpId] ? hpRunningIcon : hpNullIcon} alt="" aria-hidden="true" />
            </div>,
            document.body,
          )
        : null}

      <AttentionModal
        isOpen={alertDialog.open}
        title={alertDialog.title || '提示'}
        message={alertDialog.message}
        confirmText="我知道了"
        showCancel={false}
        onClose={closeAlertDialog}
        onConfirm={closeAlertDialog}
      />
    </div>
  )
})

export default SystemParamsUnitLayout
