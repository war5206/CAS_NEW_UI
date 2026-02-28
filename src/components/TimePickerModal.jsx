import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './TimePickerModal.css'

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

function resolveInitialIndices(sanitizedColumns, value) {
  return sanitizedColumns.map((column, columnIndex) => {
    const sourceValue = Array.isArray(value) ? value[columnIndex] : undefined
    const matchedIndex = column.options.findIndex((option) => option === sourceValue)
    return matchedIndex >= 0 ? matchedIndex : 0
  })
}

function TimePickerModal({
  isOpen = false,
  title = '时间选择器',
  columns = [],
  value = [],
  cancelText = '取消',
  confirmText = '确定',
  onClose,
  onConfirm,
}) {
  const sanitizedColumns = useMemo(() => sanitizeColumns(columns), [columns])
  const [draftIndices, setDraftIndices] = useState([])
  const columnRefs = useRef([])
  const scrollRafRefs = useRef({})
  const scrollIdleTimerRefs = useRef({})
  const dragStateRef = useRef({
    active: false,
    columnIndex: -1,
    pointerId: null,
    startY: 0,
    startScrollTop: 0,
    moved: false,
  })
  const suppressNextClickRef = useRef(false)

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
      const column = sanitizedColumns[columnIndex]
      if (!columnElement || !column || column.options.length <= 0) {
        return
      }
      const nextIndex = clampIndex(optionIndex, column.options.length)
      const rowHeight = getRowHeight(columnElement)
      columnElement.scrollTo({
        top: nextIndex * rowHeight,
        behavior,
      })
    },
    [getRowHeight, sanitizedColumns],
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }
    const nextIndices = resolveInitialIndices(sanitizedColumns, value)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftIndices(nextIndices)
    requestAnimationFrame(() => {
      nextIndices.forEach((index, columnIndex) => {
        scrollToIndex(columnIndex, index)
      })
    })
  }, [isOpen, sanitizedColumns, scrollToIndex, value])

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
    const column = sanitizedColumns[columnIndex]
    if (!columnElement || !column || column.options.length <= 0) {
      return
    }

    const existingFrame = scrollRafRefs.current[columnIndex]
    if (existingFrame) {
      cancelAnimationFrame(existingFrame)
    }

    scrollRafRefs.current[columnIndex] = requestAnimationFrame(() => {
      const rowHeight = getRowHeight(columnElement)
      const roughIndex = Math.round(columnElement.scrollTop / rowHeight)
      const nextIndex = clampIndex(roughIndex, column.options.length)
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
    const nextValue = sanitizedColumns.map((column, columnIndex) => {
      const fallbackIndex = 0
      const rawIndex = Number.isInteger(draftIndices[columnIndex]) ? draftIndices[columnIndex] : fallbackIndex
      const optionIndex = clampIndex(rawIndex, column.options.length)
      return column.options[optionIndex]
    })
    onConfirm?.(nextValue)
  }

  if (!isOpen || sanitizedColumns.length <= 0) {
    return null
  }

  return (
    <div className="time-picker-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="time-picker-modal"
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
            {sanitizedColumns.map((column, columnIndex) => {
              const selectedIndex = clampIndex(draftIndices[columnIndex] ?? 0, column.options.length)

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
                  {column.options.map((optionValue, optionIndex) => {
                    const isSelected = optionIndex === selectedIndex
                    const itemClassName = [
                      'time-picker-modal__option',
                      isSelected ? 'is-selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')

                    return (
                      <button
                        key={`${column.key}-${optionIndex}`}
                        type="button"
                        className={itemClassName}
                        onClick={() => handleOptionSelect(columnIndex, optionIndex)}
                        data-option-index={optionIndex}
                      >
                        {column.formatter(optionValue, optionIndex)}
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
  )
}

export default TimePickerModal
