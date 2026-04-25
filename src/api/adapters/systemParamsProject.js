import { CITY_DATA, PROVINCE_ORDER } from '@/shared/constants/areaData'

function toText(value, fallback) {
  if (value == null || value === '') {
    return fallback
  }
  return String(value)
}

function toIdString(value, fallback) {
  const t = toText(value, '')
  if (!t) return fallback
  return t
}

export function findProvinceNameByCode(provinceCode) {
  if (!provinceCode) {
    const first = PROVINCE_ORDER.find((p) => CITY_DATA[p]?.cities?.length)
    return first || '江苏省'
  }
  const entry = Object.entries(CITY_DATA).find(([, data]) => data.province_code === provinceCode)
  if (entry) return entry[0]
  return PROVINCE_ORDER.find((p) => CITY_DATA[p]?.cities?.length) || '江苏省'
}

function normalizeMonthDay(value) {
  if (!value || typeof value !== 'string') return '01-01'
  const m = value.trim()
  if (/^\d{1,2}-\d{1,2}$/.test(m)) {
    const [a, b] = m.split('-')
    return `${String(Number(a)).padStart(2, '0')}-${String(Number(b)).padStart(2, '0')}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(m)) {
    const [, mo, d] = m.split('-')
    return `${mo}-${d}`
  }
  return '01-01'
}

/**
 * 创建项目系统类型表单默认（接口失败时兜底）
 */
export function createDefaultProjectForm() {
  const provinceName = findProvinceNameByCode('Jiangsu')
  const firstCity = CITY_DATA[provinceName]?.cities?.[0]
  return {
    projectType: '1',
    terminalType: '1',
    systemType: '1',
    provinceCode: toText(CITY_DATA[provinceName]?.province_code, 'Jiangsu'),
    projectAreaId: toText(firstCity?.projectAreaId, '2'),
    heatPumpCount: '0',
    heatingArea: '0',
    heatingSeasonStart: '11-15',
    heatingSeasonEnd: '03-15',
  }
}

/**
 * 从 queryProjectData 原始响应中解析为表单
 * @param {unknown} response - axios 响应
 */
export function adaptProjectDataFromQueryResponse(response) {
  const payload = response?.data
  if (!payload || payload.success === false) {
    return null
  }
  const body = payload.data
  if (!body || typeof body !== 'object') {
    return null
  }
  const projectData = body.projectData
  if (!projectData || typeof projectData !== 'object') {
    return null
  }

  const provinceCode = toIdString(projectData.province_code, 'Jiangsu')
  const provinceName = findProvinceNameByCode(provinceCode)
  const cities = CITY_DATA[provinceName]?.cities || []
  let projectAreaId = toIdString(projectData.project_area_uuid, '')
  if (projectAreaId && !cities.some((c) => String(c.projectAreaId) === projectAreaId)) {
    projectAreaId = cities[0] ? String(cities[0].projectAreaId) : projectAreaId
  }
  if (!projectAreaId && cities[0]) {
    projectAreaId = String(cities[0].projectAreaId)
  }

  return {
    projectType: toIdString(projectData.project_type_uuid, '1'),
    terminalType: toIdString(projectData.terminal_type_uuid, '1'),
    systemType: toIdString(projectData.system_type_uuid, '1'),
    provinceCode,
    projectAreaId: projectAreaId || '1',
    heatPumpCount: toIdString(projectData.heat_pump, '0'),
    heatingArea: toIdString(projectData.project_acreage, '0'),
    heatingSeasonStart: normalizeMonthDay(projectData.start_heating_season),
    heatingSeasonEnd: normalizeMonthDay(projectData.end_heating_season),
  }
}

/**
 * 将表单状态映射为 saveProjectData 的 projectData
 * @param {ReturnType<typeof createDefaultProjectForm>} form
 */
export function toSaveProjectDataPayload(form) {
  return {
    projectTypeId: String(form.projectType ?? '1'),
    projectAreaId: String(form.projectAreaId ?? '1'),
    terminalTypeId: String(form.terminalType ?? '1'),
    systemTypeId: String(form.systemType ?? '1'),
    projectAcreage: String(form.heatingArea ?? '0'),
    startHeatingSeason: String(form.heatingSeasonStart ?? '11-15'),
    heatPump: String(form.heatPumpCount ?? '0'),
    endHeatingSeason: String(form.heatingSeasonEnd ?? '03-15'),
  }
}

const LOOP_MAIN_MIN = 1
const LOOP_MAIN_MAX = 4
const LOOP_SPARE_MIN = 0
const LOOP_SPARE_MAX = 2

function clampInt(value, min, max, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) {
    return fallback
  }
  return Math.min(max, Math.max(min, Math.round(n)))
}

/**
 * 循环泵台数页默认（接口失败时）
 */
export function createDefaultLoopPumpForm() {
  return {
    systemTypeUuid: '1',
    heatMain: '2',
    heatSpare: '1',
    terminalMain: '2',
    terminalSpare: '2',
    terminalMode: '定频',
  }
}

/**
 * 从 queryCirculationPump 响应解析为循环泵台数表单
 * @param {unknown} response - axios 响应
 */
export function adaptCirculationPumpFromQueryResponse(response) {
  const payload = response?.data
  if (!payload || payload.success === false) {
    return null
  }
  const body = payload.data
  if (!body || typeof body !== 'object') {
    return null
  }
  const projectData = body.projectData
  if (!projectData || typeof projectData !== 'object') {
    return null
  }
  const main = (v) => String(clampInt(v, LOOP_MAIN_MIN, LOOP_MAIN_MAX, 1))
  const spare = (v) => String(clampInt(v, LOOP_SPARE_MIN, LOOP_SPARE_MAX, 0))
  const mode = toText(projectData.terminal_circulation_pump_mode, '定频')
  const validMode = mode === '变频' ? '变频' : '定频'
  return {
    systemTypeUuid: toIdString(projectData.system_type_uuid, '1'),
    heatMain: main(projectData.heat_circulation_pump_main),
    heatSpare: spare(projectData.heat_circulation_pump_spare),
    terminalMain: main(projectData.terminal_circulation_pump_main),
    terminalSpare: spare(projectData.terminal_circulation_pump_spare),
    terminalMode: validMode,
  }
}

/**
 * 循环泵台数 — 下置 projectData
 * @param {ReturnType<typeof createDefaultLoopPumpForm>} form
 */
export function toSaveCirculationPumpPayload(form) {
  return {
    heatPumpMain: clampInt(form?.heatMain, LOOP_MAIN_MIN, LOOP_MAIN_MAX, 1),
    heatPumpSpare: clampInt(form?.heatSpare, LOOP_SPARE_MIN, LOOP_SPARE_MAX, 0),
    terminalPumpMain: clampInt(form?.terminalMain, LOOP_MAIN_MIN, LOOP_MAIN_MAX, 1),
    terminalPumpSpare: clampInt(form?.terminalSpare, LOOP_SPARE_MIN, LOOP_SPARE_MAX, 0),
    terminalPumpMode: toText(form?.terminalMode, '定频') === '变频' ? '变频' : '定频',
  }
}

/**
 * 从 queryMotherboardData 原始响应中解析主板类型
 * 始终返回完整下拉选项，保证 UI 可切换“自制主板/精创主板”
 * @param {unknown} response - axios 响应
 */
export function adaptMotherboardFromQueryResponse(response) {
  const payload = response?.data
  if (!payload || payload.success === false) {
    return null
  }
  const body = payload.data
  const rows = Array.isArray(body?.motherboardData) ? body.motherboardData : []
  const first = rows[0] || {}
  const rawModel = first?.motherboard_model
  const normalizedModel = rawModel == null ? '' : String(rawModel)
  const id = first?.id == null ? '' : String(first.id)

  const optionMap = {
    '1': { value: '1', label: '自制主板' },
    '2': { value: '2', label: '精创主板' },
  }
  const options = Object.values(optionMap)
  const matched = optionMap[normalizedModel]
  return {
    id,
    value: matched?.value || options[0]?.value || '',
    options,
  }
}

/**
 * 将主板表单映射为 updateMotherboardData 的 data
 * @param {{ id: string, motherboardModel: string }} form
 */
export function toUpdateMotherboardPayload(form) {
  return {
    motherboard_model: String(form?.motherboardModel ?? ''),
    id: String(form?.id ?? ''),
  }
}

/**
 * 从 queryCoupleEnergy 响应中解析耦合能源
 * @param {unknown} response - axios 响应
 */
export function adaptCoupleEnergyFromQueryResponse(response) {
  const payload = response?.data
  if (!payload || payload.success === false) {
    return null
  }
  const body = payload.data
  const coupleEnergy = body?.coupleEnergy
  if (!coupleEnergy || typeof coupleEnergy !== 'object') {
    return null
  }
  return {
    typeId: coupleEnergy.couple_energy_type_uuid == null ? '' : String(coupleEnergy.couple_energy_type_uuid),
    count: coupleEnergy.couple_energy_number == null ? '0' : String(coupleEnergy.couple_energy_number),
    id: coupleEnergy.id == null ? '' : String(coupleEnergy.id),
    projectId: body?.projectId == null ? '' : String(body.projectId),
  }
}

/**
 * 将耦合能源状态映射为 saveCoupleEnergy 的 coupleEnergy
 * @param {{ coupleEnergyTypeId: string, id: string, projectId: string, coupleEnergyNumber: string }} form
 */
export function toSaveCoupleEnergyPayload(form) {
  return {
    coupleEnergyTypeId: String(form?.coupleEnergyTypeId ?? ''),
    id: String(form?.id ?? ''),
    projectId: String(form?.projectId ?? ''),
    coupleEnergyNumber: String(form?.coupleEnergyNumber ?? '0'),
  }
}
