import { post } from '../client/http'
import { ALGORITHM_PROCESS_IDS, getAlgorithmProcessPath, getApiBaseUrl } from '../client/config'

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

export async function querySystemStateData() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.OPS_QUERY_SYSTEM_STATE_DATA, {})
}

export async function queryHeatPumpSingle(code = 'No1') {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.OPS_QUERY_HEAT_PUMP_SINGLE, { code })
}

export async function queryHeatPumpList() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.OPS_QUERY_HEAT_PUMP_LIST, {})
}

export async function querySystemConfigSingle(code = '模式选择') {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.OPS_QUERY_SYSTEM_CONFIG_SINGLE, { code })
}

export async function queryCurveByLongName({ start_time, end_time, longName }) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.OPS_QUERY_CURVE_BY_LONG_NAME, {
    start_time,
    end_time,
    longName,
  })
}

export async function querySystemType() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.OPS_QUERY_SYSTEM_TYPE, {})
}

export async function heatPumpOperatingTime(type) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.OPS_HEAT_PUMP_OPERATING_TIME, { type })
}
