import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useActionConfirm } from '../hooks/useActionConfirm'
import './TimePickerModal.css'

const TEMPORAL_KEYS = new Set(['year', 'month', 'day', 'hour', 'minute', 'second'])
const DEFAULT_YEAR_WINDOW_SIZE = 201
const DEFAULT_YEAR_WINDOW_HALF = Math.floor(DEFAULT_YEAR_WINDOW_SIZE / 2)
const DEFAULT_YEAR_WINDOW_EDGE = 40
const TEMPORAL_REPEAT_COUNT = 5
const TEMPORAL_MIDDLE_REPEAT_INDEX = Math.floor(TEMPORAL_REPEAT_COUNT / 2)

function sanitizeColumns(columns) {
  if (!Array.isArray(columns)) {
    return []
  }

  return columns
    .map((column, index) => {
      const options = Array.isArray(column?.options) ? column.options : []

      return {
        key: column?.key ?? `column-${index}`,
        options,
        formatter:
          typeof column?.formatter === 'function'
            ? column.formatter
            : (value) => {
                if (value == null) {
                  return ''
                }
                return String(value)
              },
      }
    })
    .filter((column) => column.options.length > 0)
}

function clampIndex(index, length) {
  if (length <= 0) {
    return 0
  }
  if (index <= 0) {
    return 0
  }
  if (index >= length - 1) {
    return length - 1
  }
  return index
}

function modulo(value, divisor) {
  if (divisor <= 0) {
    return 0
  }
  return ((value % divisor) + divisor) % divisor
}

function isTemporalColumnKey(key) {
  return TEMPORAL_KEYS.has(key)
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function getTemporalValueFromDate(date, key) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null
  }

  if (key === 'year') {
    return date.getFullYear()
  }
  if (key === 'month') {
    return date.getMonth() + 1
  }
  if (key === 'day') {
    return date.getDate()
  }
  if (key === 'hour') {
    return date.getHours()
  }
  if (key === 'minute') {
    return date.getMinutes()
  }
  if (key === 'second') {
    return date.getSeconds()
  }
  return null
}

function applyTemporalAbsoluteValue(date, key, nextValue) {
  const nextDate = new Date(date.getTime())
  const numericValue = Number(nextValue)
  if (!Number.isFinite(numericValue)) {
    return nextDate
  }

  if (key === 'year') {
    const month = nextDate.getMonth() + 1
    const day = nextDate.getDate()
    nextDate.setDate(1)
    nextDate.setFullYear(Math.trunc(numericValue))
    nextDate.setDate(Math.min(day, getDaysInMonth(nextDate.getFullYear(), month)))
    return nextDate
  }

  if (key === 'month') {
    const year = nextDate.getFullYear()
    const day = nextDate.getDate()
    nextDate.setDate(1)
    nextDate.setMonth(Math.trunc(numericValue) - 1)
    nextDate.setDate(Math.min(day, getDaysInMonth(year, Math.trunc(numericValue))))
    return nextDate
  }

  if (key === 'day') {
    nextDate.setDate(Math.trunc(numericValue))
    return nextDate
  }

  if (key === 'hour') {
    nextDate.setHours(Math.trunc(numericValue))
    return nextDate
  }

  if (key === 'minute') {
    nextDate.setMinutes(Math.trunc(numericValue))
    return nextDate
  }

  if (key === 'second') {
    nextDate.setSeconds(Math.trunc(numericValue))
    return nextDate
  }

  return nextDate
}

function applyTemporalDelta(date, key, delta) {
  const nextDate = new Date(date.getTime())
  if (!Number.isFinite(delta) || delta === 0) {
    return nextDate
  }

  if (key === 'year') {
    const day = nextDate.getDate()
    nextDate.setDate(1)
    nextDate.setFullYear(nextDate.getFullYear() + delta)
    nextDate.setDate(Math.min(day, getDaysInMonth(nextDate.getFullYear(), nextDate.getMonth() + 1)))
    return nextDate
  }
  if (key === 'month') {
    const day = nextDate.getDate()
    nextDate.setDate(1)
    nextDate.setMonth(nextDate.getMonth() + delta)
    nextDate.setDate(Math.min(day, getDaysInMonth(nextDate.getFullYear(), nextDate.getMonth() + 1)))
    return nextDate
  }
  if (key === 'day') {
    nextDate.setDate(nextDate.getDate() + delta)
    return nextDate
  }
  if (key === 'hour') {
    const next = modulo(nextDate.getHours() + delta, 24)
    nextDate.setHours(next)
    return nextDate
  }
  if (key === 'minute') {
    const next = modulo(nextDate.getMinutes() + delta, 60)
    nextDate.setMinutes(next)
    return nextDate
  }
  if (key === 'second') {
    const next = modulo(nextDate.getSeconds() + delta, 60)
    nextDate.setSeconds(next)
    return nextDate
  }
  return nextDate
}

function buildTemporalDate(columns, value) {
  const now = new Date()
  now.setMilliseconds(0)
  const source = Array.isArray(value) ? value : []
  const valueByKey = {}
  columns.forEach((column, index) => {
    valueByKey[column.key] = source[index]
  })

  const year = Number.isFinite(Number(valueByKey.year)) ? Number(valueByKey.year) : now.getFullYear()
  const month = Number.isFinite(Number(valueByKey.month)) ? Number(valueByKey.month) : now.getMonth() + 1
  const day = Number.isFinite(Number(valueByKey.day)) ? Number(valueByKey.day) : now.getDate()
  const hour = Number.isFinite(Number(valueByKey.hour)) ? Number(valueByKey.hour) : now.getHours()
  const minute = Number.isFinite(Number(valueByKey.minute)) ? Number(valueByKey.minute) : now.getMinutes()
  const second = Number.isFinite(Number(valueByKey.second)) ? Number(valueByKey.second) : now.getSeconds()

  const normalized = new Date(now.getTime())
  normalized.setDate(1)
  normalized.setFullYear(Math.trunc(year))
  normalized.setMonth(Math.trunc(month) - 1)
  normalized.setDate(Math.min(Math.trunc(day), getDaysInMonth(normalized.getFullYear(), normalized.getMonth() + 1)))
  normalized.setHours(Math.trunc(hour))
  normalized.setMinutes(Math.trunc(minute))
  normalized.setSeconds(Math.trunc(second))
  normalized.setMilliseconds(0)
  return normalized
}

function buildYearOptions(anchorYear) {
  return Array.from({ length: DEFAULT_YEAR_WINDOW_SIZE }, (_, index) => anchorYear - DEFAULT_YEAR_WINDOW_HALF + index)
}

function resolveInitialIndices(sanitizedColumns, value) {
  return sanitizedColumns.map((column, columnIndex) => {
    const sourceValue = Array.isArray(value) ? value[columnIndex] : undefined
    const matchedIndex = column.options.findIndex((option) => option === sourceValue)
    return matchedIndex >= 0 ? matchedIndex : 0
  })
}

function resolveNestedConfirmConfig(config, modalZIndex) {
  if (!config) {
    return config
  }

  const elevatedZIndex = Number.isFinite(modalZIndex) ? modalZIndex + 20 : 520

  if (typeof config === 'string') {
    return {
      message: config,
      showBackdrop: false,
      zIndex: elevatedZIndex,
    }
  }

  return {
    ...config,
    showBackdrop: config.showBackdrop ?? false,
    zIndex: config.zIndex ?? elevatedZIndex,
  }
}

function TimePickerModal({
  isOpen = false,
  title = '时间选择器',
  columns = [],
  value = [],
  cancelText = '取消',
  confirmText = '确定',
  showBackdrop = true,
  zIndex,
  className = '',
  onClose,
  onConfirm,
  confirmConfig,
}) {
  const { requestConfirm, confirmModal } = useActionConfirm()
  const sanitizedColumns = useMemo(() => sanitizeColumns(columns), [columns])
  const isTemporalContinuousMode = useMemo(
    () => sanitizedColumns.length > 0 && sanitizedColumns.every((column) => isTemporalColumnKey(column.key)),
    [sanitizedColumns],
  )
  const [draftIndices, setDraftIndices] = useState([])
  const [draftDate, setDraftDate] = useState(null)
  const [yearAnchorValues, setYearAnchorValues] = useState([])
  const columnRefs = useRef([])
  const scrollRafRefs = useRef({})
  const scrollIdleTimerRefs = useRef({})
  const scrollIndexRefs = useRef({})
  const programmaticScrollTopRefs = useRef({})
  const draftDateRef = useRef(null)
  const hasInitializedForOpenRef = useRef(false)
  const dragStateRef = useRef({
    active: false,
    columnIndex: -1,
    pointerId: null,
    startY: 0,
    startScrollTop: 0,
    moved: false,
  })
  const suppressNextClickRef = useRef(false)

  const resolvedColumns = useMemo(() => {
    if (!isTemporalContinuousMode) {
      return sanitizedColumns.map((column) => ({
        ...column,
        resolvedOptions: column.options,
      }))
    }

    return sanitizedColumns.map((column, columnIndex) => {
      if (column.key === 'year') {
        const currentYear = getTemporalValueFromDate(draftDate, 'year')
        const anchorYear = Number.isInteger(yearAnchorValues[columnIndex])
          ? yearAnchorValues[columnIndex]
          : Number.isInteger(currentYear)
            ? currentYear
            : new Date().getFullYear()
        return {
          ...column,
          resolvedOptions: buildYearOptions(anchorYear),
        }
      }

      if (column.key === 'month') {
        return {
          ...column,
          resolvedOptions: Array.from({ length: 12 }, (_, index) => index + 1),
        }
      }

      if (column.key === 'day') {
        const year = getTemporalValueFromDate(draftDate, 'year') ?? new Date().getFullYear()
        const month = getTemporalValueFromDate(draftDate, 'month') ?? new Date().getMonth() + 1
        const dayCount = getDaysInMonth(year, month)
        return {
          ...column,
          resolvedOptions: Array.from({ length: dayCount }, (_, index) => index + 1),
        }
      }

      if (column.key === 'hour') {
        return {
          ...column,
          resolvedOptions: Array.from({ length: 24 }, (_, index) => index),
        }
      }

      if (column.key === 'minute' || column.key === 'second') {
        return {
          ...column,
          resolvedOptions: Array.from({ length: 60 }, (_, index) => index),
        }
      }

      return {
        ...column,
        resolvedOptions: column.options,
      }
    })
  }, [draftDate, isTemporalContinuousMode, sanitizedColumns, yearAnchorValues])

  const getRowHeight = useCallback((columnElement) => {
    if (!columnElement) {
      return 76
    }
    const rawHeight = getComputedStyle(columnElement).getPropertyValue('--picker-row-height')
    const parsedHeight = Number.parseFloat(rawHeight)
    return Number.isFinite(parsedHeight) && parsedHeight > 0 ? parsedHeight : 76
  }, [])

  const scrollToIndex = useCallback(
    (columnIndex, optionIndex, behavior = 'auto') => {
      const columnElement = columnRefs.current[columnIndex]
      const column = resolvedColumns[columnIndex]
      if (!columnElement || !column || column.resolvedOptions.length <= 0) {
        return
      }
      const nextIndex = clampIndex(optionIndex, column.resolvedOptions.length)
      const rowHeight = getRowHeight(columnElement)
      programmaticScrollTopRefs.current[columnIndex] = nextIndex * rowHeight
      scrollIndexRefs.current[columnIndex] = nextIndex
      columnElement.scrollTo({
        top: nextIndex * rowHeight,
        behavior,
      })
    },
    [getRowHeight, resolvedColumns],
  )

  const scrollToTemporalValue = useCallback(
    (columnIndex, behavior = 'auto') => {
      const columnElement = columnRefs.current[columnIndex]
      const column = resolvedColumns[columnIndex]
      if (!columnElement || !column || column.resolvedOptions.length <= 0) {
        return
      }

      const rowHeight = getRowHeight(columnElement)
      const optionsLength = column.resolvedOptions.length
      const currentValue = getTemporalValueFromDate(draftDateRef.current, column.key)
      const valueIndex = column.resolvedOptions.findIndex((option) => option === currentValue)
      const safeValueIndex = valueIndex >= 0 ? valueIndex : 0
      let targetIndex = safeValueIndex

      if (column.key !== 'year') {
        const previousIndex = scrollIndexRefs.current[columnIndex]
        if (Number.isFinite(previousIndex)) {
          const cyclesFromZero = Math.round((previousIndex - safeValueIndex) / optionsLength)
          targetIndex = cyclesFromZero * optionsLength + safeValueIndex
          const minTarget = optionsLength
          const maxTarget = optionsLength * (TEMPORAL_REPEAT_COUNT - 1) - 1
          if (targetIndex < minTarget || targetIndex > maxTarget) {
            targetIndex = safeValueIndex + optionsLength * TEMPORAL_MIDDLE_REPEAT_INDEX
          }
        } else {
          targetIndex = safeValueIndex + optionsLength * TEMPORAL_MIDDLE_REPEAT_INDEX
        }
      }

      const targetTop = targetIndex * rowHeight
      scrollIndexRefs.current[columnIndex] = targetIndex
      if (Math.abs(columnElement.scrollTop - targetTop) <= 1) {
        return
      }
      programmaticScrollTopRefs.current[columnIndex] = targetTop
      columnElement.scrollTo({
        top: targetTop,
        behavior,
      })
    },
    [getRowHeight, resolvedColumns],
  )

  useEffect(() => {
    if (!isOpen) {
      hasInitializedForOpenRef.current = false
      return
    }

    if (hasInitializedForOpenRef.current) {
      return
    }
    hasInitializedForOpenRef.current = true

    if (isTemporalContinuousMode) {
      const initialDate = buildTemporalDate(sanitizedColumns, value)
      draftDateRef.current = initialDate
      requestAnimationFrame(() => {
        setDraftDate(initialDate)
        setYearAnchorValues(
          sanitizedColumns.map((column) => (column.key === 'year' ? getTemporalValueFromDate(initialDate, 'year') : null)),
        )
        sanitizedColumns.forEach((column, columnIndex) => {
          if (!isTemporalColumnKey(column.key)) {
            return
          }
          scrollToTemporalValue(columnIndex)
        })
      })
      return
    }

    const nextIndices = resolveInitialIndices(sanitizedColumns, value)
    requestAnimationFrame(() => {
      setDraftIndices(nextIndices)
      nextIndices.forEach((index, columnIndex) => {
        scrollToIndex(columnIndex, index)
      })
    })
  }, [isOpen, isTemporalContinuousMode, sanitizedColumns, scrollToIndex, scrollToTemporalValue, value])

  useLayoutEffect(() => {
    if (!isOpen) return
    if (!isTemporalContinuousMode) return
    if (!hasInitializedForOpenRef.current) return
    if (!(draftDate instanceof Date)) return

    const dragState = dragStateRef.current
    const activeDragColumn = dragState.active ? dragState.columnIndex : -1

    resolvedColumns.forEach((column, columnIndex) => {
      if (!column) return
      if (columnIndex === activeDragColumn) return
      scrollToTemporalValue(columnIndex)
    })
  }, [draftDate, yearAnchorValues, isOpen, isTemporalContinuousMode, resolvedColumns, scrollToTemporalValue])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  useEffect(
    () => () => {
      Object.values(scrollRafRefs.current).forEach((frameId) => cancelAnimationFrame(frameId))
      Object.values(scrollIdleTimerRefs.current).forEach((timerId) => clearTimeout(timerId))
    },
    [],
  )

  const handleColumnScroll = (columnIndex) => {
    const columnElement = columnRefs.current[columnIndex]
    const column = resolvedColumns[columnIndex]
    if (!columnElement || !column || column.resolvedOptions.length <= 0) {
      return
    }

    if (isTemporalContinuousMode) {
      const rowHeight = getRowHeight(columnElement)
      const roughIndex = Math.round(columnElement.scrollTop / rowHeight)
      const targetTop = programmaticScrollTopRefs.current[columnIndex]
      if (Number.isFinite(targetTop)) {
        delete programmaticScrollTopRefs.current[columnIndex]
        scrollIndexRefs.current[columnIndex] = roughIndex
        return
      }

      const previousIndex = Number.isFinite(scrollIndexRefs.current[columnIndex])
        ? scrollIndexRefs.current[columnIndex]
        : roughIndex
      const delta = roughIndex - previousIndex
      scrollIndexRefs.current[columnIndex] = roughIndex

      if (delta !== 0) {
        const sourceDate =
          draftDateRef.current instanceof Date
            ? draftDateRef.current
            : buildTemporalDate(sanitizedColumns, value)
        const nextDate = applyTemporalDelta(sourceDate, column.key, delta)
        draftDateRef.current = nextDate
        setDraftDate(nextDate)

        if (column.key === 'year') {
          const optionsLength = column.resolvedOptions.length
          if (
            roughIndex < DEFAULT_YEAR_WINDOW_EDGE ||
            roughIndex > optionsLength - DEFAULT_YEAR_WINDOW_EDGE - 1
          ) {
            const nextYear = getTemporalValueFromDate(nextDate, 'year')
            setYearAnchorValues((previous) => {
              const next = [...previous]
              next[columnIndex] = nextYear
              return next
            })
          }
        }
      }

      if (column.key !== 'year') {
        const cycleLength = column.resolvedOptions.length
        const lowerThreshold = cycleLength
        const upperThreshold = cycleLength * (TEMPORAL_REPEAT_COUNT - 2)
        if (roughIndex <= lowerThreshold || roughIndex >= upperThreshold) {
          const normalizedIndex =
            modulo(roughIndex, cycleLength) + cycleLength * TEMPORAL_MIDDLE_REPEAT_INDEX
          const normalizedTop = normalizedIndex * rowHeight
          if (Math.abs(columnElement.scrollTop - normalizedTop) > 1) {
            programmaticScrollTopRefs.current[columnIndex] = normalizedTop
            scrollIndexRefs.current[columnIndex] = normalizedIndex
            const dragState = dragStateRef.current
            if (dragState.active && dragState.columnIndex === columnIndex) {
              dragState.startScrollTop += normalizedTop - columnElement.scrollTop
            }
            columnElement.scrollTop = normalizedTop
          }
        }
      }

      const existingIdleTimer = scrollIdleTimerRefs.current[columnIndex]
      if (existingIdleTimer) {
        clearTimeout(existingIdleTimer)
      }
      scrollIdleTimerRefs.current[columnIndex] = setTimeout(() => {
        scrollToTemporalValue(columnIndex)
      }, 140)
      return
    }

    const existingFrame = scrollRafRefs.current[columnIndex]
    if (existingFrame) {
      cancelAnimationFrame(existingFrame)
    }

    scrollRafRefs.current[columnIndex] = requestAnimationFrame(() => {
      const rowHeight = getRowHeight(columnElement)
      const roughIndex = Math.round(columnElement.scrollTop / rowHeight)
      const nextIndex = clampIndex(roughIndex, column.resolvedOptions.length)
      setDraftIndices((previous) => {
        const previousIndex = previous[columnIndex]
        if (previousIndex === nextIndex) {
          return previous
        }
        const next = [...previous]
        next[columnIndex] = nextIndex
        return next
      })

      const existingTimer = scrollIdleTimerRefs.current[columnIndex]
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      scrollIdleTimerRefs.current[columnIndex] = setTimeout(() => {
        const targetTop = nextIndex * rowHeight
        if (Math.abs(columnElement.scrollTop - targetTop) > 1) {
          columnElement.scrollTo({ top: targetTop, behavior: 'smooth' })
        }
      }, 100)
    })
  }

  const handleOptionSelect = (columnIndex, optionIndex) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      return
    }

    const column = resolvedColumns[columnIndex]
    if (!column || column.resolvedOptions.length <= 0) {
      return
    }

    if (isTemporalContinuousMode) {
      const resolvedOptionIndex =
        column.key === 'year'
          ? clampIndex(optionIndex, column.resolvedOptions.length)
          : modulo(optionIndex, column.resolvedOptions.length)
      const optionValue = column.resolvedOptions[resolvedOptionIndex]
      const sourceDate =
        draftDateRef.current instanceof Date
          ? draftDateRef.current
          : buildTemporalDate(sanitizedColumns, value)
      const nextDate = applyTemporalAbsoluteValue(sourceDate, column.key, optionValue)
      draftDateRef.current = nextDate
      setDraftDate(nextDate)
      if (column.key === 'year') {
        const nextYear = getTemporalValueFromDate(nextDate, 'year')
        setYearAnchorValues((previous) => {
          const next = [...previous]
          next[columnIndex] = nextYear
          return next
        })
      }
      return
    }

    setDraftIndices((previous) => {
      const next = [...previous]
      next[columnIndex] = optionIndex
      return next
    })
    scrollToIndex(columnIndex, optionIndex, 'smooth')
  }

  const handlePointerDown = (columnIndex, event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    const columnElement = columnRefs.current[columnIndex]
    if (!columnElement) {
      return
    }

    dragStateRef.current = {
      active: true,
      columnIndex,
      pointerId: event.pointerId,
      startY: event.clientY,
      startScrollTop: columnElement.scrollTop,
      moved: false,
    }

    columnElement.classList.add('is-dragging')
    columnElement.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (columnIndex, event) => {
    const state = dragStateRef.current
    if (!state.active || state.columnIndex !== columnIndex || state.pointerId !== event.pointerId) {
      return
    }

    const columnElement = columnRefs.current[columnIndex]
    if (!columnElement) {
      return
    }

    const deltaY = event.clientY - state.startY
    if (Math.abs(deltaY) > 3) {
      state.moved = true
    }

    columnElement.scrollTop = state.startScrollTop - deltaY
    event.preventDefault()
  }

  const endPointerDrag = (columnIndex, event) => {
    const state = dragStateRef.current
    if (!state.active || state.columnIndex !== columnIndex) {
      return
    }

    if (event && state.pointerId !== event.pointerId) {
      return
    }

    const columnElement = columnRefs.current[columnIndex]
    if (columnElement) {
      if (event && columnElement.hasPointerCapture(event.pointerId)) {
        columnElement.releasePointerCapture(event.pointerId)
      }
      columnElement.classList.remove('is-dragging')
    }

    if (state.moved) {
      suppressNextClickRef.current = true
    }

    dragStateRef.current = {
      active: false,
      columnIndex: -1,
      pointerId: null,
      startY: 0,
      startScrollTop: 0,
      moved: false,
    }
  }

  const handleConfirm = () => {
    if (isTemporalContinuousMode) {
      const sourceDate = draftDateRef.current instanceof Date ? draftDateRef.current : buildTemporalDate(sanitizedColumns, value)
      const nextValue = sanitizedColumns.map((column) => getTemporalValueFromDate(sourceDate, column.key))
      const rawConfirmConfig =
        typeof confirmConfig === 'function'
          ? confirmConfig({
              currentValue: value,
              nextValue,
              title,
            })
          : confirmConfig
      const resolvedConfirmConfig = resolveNestedConfirmConfig(rawConfirmConfig, zIndex)

      if (resolvedConfirmConfig) {
        requestConfirm(resolvedConfirmConfig, () => onConfirm?.(nextValue))
        return
      }

      onConfirm?.(nextValue)
      return
    }

    const nextValue = sanitizedColumns.map((column, columnIndex) => {
      const fallbackIndex = 0
      const rawIndex = Number.isInteger(draftIndices[columnIndex]) ? draftIndices[columnIndex] : fallbackIndex
      const optionIndex = clampIndex(rawIndex, column.options.length)
      return column.options[optionIndex]
    })
    const rawConfirmConfig =
      typeof confirmConfig === 'function'
        ? confirmConfig({
            currentValue: value,
            nextValue,
            title,
          })
        : confirmConfig
    const resolvedConfirmConfig = resolveNestedConfirmConfig(rawConfirmConfig, zIndex)

    if (resolvedConfirmConfig) {
      requestConfirm(resolvedConfirmConfig, () => onConfirm?.(nextValue))
      return
    }

    onConfirm?.(nextValue)
  }

  if (!isOpen || sanitizedColumns.length <= 0) {
    return null
  }

  const backdropClassName = ['time-picker-modal-backdrop', showBackdrop ? '' : 'is-transparent']
    .filter(Boolean)
    .join(' ')
  const backdropStyle = Number.isFinite(zIndex) ? { zIndex } : undefined

  const modalClassName = ['time-picker-modal', className].filter(Boolean).join(' ')

  return (
    <>
      <div className={backdropClassName} style={backdropStyle} role="presentation" onClick={onClose}>
        <section
          className={modalClassName}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="time-picker-modal__header">
            <h3 className="time-picker-modal__title">{title}</h3>
          </header>

          <div className="time-picker-modal__body">
            <div className="time-picker-modal__highlight" aria-hidden="true" />
            <div
              className="time-picker-modal__columns"
              data-columns={sanitizedColumns.length}
              style={{ gridTemplateColumns: `repeat(${sanitizedColumns.length}, minmax(0, 1fr))` }}
            >
              {resolvedColumns.map((column, columnIndex) => {
                const isTemporalCyclicColumn = isTemporalContinuousMode && column.key !== 'year'
                const renderOptions = isTemporalCyclicColumn
                  ? Array.from({ length: column.resolvedOptions.length * TEMPORAL_REPEAT_COUNT }, (_, index) => ({
                      value: column.resolvedOptions[modulo(index, column.resolvedOptions.length)],
                      renderIndex: index,
                    }))
                  : column.resolvedOptions.map((optionValue, optionIndex) => ({
                      value: optionValue,
                      renderIndex: optionIndex,
                    }))
                const selectedIndex = clampIndex(draftIndices[columnIndex] ?? 0, column.resolvedOptions.length)
                const selectedTemporalValue = isTemporalContinuousMode ? getTemporalValueFromDate(draftDate, column.key) : null

                return (
                  <div
                    key={column.key}
                    className="time-picker-modal__column"
                    ref={(element) => {
                      columnRefs.current[columnIndex] = element
                    }}
                    onScroll={() => handleColumnScroll(columnIndex)}
                    onPointerDown={(event) => handlePointerDown(columnIndex, event)}
                    onPointerMove={(event) => handlePointerMove(columnIndex, event)}
                    onPointerUp={(event) => endPointerDrag(columnIndex, event)}
                    onPointerCancel={(event) => endPointerDrag(columnIndex, event)}
                    onLostPointerCapture={() => endPointerDrag(columnIndex)}
                  >
                    {renderOptions.map(({ value: optionValue, renderIndex }, optionIndex) => {
                      const isSelected = isTemporalContinuousMode
                        ? optionValue === selectedTemporalValue
                        : optionIndex === selectedIndex
                      const itemClassName = ['time-picker-modal__option', isSelected ? 'is-selected' : '']
                        .filter(Boolean)
                        .join(' ')

                      return (
                        <button
                          key={`${column.key}-${renderIndex}-${optionIndex}`}
                          type="button"
                          className={itemClassName}
                          onClick={() => handleOptionSelect(columnIndex, renderIndex)}
                          data-option-index={renderIndex}
                        >
                          {column.formatter(optionValue, renderIndex)}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="time-picker-modal__actions">
            <button type="button" className="time-picker-modal__action is-cancel" onClick={onClose}>
              {cancelText}
            </button>
            <button type="button" className="time-picker-modal__action is-confirm" onClick={handleConfirm}>
              {confirmText}
            </button>
          </div>
        </section>
      </div>
      {confirmModal}
    </>
  )
}

export default TimePickerModal
