import { useEffect, useRef, useState } from 'react'
import './SelectDropdown.css'

function joinClassNames(...names) {
  return names.filter(Boolean).join(' ')
}

const INITIAL_DRAG_STATE = {
  active: false,
  pointerId: null,
  startY: 0,
  startTop: 0,
  moved: false,
}

function SelectDropdown({
  options = [],
  value,
  onChange,
  triggerAriaLabel = 'Select option',
  listAriaLabel = 'Options list',
  className = '',
  triggerClassName = '',
  dropdownClassName = '',
  optionClassName = '',
  selectedOptionClassName = 'is-selected',
  showSelectedCheck = false,
  selectedCheckIcon = '',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const menuRef = useRef(null)
  const dragStateRef = useRef(INITIAL_DRAG_STATE)
  const blockNextOptionClickRef = useRef(false)
  const selectedOption = options.find((item) => item.value === value) ?? options[0]

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handlePointerDownOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDownOutside)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (disabled) {
      setIsOpen(false)
    }
  }, [disabled])

  useEffect(() => {
    if (isOpen) {
      return undefined
    }

    dragStateRef.current = INITIAL_DRAG_STATE
    blockNextOptionClickRef.current = false
    menuRef.current?.classList.remove('is-dragging')
    return undefined
  }, [isOpen])

  const handleMenuPointerDown = (event) => {
    if (event.button !== 0 || event.pointerType !== 'mouse' || !menuRef.current) {
      return
    }

    dragStateRef.current = {
      active: true,
      pointerId: event.pointerId,
      startY: event.clientY,
      startTop: menuRef.current.scrollTop,
      moved: false,
    }
    blockNextOptionClickRef.current = false
    menuRef.current.setPointerCapture?.(event.pointerId)
  }

  const handleMenuPointerMove = (event) => {
    const dragState = dragStateRef.current
    if (!dragState.active || dragState.pointerId !== event.pointerId || !menuRef.current) {
      return
    }

    const deltaY = event.clientY - dragState.startY
    if (!dragState.moved && Math.abs(deltaY) >= 4) {
      dragState.moved = true
      menuRef.current.classList.add('is-dragging')
    }

    if (dragState.moved) {
      blockNextOptionClickRef.current = true
      event.preventDefault()
    }

    menuRef.current.scrollTop = dragState.startTop - deltaY
  }

  const clearMenuDraggingState = (event) => {
    const dragState = dragStateRef.current
    if (!dragState.active || dragState.pointerId !== event.pointerId) {
      return
    }

    if (menuRef.current?.hasPointerCapture?.(event.pointerId)) {
      menuRef.current.releasePointerCapture(event.pointerId)
    }

    if (dragState.moved) {
      window.setTimeout(() => {
        blockNextOptionClickRef.current = false
      }, 0)
    }

    menuRef.current?.classList.remove('is-dragging')
    dragStateRef.current = INITIAL_DRAG_STATE
  }

  return (
    <div className={joinClassNames('select-dropdown', className)} ref={containerRef}>
      <button
        type="button"
        className={joinClassNames('select-dropdown__trigger', triggerClassName, isOpen ? 'is-open' : '')}
        aria-label={triggerAriaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
      >
        <span>{selectedOption?.label ?? ''}</span>
      </button>

      <div
        ref={menuRef}
        className={joinClassNames('select-dropdown__menu', dropdownClassName, isOpen ? 'is-open' : '')}
        role="listbox"
        aria-label={listAriaLabel}
        aria-hidden={!isOpen}
        onWheelCapture={(event) => event.stopPropagation()}
        onPointerDown={handleMenuPointerDown}
        onPointerMove={handleMenuPointerMove}
        onPointerUp={clearMenuDraggingState}
        onPointerCancel={clearMenuDraggingState}
      >
        {options.map((item) => {
          const isSelected = item.value === selectedOption?.value
          return (
            <button
              key={item.value}
              type="button"
              role="option"
              aria-selected={isSelected}
              className={joinClassNames('select-dropdown__option', optionClassName, isSelected ? selectedOptionClassName : '')}
              onClick={(event) => {
                if (blockNextOptionClickRef.current) {
                  event.preventDefault()
                  return
                }

                onChange?.(item.value)
                setIsOpen(false)
              }}
            >
              <span>{item.label}</span>
              {isSelected && showSelectedCheck && selectedCheckIcon ? (
                <span className="select-dropdown__option-check" aria-hidden="true">
                  <img src={selectedCheckIcon} alt="" />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default SelectDropdown
