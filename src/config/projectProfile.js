/**
 * 项目形态配置：当前已统一为标准项目逻辑，不再区分 standard / dajuyuan。
 * 保留 VITE_PROJECT_PROFILE 读取仅作环境标识，不影响业务逻辑。
 */

const VALID_PROFILES = new Set(['standard', 'dajuyuan'])

export const PROJECT_PROFILE = (() => {
  const raw = String(import.meta.env.VITE_PROJECT_PROFILE ?? 'standard').trim().toLowerCase()
  return VALID_PROFILES.has(raw) ? raw : 'standard'
})()

export const isStandardProfile = PROJECT_PROFILE === 'standard'

/** 后端下拉 No14–25 映射到风冷模块 No31–42（当前项目已无独立风冷模块，保留兼容性映射） */
export const USE_AIR_COOLED_DEVICE_CODE_REMAP = false

/** 标准款首页状态轮询默认热泵台数（HPTotalNumber 不可用时的兜底，与向导默认一致） */
export const STANDARD_DEFAULT_HEAT_PUMP_COUNT = 7
