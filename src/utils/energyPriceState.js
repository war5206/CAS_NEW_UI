const ENERGY_PRICE_STATE_KEY = 'cas_energy_price_state'
/** 配置向导「能源价格」专用，与系统参数页隔离，避免沿用本地旧演示数据 */
const ENERGY_PRICE_GUIDE_STATE_KEY = 'cas_energy_price_state_guide'

export const ENERGY_PRICE_SEGMENT_COLORS = ['#2387f0', '#efc443', '#ff7a45', '#2dd283', '#9b6bcc', '#00b4d8']

export const DEFAULT_ENERGY_PRICE_STATE = {
  tab: 'water',
  waterFixed: '0',
  gasFixed: '0',
  electricPlans: [],
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

function normalizeMonthDayText(value, fallback) {
  const [month, day] = parseMonthDay(value)
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` || fallback
}

function parseMonthRangeText(value) {
  if (!value || typeof value !== 'string') {
    return ['01-01', '12-31']
  }
  const matched = value.match(/(\d{1,2}-\d{1,2})\s*-\s*(\d{1,2}-\d{1,2})/)
  if (!matched) {
    return ['01-01', '12-31']
  }
  const rawStart = matched[1]
  const rawEnd = matched[2]
  return [normalizeMonthDayText(rawStart, '01-01'), normalizeMonthDayText(rawEnd, '12-31')]
}

function parseTimeRangeText(value) {
  if (!value || typeof value !== 'string') {
    return ['00:00', '24:00']
  }
  const [rawStart, rawEnd] = value.split('-').map((item) => item?.trim())
  const safeStart = formatMinutesToTime(parseTimeToMinutes(rawStart))
  const safeEnd = formatMinutesToTime(parseTimeToMinutes(rawEnd))
  return [safeStart, safeEnd === '00:00' ? '24:00' : safeEnd]
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
  const plans = Array.isArray(source.electricPlans) ? source.electricPlans : []

  return {
    tab: source.tab === 'electricity' || source.tab === 'gas' ? source.tab : 'water',
    waterFixed: source.waterFixed ?? '0',
    gasFixed: source.gasFixed ?? '0',
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

export function getStoredEnergyPriceStateForGuide() {
  if (typeof window === 'undefined') {
    return getDefaultEnergyPriceState()
  }

  const value = window.localStorage.getItem(ENERGY_PRICE_GUIDE_STATE_KEY)
  if (!value) {
    return getDefaultEnergyPriceState()
  }

  try {
    return normalizeEnergyPriceState(JSON.parse(value))
  } catch {
    return getDefaultEnergyPriceState()
  }
}

export function setStoredEnergyPriceStateForGuide(state) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(ENERGY_PRICE_GUIDE_STATE_KEY, JSON.stringify(normalizeEnergyPriceState(state)))
}

/**
 * queryEnergyPrice 响应 -> energyPriceState
 * @param {object} responseData queryEnergyPrice 的 response.data
 */
export function buildEnergyPriceStateFromQueryResponse(responseData) {
  const list = Array.isArray(responseData?.energyPrice) ? responseData.energyPrice : []
  const waterItem = list.find((item) => item?.energyCode === 'WATER')
  const gasItem = list.find((item) => item?.energyCode === 'GAS')
  const electricityItem = list.find((item) => item?.energyCode === 'ELECTRICITY')
  const detailPriceList = Array.isArray(electricityItem?.detailPrice) ? electricityItem.detailPrice : []

  const plansMap = new Map()
  detailPriceList.forEach((detail, index) => {
    const monthText = String(detail?.month ?? '').trim()
    const [startDate, endDate] = parseMonthRangeText(monthText)
    const planKey = `${startDate}-${endDate}`
    if (!plansMap.has(planKey)) {
      plansMap.set(planKey, {
        id: planKey,
        startDate,
        endDate,
        segments: [],
      })
    }
    const [start, end] = parseTimeRangeText(String(detail?.time ?? ''))
    plansMap.get(planKey).segments.push({
      start,
      end,
      price: String(detail?.unitPrice ?? '').trim(),
      color: ENERGY_PRICE_SEGMENT_COLORS[index % ENERGY_PRICE_SEGMENT_COLORS.length],
    })
  })

  const electricPlans = Array.from(plansMap.values()).map((plan, index) => ({
    ...plan,
    id: plan.id || index + 1,
    segments: normalizeSegments(plan.segments),
  }))

  return normalizeEnergyPriceState({
    tab: 'water',
    waterFixed: String(waterItem?.fixedPrice ?? '0').trim() || '0',
    gasFixed: String(gasItem?.fixedPrice ?? '0').trim() || '0',
    electricPlans,
  })
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
