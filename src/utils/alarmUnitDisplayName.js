/** 告警展示：统一使用「热泵N」 */

export function getAlarmArrangeUnitDisplayName(arrangeNo) {
  const n = Number(arrangeNo)
  if (!Number.isFinite(n) || n < 1) {
    return null
  }
  return `热泵${n}`
}

export function formatAlarmUnitLabelText(text) {
  return text
}

export function resolveAlarmUnitLabelText(text) {
  return text
}
