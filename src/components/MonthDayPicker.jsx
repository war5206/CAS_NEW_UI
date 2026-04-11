import { useMemo, useState } from 'react'
import TimePickerModal from './TimePickerModal'
import calendarIcon from '@/assets/guide-init/calendar-icon.svg'

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1)
const DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => index + 1)

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function parseValue(value) {
  if (!value) {
    return [11, 15]
  }
  const [month, day] = value.split('-').map(Number)
  return [month || 1, day || 1]
}

function formatValue(nextValue) {
  const [month, day] = nextValue
  return `${padNumber(month)}-${padNumber(day)}`
}

function defaultFormatLabel(value, placeholder) {
  if (!value) {
    return placeholder
  }
  const [month, day] = value.split('-')
  return `${month}月${day}日`
}

function MonthDayPicker({
  value,
  onChange,
  title = '日期选择',
  placeholder = '请选择时间',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false)

  const columns = useMemo(() => [
    { key: 'month', options: MONTH_OPTIONS, formatter: (next) => `${padNumber(next)}月` },
    { key: 'day', options: DAY_OPTIONS, formatter: (next) => `${padNumber(next)}日` },
  ], [])

  const displayLabel = defaultFormatLabel(value, placeholder)

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setIsOpen(true)}
      >
        <span className={`month-day-picker__value ${!value ? 'month-day-picker__value--placeholder' : ''}`}>
          {displayLabel}
        </span>
        <img src={calendarIcon} alt="" className="month-day-picker__icon" aria-hidden="true" />
      </button>

      <TimePickerModal
        isOpen={isOpen}
        title={title}
        columns={columns}
        value={parseValue(value)}
        onClose={() => setIsOpen(false)}
        onConfirm={(nextValue) => {
          onChange?.(formatValue(nextValue))
          setIsOpen(false)
        }}
      />
    </>
  )
}

export default MonthDayPicker
