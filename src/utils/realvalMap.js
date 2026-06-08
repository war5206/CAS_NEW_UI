/**
 * 从 queryRealvalByLongNames 响应中解析点位长名 → 值的映射
 * @param {unknown} response
 * @returns {Record<string, unknown> | null}
 */
export function extractRealvalMap(response) {
  const payload = response?.data
  if (!payload || payload.success === false) return null
  const data = payload.data
  if (!data || typeof data !== 'object') return null
  return data
}

/** 将接口 0/1、数字或字符串数字、布尔值等统一判为「开」 */
export function isOnValue(value) {
  if (value === true || value === 1) return true
  if (value === false || value === 0 || value == null) return false

  const text = String(value).trim().toLowerCase()
  if (!text) return false
  if (text === '1' || text === 'true' || text === 'on') return true
  if (text === '0' || text === 'false' || text === 'off') return false

  const numeric = Number(text)
  if (Number.isFinite(numeric)) {
    return numeric === 1
  }

  return false
}
