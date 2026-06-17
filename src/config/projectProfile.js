/**
 * 项目形态配置：通过环境变量 VITE_PROJECT_PROFILE 切换。
 *
 * - standard  标准款（默认）
 * - dajuyuan  大剧院非标（13 热泵 + 12 风冷模块固定排布）
 */

const VALID_PROFILES = new Set(['standard', 'dajuyuan'])

export const PROJECT_PROFILE = (() => {
  const raw = String(import.meta.env.VITE_PROJECT_PROFILE ?? 'standard').trim().toLowerCase()
  return VALID_PROFILES.has(raw) ? raw : 'standard'
})()

export const isDajuyuanProfile = PROJECT_PROFILE === 'dajuyuan'
export const isStandardProfile = PROJECT_PROFILE === 'standard'

/** 机组排布固定写死，跳过智能扫描（大剧院） */
export const USE_FIXED_UNIT_LAYOUT = isDajuyuanProfile

/** 风冷模块作为独立机组 Tab / 页面（非仅耦合能源） */
export const SHOW_AIR_COOLED_AS_STANDALONE_UNITS = isDajuyuanProfile

/** 首页原理图 overlay：单独展示风冷模块机组状态块 */
export const SHOW_HOME_AIR_COOLED_STATUS_BLOCK = isDajuyuanProfile

/** 手动模式：风冷模块 No31–No42 Poweron 控制 */
export const SHOW_MANUAL_AIR_COOLED_CONTROL = isDajuyuanProfile

/** 告警文案：热泵 14–25 → 风冷模块 1–12 */
export const USE_ALARM_UNIT_RENAME = isDajuyuanProfile

/** 后端下拉 No14–25 映射到风冷模块 No31–42 */
export const USE_AIR_COOLED_DEVICE_CODE_REMAP = isDajuyuanProfile

/** 设备状态面板：标准款显示热泵循环泵 Tab，大剧院显示风冷模块 Tab */
export const SHOW_DEVICE_STATUS_LOOP_PUMP_TAB = isStandardProfile

/** 首页系统原理图资源键 */
export const SYSTEM_DIAGRAM_KEY = isDajuyuanProfile ? 'dajuyuan' : 'standard'

/** 运维-系统管理：大剧院拆分热泵/风冷两个机组数据 Tab */
export const USE_SPLIT_OPS_UNIT_DATA_TABS = isDajuyuanProfile

/** 标准款首页状态轮询默认热泵台数（HPTotalNumber 不可用时的兜底，与向导默认一致） */
export const STANDARD_DEFAULT_HEAT_PUMP_COUNT = 7

/** 大剧院固定热泵 / 风冷台数（与 FIXED_UNIT_LAYOUT_ROWS 一致） */
export const DAJUYUAN_HEAT_PUMP_COUNT = 13
export const DAJUYUAN_AIR_COOLED_MODULE_COUNT = 12
