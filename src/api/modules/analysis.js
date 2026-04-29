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

export async function queryAnalysisOverviewSummary() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.ANALYSIS_OVERVIEW_SUMMARY, {})
}

export async function queryAnalysisOverviewCopBar(payload) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.ANALYSIS_OVERVIEW_COP_BAR, payload)
}

export async function queryAnalysisElectricityConsumption(payload) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.ANALYSIS_ELECTRICITY_CONSUMPTION, payload)
}

export async function queryAnalysisWaterConsumption(payload) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.ANALYSIS_WATER_CONSUMPTION, payload)
}

export async function queryAnalysisHeatProduction(payload) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.ANALYSIS_HEAT_PRODUCTION, payload)
}

export async function queryAnalysisExpense(payload) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.ANALYSIS_EXPENSE, payload)
}
