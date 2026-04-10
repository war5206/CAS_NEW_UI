import { post } from '../client/http'
import { getApiBaseUrl, getAlgorithmProcessPath, ALGORITHM_PROCESS_IDS } from '../client/config'
import { adaptHomeOverview } from '../adapters/home'
import { adaptScreenData } from '../adapters/screen'
import { adaptSetOperationPasswordResponse, adaptLoginVerificationResponse } from '../adapters/auth'
import { adaptGuideResponse } from '../adapters/guide'

async function callAlgorithmProcess(algorithmProcessId, paramData = {}) {
  return post(getAlgorithmProcessPath(), {
    algorithmProcessId,
    param: {
      data: paramData
    }
  }, {
    baseUrl: getApiBaseUrl(),
    timeout: 10_000,
  })
}

export async function getHomeOverview() {
  const response = await callAlgorithmProcess(ALGORITHM_PROCESS_IDS.HOME_OVERVIEW, {})
  return {
    ...response,
    data: adaptHomeOverview(response.data)
  }
}

export async function queryScreenData() {
  const response = await callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SCREEN_DATA, {})
  return {
    ...response,
    data: adaptScreenData(response.data)
  }
}

/**
 * @param {string} operatePWD - new operation password
 * @param {{ adminPWD?: string }} [options] - omit for first-time setup; pass adminPWD for forgot-password / key reset
 */
export async function setOperationPassword(operatePWD, options) {
  const adminPWD = options?.adminPWD
  const paramData =
    adminPWD != null && adminPWD !== ''
      ? { adminPWD, operatePWD }
      : { operatePWD }
  const response = await callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SET_OPERATION_PASSWORD, paramData)
  return {
    ...response,
    data: adaptSetOperationPasswordResponse(response.data)
  }
}

export async function loginVerification(loginPWD) {
  const response = await callAlgorithmProcess(ALGORITHM_PROCESS_IDS.LOGIN_VERIFICATION, {
    loginPWD
  })
  return {
    ...response,
    data: adaptLoginVerificationResponse(response.data)
  }
}

export async function saveSystemConfig(projectData) {
  const response = await callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SAVE_SYSTEM_CONFIG, {
    projectData
  })
  return {
    ...response,
    data: adaptGuideResponse(response.data)
  }
}

export async function saveProjectConfig(projectData) {
  const response = await callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SAVE_PROJECT_CONFIG, {
    projectData
  })
  return {
    ...response,
    data: adaptGuideResponse(response.data)
  }
}

export async function saveAreaConfig(projectAreaId) {
  const response = await callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SAVE_AREA_CONFIG, {
    projectAreaId
  })
  return {
    ...response,
    data: adaptGuideResponse(response.data)
  }
}

export async function saveBeginCirculatingPumpConfig(projectData) {
  const response = await callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SAVE_BEGIN_CIRCULATING_PUMP_CONFIG, {
    projectData
  })
  return {
    ...response,
    data: adaptGuideResponse(response.data)
  }
}

export async function saveTerminalCirculatingPumpConfig(projectData) {
  const response = await callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SAVE_TERMINAL_CIRCULATING_PUMP_CONFIG, {
    projectData
  })
  return {
    ...response,
    data: adaptGuideResponse(response.data)
  }
}

export async function scanDeviceState(type = '') {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SCAN_DEVICE_STATE, { type })
}

export async function saveDeviceArrange(deviceArrange = []) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SAVE_DEVICE_ARRANGE, { deviceArrange })
}

export async function queryDeviceArrange() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_DEVICE_ARRANGE, {})
}

export async function queryEnergyPrice() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_ENERGY_PRICE, {})
}

/**
 * 保存电价方案（新增与编辑同一接口：编辑时传 clear 区间为原日期，若仅改时段可不传 clear，与方案日期一致即可）。
 * @param {object} payload
 * @param {string} payload.energyPricePlan - JSON 字符串：{ startMonth, endMonth, segments: [{ energyPriceName, unitPrice, startTime, endTime }] }
 * @param {string} [payload.clearStartMonth] - 删除明细用的开始月日 MM-DD；省略则与 energyPricePlan.startMonth 一致
 * @param {string} [payload.clearEndMonth] - 删除明细用的结束月日 MM-DD；省略则与 energyPricePlan.endMonth 一致
 */
export async function saveEnergyPricePlan(payload) {
  const response = await callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SAVE_ENERGY_PRICE_PLAN, payload)
  return {
    ...response,
    data: adaptGuideResponse(response.data),
  }
}

export async function scanSystemDevice() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SCAN_SYSTEM_DEVICE, { resultType: '' })
}

export async function setInitState() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SET_INIT_STATE, { initState: '1' })
}

export async function saveEnergyPrice(energyPrice = []) {
  const response = await callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SAVE_ENERGY_PRICE, {
    energyPrice,
  })
  return {
    ...response,
    data: adaptGuideResponse(response.data),
  }
}
