const TOTAL_DAY_MINUTES = 24 * 60

function toText(value, fallback = '') {
  if (value == null || value === '') {
    return fallback
  }
  return String(value)
}

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || value === 'true' || value === 'TRUE') return true
  if (value === 0 || value === '0' || value === 'false' || value === 'FALSE') return false
  return fallback
}

function formatTwoDigits(value) {
  return String(value).padStart(2, '0')
}

function minutesToTimeText(minutes) {
  const safe = Math.max(0, Math.min(TOTAL_DAY_MINUTES, Number(minutes) || 0))
  if (safe === TOTAL_DAY_MINUTES) {
    return '24:00'
  }
  const hour = Math.floor(safe / 60)
  const minute = safe % 60
  return `${formatTwoDigits(hour)}:${formatTwoDigits(minute)}`
}

function timeTextToMinutes(value) {
  const text = String(value ?? '').trim()
  if (!text) return 0
  if (text === '24:00' || text === '24:00:00') return TOTAL_DAY_MINUTES
  const matched = text.match(/^(\d{1,2}):(\d{1,2})/)
  if (!matched) return 0
  const hour = Math.max(0, Math.min(24, Number.parseInt(matched[1], 10) || 0))
  const minute = Math.max(0, Math.min(59, Number.parseInt(matched[2], 10) || 0))
  if (hour === 24) return TOTAL_DAY_MINUTES
  return hour * 60 + minute
}

function adaptDays(rawDays) {
  if (!Array.isArray(rawDays)) {
    return []
  }
  const result = []
  rawDays.forEach((day) => {
    const numeric = Number.parseInt(String(day).trim(), 10)
    if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 6) {
      result.push(numeric)
    }
  })
  return result
}

function adaptPeriod(rawPeriod) {
  if (!rawPeriod || typeof rawPeriod !== 'object') {
    return null
  }

  const startMinutes = rawPeriod.startMinute != null
    ? Number.parseInt(rawPeriod.startMinute, 10)
    : timeTextToMinutes(rawPeriod.start)
  const endMinutes = rawPeriod.endMinute != null
    ? Number.parseInt(rawPeriod.endMinute, 10)
    : timeTextToMinutes(rawPeriod.end)

  const start = toText(rawPeriod.start, minutesToTimeText(startMinutes))
  const end = toText(rawPeriod.end, minutesToTimeText(endMinutes))
  const mode = rawPeriod.mode === 'constant' ? 'constant' : 'climate'
  const temperature = mode === 'constant' ? toText(rawPeriod.temperature, '') : ''

  return {
    id: toText(rawPeriod.id, ''),
    start,
    end,
    mode,
    temperature,
  }
}

function adaptCycle(rawCycle) {
  if (!rawCycle || typeof rawCycle !== 'object') {
    return null
  }

  const periods = Array.isArray(rawCycle.periods)
    ? rawCycle.periods.map(adaptPeriod).filter(Boolean)
    : []

  return {
    id: toText(rawCycle.id, ''),
    days: adaptDays(rawCycle.days),
    periods,
  }
}

function adaptPlan(rawPlan) {
  if (!rawPlan || typeof rawPlan !== 'object') {
    return null
  }

  const cycles = Array.isArray(rawPlan.cycles)
    ? rawPlan.cycles.map(adaptCycle).filter(Boolean)
    : []

  return {
    id: toText(rawPlan.id ?? rawPlan.planId, ''),
    name: toText(rawPlan.planName ?? rawPlan.name, '方案'),
    enabled: toBoolean(rawPlan.enabled, false),
    pageMode: toText(rawPlan.pageMode, 'smart'),
    priority: Number.parseInt(rawPlan.priority, 10) || 0,
    remark: toText(rawPlan.remark, ''),
    cycles,
  }
}

export function createDefaultSmartTimerPlans() {
  return {
    plans: [],
    total: 0,
    fetchedAt: null,
  }
}

/**
 * 后端 querySmartTimerPlan 响应（{ state, list/plans, total, ... }）转前端使用结构。
 * 失败/异常返回空数组，调用方继续展示默认状态。
 */
export function adaptSmartTimerPlans(rawData) {
  const fallback = createDefaultSmartTimerPlans()
  const responseData = rawData?.data ?? rawData
  const source = responseData?.data ?? responseData ?? {}

  if (source?.state && source.state !== 'success') {
    return fallback
  }

  const rawPlans = Array.isArray(source.list)
    ? source.list
    : Array.isArray(source.plans)
      ? source.plans
      : []

  const plans = rawPlans.map(adaptPlan).filter(Boolean)
  const total = Number.parseInt(source.total, 10)

  return {
    plans,
    total: Number.isFinite(total) ? total : plans.length,
    fetchedAt: Date.now(),
  }
}

/**
 * 将前端方案对象转为后端 saveSmartTimerPlan 所需的 JSON 字符串。
 * - 周期 days 仅保留 0~6 数值
 * - 时段以 startMinute/endMinute 一并下发，避免歧义
 * - climate 模式 temperature 留空；constant 模式必传温度
 */
export function buildSmartTimerPlanPayload(plan) {
  if (!plan || typeof plan !== 'object') {
    return null
  }

  const cycles = Array.isArray(plan.cycles) ? plan.cycles : []
  const payload = {
    name: toText(plan.name, '方案'),
    planName: toText(plan.name, '方案'),
    enabled: plan.enabled !== false,
    pageMode: toText(plan.pageMode, 'smart'),
    priority: Number.parseInt(plan.priority, 10) || 0,
    remark: toText(plan.remark, ''),
    cycles: cycles.map((cycle) => ({
      days: adaptDays(cycle?.days),
      periods: (Array.isArray(cycle?.periods) ? cycle.periods : []).map((period) => {
        const start = toText(period?.start, '00:00')
        const end = toText(period?.end, '00:00')
        const mode = period?.mode === 'constant' ? 'constant' : 'climate'
        const item = {
          start,
          end,
          startMinute: timeTextToMinutes(start),
          endMinute: timeTextToMinutes(end),
          mode,
        }
        if (mode === 'constant') {
          item.temperature = toText(period?.temperature, '')
        }
        return item
      }),
    })),
  }

  if (plan.id != null && String(plan.id).trim() !== '') {
    payload.id = String(plan.id)
  }

  return JSON.stringify(payload)
}
