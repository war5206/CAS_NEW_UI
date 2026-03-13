export function padMonthDay(value) {
  return String(value).padStart(2, '0')
}

export function parseMonthValue(value) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return { year: 2026, month: 3 }
  }

  const [year, month] = value.split('-').map(Number)
  return { year, month }
}

export function getMonthDayCount(monthValue) {
  const { year, month } = parseMonthValue(monthValue)
  return new Date(year, month, 0).getDate()
}

export function compareMonthValues(left, right) {
  const leftValue = parseMonthValue(left)
  const rightValue = parseMonthValue(right)

  if (leftValue.year !== rightValue.year) {
    return leftValue.year - rightValue.year
  }

  return leftValue.month - rightValue.month
}

export function enumerateMonthRange(startMonthValue, endMonthValue) {
  const startValue = startMonthValue || endMonthValue || '2026-01'
  const endValue = endMonthValue || startMonthValue || startValue

  if (compareMonthValues(startValue, endValue) > 0) {
    return []
  }

  const start = parseMonthValue(startValue)
  const end = parseMonthValue(endValue)
  const months = []

  let year = start.year
  let month = start.month

  while (year < end.year || (year === end.year && month <= end.month)) {
    months.push({
      value: `${year}-${padMonthDay(month)}`,
      year,
      month,
    })

    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }

    if (months.length >= 24) {
      break
    }
  }

  return months
}

export function getCurrentDateInfo() {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  }
}

export function getMaxAvailableDay(monthValue, currentDateInfo = getCurrentDateInfo()) {
  const { year, month } = parseMonthValue(monthValue)

  if (year > currentDateInfo.year || (year === currentDateInfo.year && month > currentDateInfo.month)) {
    return 0
  }

  if (year === currentDateInfo.year && month === currentDateInfo.month) {
    return Math.max(0, currentDateInfo.day - 1)
  }

  return getMonthDayCount(monthValue)
}

export function formatMonthAxisLabel(monthValue) {
  const { year, month } = parseMonthValue(monthValue)
  return `${year}.${padMonthDay(month)}`
}

export function syncMonthRange(range, changedKey) {
  const nextRange = { ...range }

  if (!nextRange.startMonth || !nextRange.endMonth) {
    return nextRange
  }

  if (compareMonthValues(nextRange.startMonth, nextRange.endMonth) <= 0) {
    return nextRange
  }

  if (changedKey === 'startMonth') {
    nextRange.endMonth = nextRange.startMonth
    return nextRange
  }

  if (changedKey === 'endMonth') {
    nextRange.startMonth = nextRange.endMonth
    return nextRange
  }

  return nextRange
}
