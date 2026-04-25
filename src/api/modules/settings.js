import { post } from '../client/http'
import { getApiBaseUrl, getAlgorithmProcessPath, ALGORITHM_PROCESS_IDS } from '../client/config'

async function callAlgorithmProcess(algorithmProcessId, paramData = {}) {
  return post(
    getAlgorithmProcessPath(),
    {
      algorithmProcessId,
      param: { data: paramData },
    },
    {
      baseUrl: getApiBaseUrl(),
      timeout: 10_000,
    },
  )
}

/**
 * 批量查询点位实时值
 * @param {string | string[]} longNames - 单个点位名或多个点位名（数组会用逗号拼接）
 */
export async function queryRealvalByLongNames(longNames) {
  const value = Array.isArray(longNames) ? longNames.filter(Boolean).join(',') : String(longNames ?? '')
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_REALVAL_BY_LONG_NAMES, {
    longNames: value,
  })
}

/**
 * 批量下置点位值
 * @param {Record<string, number | string>} writeData - 键为点位长名，值为要写入的数据
 */
export async function writeRealvalByLongNames(writeData) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.WRITE_REALVAL_BY_LONG_NAMES, {
    writeData,
  })
}

/**
 * 气候补偿：查询气候补偿曲线
 * @param {{ adjustmentMode?: string, intelligentAdjustment?: string }} params
 */
export async function queryWeatherCompensateCurve(params = {}) {
  const { adjustmentMode = '', intelligentAdjustment = '' } = params
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_WEATHER_COMPENSATE_CURVE, {
    adjustmentMode,
    intelligentAdjustment,
  })
}

/**
 * 气候补偿：保存温度档位
 * @param {number | string} gearPosition
 */
export async function saveWeatherCompensateGear(gearPosition) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SAVE_WEATHER_COMPENSATE_GEAR, {
    gearPosition: String(gearPosition ?? ''),
  })
}

/**
 * 气候补偿：保存室内温度设定
 * @param {number | string} indoorTemperature
 */
export async function saveIndoorTemperature(indoorTemperature) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SAVE_INDOOR_TEMPERATURE, {
    indoorTemperature: String(indoorTemperature ?? ''),
  })
}

/**
 * 气候补偿：保存曲线单点
 * @param {{ curveId: string | number, curvePoint: string | number, curveValue: string | number }} data
 */
export async function saveWeatherCompensateCurve(data) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SAVE_WEATHER_COMPENSATE_CURVE, {
    curveId: String(data?.curveId ?? ''),
    curvePoint: String(data?.curvePoint ?? ''),
    curveValue: String(data?.curveValue ?? ''),
  })
}

/** 气候补偿：查询24小时温度趋势 */
export async function queryTemp24hour() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_TEMP_24_HOUR, {})
}

/** 气候补偿：查询高级调节自定义曲线 */
export async function queryCustomizeCurve() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_CUSTOMIZE_CURVE, {})
}

/**
 * 气候补偿：保存高级调节自定义曲线
 * @param {{ curveData: Array<{curve:number[],name:string,id:string}>, use: string, useAdvancedAdjustment: string }} data
 */
export async function saveCustomizeCurve(data) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SAVE_CUSTOMIZE_CURVE, data ?? {})
}

/** 系统参数 — 项目系统类型：查询 */
export async function queryProjectData() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_PROJECT_DATA, {})
}

/**
 * 系统参数 — 项目系统类型：保存（下置 projectData）
 * @param {Record<string, string | number>} projectData
 */
export async function saveProjectData(projectData) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SAVE_PROJECT_DATA, { projectData })
}

/** 系统参数 — 循环泵台数：查询 */
export async function queryCirculationPump() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_CIRCULATION_PUMP, {})
}

/**
 * 系统参数 — 循环泵台数：保存（下置 projectData，成功后由业务层按需 queryRealvalByLongNames）
 * @param {Record<string, string | number>} projectData
 */
export async function saveCirculationPump(projectData) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SAVE_CIRCULATION_PUMP, { projectData })
}

/** 系统参数 — 主板类型：查询 */
export async function queryMotherboardData() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_MOTHERBOARD_DATA, {})
}

/**
 * 系统参数 — 主板类型：保存
 * @param {{ motherboard_model: string, id: string }} data
 */
export async function updateMotherboardData(data) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.UPDATE_MOTHERBOARD_DATA, data)
}

/** 系统参数 — 耦合能源：查询 */
export async function queryCoupleEnergy() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_COUPLE_ENERGY, {})
}

/**
 * 系统参数 — 耦合能源：保存
 * @param {{ coupleEnergyTypeId: string, id: string, projectId: string, coupleEnergyNumber: string }} coupleEnergy
 */
export async function saveCoupleEnergy(coupleEnergy) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SAVE_COUPLE_ENERGY, {
    coupleEnergy,
  })
}

/** 查询热泵批量控制下置点位配置 */
export async function queryUnifyWriteData() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_UNIFY_WRITE_DATA, {})
}

/**
 * 查询单台热泵数据
 * @param {{ code: string, alarm?: string, run?: string }} params
 */
export async function queryHeatPumpData(params) {
  const { code = 'No1', alarm = 'false', run = 'false' } = params ?? {}
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_HEAT_PUMP_DATA, {
    code,
    alarm,
    run,
  })
}

/** 查询热泵下拉选择项 */
export async function queryHeatPumpSelect() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_HEAT_PUMP_SELECT, {})
}

/**
 * 查询手动设备开关列表
 * @param {string} type - 设备类型（如 "热泵"、"热泵循环泵" 等）
 */
export async function queryManualSwitch(type) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_MANUAL_SWITCH, {
    type,
  })
}

/**
 * 基础设置 — 操作日志：查询
 * @param {{ start: string, end: string, page?: number, limit?: number }} params
 */
export async function readOperationLogs(params) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.READ_OPERATION_LOGS, params ?? {})
}

/** 基础设置 — 参数复位 */
export async function resetParameter() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.RESET_PARAMETER, {})
}

/** 基础设置 — 恢复出厂设置 */
export async function restoreOriginal() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.RESTORE_ORIGINAL, {})
}

/** 基础设置 — 重启 PLC：保存 EF 数据 */
export async function savePLCPointEFData() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SAVE_PLC_POINT_EF_DATA, {})
}

/** 基础设置 — 重启 PLC：下置 EF 数据 */
export async function writePLCPointEFData() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.WRITE_PLC_POINT_EF_DATA, {})
}
