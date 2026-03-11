import { useMemo, useState } from 'react'
import TimePickerModal from './TimePickerModal'

const YEAR_OPTIONS = Array.from({ length: 16 }, (_, index) => 2020 + index)
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1)
const DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => index + 1)

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function parseValue(value, type) {
  if (!value) {
    return type === 'year' ? [YEAR_OPTIONS[0]] : type === 'month' ? [YEAR_OPTIONS[0], 1] : [YEAR_OPTIONS[0], 1, 1]
  }

  if (type === 'year') {
    return [Number(value)]
  }

  if (type === 'month') {
    const [year, month] = value.split('-').map(Number)
    return [year, month]
  }

  const [year, month, day] = value.split('-').map(Number)
  return [year, month, day]
}

function formatValue(nextValue, type) {
  if (type === 'year') {
    return String(nextValue[0])
  }

  if (type === 'month') {
    const [year, month] = nextValue
    return `${year}-${padNumber(month)}`
  }

  const [year, month, day] = nextValue
  return `${year}-${padNumber(month)}-${padNumber(day)}`
}

function formatLabel(value, type, placeholder) {
  if (!value) {
    return placeholder
  }

  if (type === 'year') {
    return `${value}年`
  }

  if (type === 'month') {
    const [year, month] = value.split('-')
    return `${year}.${month}`
  }

  const [year, month, day] = value.split('-')
  return `${year}.${month}.${day}`
}

function DatePickerTrigger({
  value,
  onChange,
  type = 'date',
  title = '日期选择',
  placeholder = '请选择',
  className = '',
  icon,
}) {
  const [isOpen, setIsOpen] = useState(false)

  const columns = useMemo(() => {
    if (type === 'year') {
      return [{ key: 'year', options: YEAR_OPTIONS, formatter: (next) => `${next}年` }]
    }

    if (type === 'month') {
      return [
        { key: 'year', options: YEAR_OPTIONS, formatter: (next) => `${next}年` },
        { key: 'month', options: MONTH_OPTIONS, formatter: (next) => `${padNumber(next)}月` },
      ]
    }

    return [
      { key: 'year', options: YEAR_OPTIONS, formatter: (next) => `${next}年` },
      { key: 'month', options: MONTH_OPTIONS, formatter: (next) => `${padNumber(next)}月` },
      { key: 'day', options: DAY_OPTIONS, formatter: (next) => `${padNumber(next)}日` },
    ]
  }, [type])

  return (
    <>
      <button type="button" className={className} onClick={() => setIsOpen(true)}>
        {icon ? <img src={icon} alt="" aria-hidden="true" /> : null}
        <span>{formatLabel(value, type, placeholder)}</span>
      </button>

      <TimePickerModal
        isOpen={isOpen}
        title={title}
        columns={columns}
        value={parseValue(value, type)}
        onClose={() => setIsOpen(false)}
        onConfirm={(nextValue) => {
          onChange?.(formatValue(nextValue, type))
          setIsOpen(false)
        }}
      />
    </>
  )
}

export default DatePickerTrigger
