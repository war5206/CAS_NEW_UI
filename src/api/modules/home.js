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

export async function setOperationPassword(adminPWD, operatePWD = '1234') {
  const response = await callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SET_OPERATION_PASSWORD, {
    adminPWD,
    operatePWD
  })
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
