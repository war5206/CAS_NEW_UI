const ENERGY_PRICE_STATE_KEY = 'cas_energy_price_state'

export const ENERGY_PRICE_SEGMENT_COLORS = ['#2387f0', '#efc443', '#ff7a45', '#2dd283', '#9b6bcc', '#00b4d8']

export const DEFAULT_ENERGY_PRICE_STATE = {
  tab: 'water',
  waterFixed: '9.00',
  gasFixed: '4.80',
  electricPlans: [
    {
      id: 1,
      startDate: '01-01',
      endDate: '12-31',
      segments: [
        { start: '00:00', end: '08:00', price: '0.28', color: '#2387f0' },
        { start: '08:00', end: '22:00', price: '0.52', color: '#efc443' },
        { start: '22:00', end: '24:00', price: '0.28', color: '#ff7a45' },
      ],
    },
  ],
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function parseTimeToMinutes(value) {
  if (!value || typeof value !== 'string') {
    return 0
  }

  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return 0
  }

  return Math.min(24 * 60, Math.max(0, hour * 60 + minute))
}

export function formatMinutesToTime(totalMinutes) {
  const safeMinutes = Math.min(24 * 60, Math.max(0, Number(totalMinutes) || 0))
  const hour = Math.floor(safeMinutes / 60)
  const minute = safeMinutes % 60

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function parseMonthDay(value) {
  if (!value || typeof value !== 'string') {
    return [1, 1]
  }

  const [monthText, dayText] = value.split('-')
  const month = Number(monthText)
  const day = Number(dayText)

  return [
    Number.isInteger(month) && month >= 1 && month <= 12 ? month : 1,
    Number.isInteger(day) && day >= 1 && day <= 31 ? day : 1,
  ]
}

function getMonthDayOrder(value) {
  const [month, day] = parseMonthDay(value)
  return month * 100 + day
}

function normalizeSegments(segments) {
  const source = Array.isArray(segments) ? segments : []
  if (source.length === 0) {
    return [{ start: '00:00', end: '24:00', price: '', color: ENERGY_PRICE_SEGMENT_COLORS[0] }]
  }

  const normalized = source.map((segment, index) => ({
    start: formatMinutesToTime(parseTimeToMinutes(segment?.start)),
    end: formatMinutesToTime(parseTimeToMinutes(segment?.end)),
    price: segment?.price ?? '',
    color: segment?.color ?? ENERGY_PRICE_SEGMENT_COLORS[index % ENERGY_PRICE_SEGMENT_COLORS.length],
  }))

  return normalized.map((segment, index) => {
    if (index === 0) {
      return {
        ...segment,
        start: '00:00',
      }
    }

    return {
      ...segment,
      start: normalized[index - 1]?.end ?? segment.start,
    }
  })
}

export function normalizeEnergyPriceState(state) {
  const source = state && typeof state === 'object' ? state : DEFAULT_ENERGY_PRICE_STATE
  const plans = Array.isArray(source.electricPlans) ? source.electricPlans : DEFAULT_ENERGY_PRICE_STATE.electricPlans

  return {
    tab: source.tab === 'electricity' || source.tab === 'gas' ? source.tab : 'water',
    waterFixed: source.waterFixed ?? DEFAULT_ENERGY_PRICE_STATE.waterFixed,
    gasFixed: source.gasFixed ?? DEFAULT_ENERGY_PRICE_STATE.gasFixed,
    electricPlans: plans.map((plan, index) => ({
      id: plan?.id ?? index + 1,
      startDate: plan?.startDate ?? '01-01',
      endDate: plan?.endDate ?? '12-31',
      segments: normalizeSegments(plan?.segments),
    })),
  }
}

export function getDefaultEnergyPriceState() {
  return deepClone(DEFAULT_ENERGY_PRICE_STATE)
}

export function getStoredEnergyPriceState() {
  if (typeof window === 'undefined') {
    return getDefaultEnergyPriceState()
  }

  const value = window.localStorage.getItem(ENERGY_PRICE_STATE_KEY)
  if (!value) {
    return getDefaultEnergyPriceState()
  }

  try {
    return normalizeEnergyPriceState(JSON.parse(value))
  } catch {
    return getDefaultEnergyPriceState()
  }
}

export function setStoredEnergyPriceState(state) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(ENERGY_PRICE_STATE_KEY, JSON.stringify(normalizeEnergyPriceState(state)))
}

export function getSegmentKey(segment) {
  return `${segment.start}-${segment.end}`
}

export function isMonthDayInRange(monthDay, startDate, endDate) {
  const targetOrder = getMonthDayOrder(monthDay)
  const startOrder = getMonthDayOrder(startDate)
  const endOrder = getMonthDayOrder(endDate)

  if (startOrder <= endOrder) {
    return targetOrder >= startOrder && targetOrder <= endOrder
  }

  return targetOrder >= startOrder || targetOrder <= endOrder
}
