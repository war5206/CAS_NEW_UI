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

function adaptSmartTimerActionResponse(rawData) {
  const responseData = rawData?.data ?? rawData
  const source = responseData?.data ?? responseData ?? {}

  return {
    state: String(source?.state ?? ''),
    message: String(source?.message ?? ''),
    planId: source?.planId,
    enabled: source?.enabled,
  }
}

/**
 * 查询智能定时方案（含周期、时段、动作）
 * @param {{ enabled?: 0 | 1, page?: number, limit?: number }} [params]
 */
export async function querySmartTimerPlan(params = {}) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_SMART_TIMER_PLAN, params)
}

/**
 * 新增/编辑智能定时方案
 * @param {string} planJson - JSON.stringify(plan)，包含 id/name/enabled/cycles 等字段
 */
export async function saveSmartTimerPlan(planJson) {
  const response = await callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SAVE_SMART_TIMER_PLAN, {
    planJson,
  })
  return {
    ...response,
    data: adaptSmartTimerActionResponse(response?.data),
  }
}

/**
 * 软删除一个智能定时方案
 * @param {string | number} id
 */
export async function deleteSmartTimerPlan(id) {
  const response = await callAlgorithmProcess(ALGORITHM_PROCESS_IDS.DELETE_SMART_TIMER_PLAN, {
    id: String(id ?? ''),
  })
  return {
    ...response,
    data: adaptSmartTimerActionResponse(response?.data),
  }
}

/**
 * 切换智能定时方案启用状态
 * @param {{ id: string | number, enabled: boolean | 0 | 1 }} payload
 */
export async function toggleSmartTimerPlan({ id, enabled } = {}) {
  const response = await callAlgorithmProcess(ALGORITHM_PROCESS_IDS.TOGGLE_SMART_TIMER_PLAN, {
    id: String(id ?? ''),
    enabled: enabled === true || enabled === 1 || enabled === '1' ? 1 : 0,
  })
  return {
    ...response,
    data: adaptSmartTimerActionResponse(response?.data),
  }
}
