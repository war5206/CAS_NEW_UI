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
