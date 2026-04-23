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

/** 将接口 0/1 或 "0"/"1" 判为开 */
export function isOnValue(value) {
  return value === 1 || value === '1'
}
