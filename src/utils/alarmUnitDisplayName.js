/** 告警展示：arrange 14–25 对应风冷模块 1–12（仅文案，不改请求参数/点位） */
export const ALARM_AIR_COOLED_ARRANGE_START = 14
export const ALARM_AIR_COOLED_ARRANGE_END = 25

/**
 * 按排布序号生成告警模块展示名：1–13 热泵，14–25 风冷模块 1–12。
 */
export function getAlarmArrangeUnitDisplayName(arrangeNo) {
  const n = Number(arrangeNo)
  if (!Number.isFinite(n) || n < 1) {
    return null
  }
  if (n <= 13) {
    return `热泵${n}`
  }
  if (n >= ALARM_AIR_COOLED_ARRANGE_START && n <= ALARM_AIR_COOLED_ARRANGE_END) {
    return `风冷模块${n - 13}`
  }
  return `热泵${n}`
}

/**
 * 将文案中的「热泵14」…「热泵25」替换为「风冷模块1」…「风冷模块12」；热泵 1–13 归一为「热泵N」。
 */
export function formatAlarmUnitLabelText(text) {
  if (text == null || text === '') {
    return text
  }

  return String(text).replace(/热泵\s*(\d+)/g, (match, numStr) => {
    const n = Number(numStr)
    if (n >= ALARM_AIR_COOLED_ARRANGE_START && n <= ALARM_AIR_COOLED_ARRANGE_END) {
      return `风冷模块${n - 13}`
    }
    if (n >= 1 && n <= 13) {
      return `热泵${n}`
    }
    return match
  })
}
