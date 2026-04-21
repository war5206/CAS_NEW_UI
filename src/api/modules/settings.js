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
 * 查询手动设备开关列表
 * @param {string} type - 设备类型（如 "热泵"、"热泵循环泵" 等）
 */
export async function queryManualSwitch(type) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_MANUAL_SWITCH, {
    type,
  })
}
