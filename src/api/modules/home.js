import { post } from '../client/http'
import { getApiBaseUrl, getAlgorithmProcessPath, ALGORITHM_PROCESS_IDS } from '../client/config'
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
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.HOME_OVERVIEW, {})
}

export async function queryTemp24Hour() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_TEMP_24_HOUR, {})
}

export async function queryHeatPumpArrange() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_HEAT_PUMP_ARRANGE, {})
}

export async function queryHeatPumpParam(paramData) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_HEAT_PUMP_PARAM, paramData)
}

export async function queryAllHeatPumpParam(paramData) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_ALL_HEAT_PUMP_PARAM, paramData)
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
    loginPWD,
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

/** 进入系统时查询初始化状态；data.lockStatus / data.initState 为字符串 */
export async function queryInitState() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_INIT_STATE, {})
}

export async function deviceUnlock(unlockPWD) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.DEVICE_UNLOCK, {
    unlockPWD
  })
}

export async function writeLockStatus(status = '1') {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.WRITE_REALVAL_BY_LONG_NAMES, {
    writeData: {
      'Sys\\FinforWorx\\LockStatus': status,
    }
  })
}

export async function querySystemConfig() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_SYSTEM_CONFIG, {})
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

export async function queryRealAlarm({ current = 1, grade = '', name = '' } = {}) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_REAL_ALARM, {
    current,
    grade,
    name,
  })
}

export async function handleRealAlarm(id) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.HANDLE_REAL_ALARM, { id })
}

export async function querySingleRealAlarm(id) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.SINGLE_REAL_ALARM, { id })
}

export async function queryHisAlarm({ current = 1, grade = '', name = '', startTime = '', endTime = '' } = {}) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_HIS_ALARM, {
    current,
    grade,
    name,
    startTime,
    endTime,
  })
}

export async function deleteHisAlarm(id) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.DELETE_HIS_ALARM, { id })
}

export async function deleteCurrentPageHisAlarm({ current = 1, grade = '', name = '', startTime = '', endTime = '' } = {}) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.DELETE_CURRENT_PAGE_HIS_ALARM, {
    current,
    grade,
    name,
    startTime,
    endTime,
  })
}

export async function queryFaultCodeSelect() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.FAULT_CODE_SELECT, {})
}

export async function queryFaultNameSelect() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.FAULT_NAME_SELECT, {})
}

export async function queryFaultTree({ code = '', name = '' } = {}) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_FAULT_TREE, {
    code,
    name,
  })
}

export async function giveAlarmOverview({ startDateTime = '', endDateTime = '', timeInterval = 'day' } = {}) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.GIVE_ALARM_OVERVIEW, {
    startDateTime,
    endDateTime,
    timeInterval,
  })
}

export async function giveAlarmTrend({ startDateTime = '', endDateTime = '', timeInterval = 'day', type = '' } = {}) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.GIVE_ALARM_TREND, {
    startDateTime,
    endDateTime,
    timeInterval,
    type,
  })
}

export async function giveAlarmHeatPumpNumber({ startDateTime = '', endDateTime = '', timeInterval = 'day', type = '热泵' } = {}) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.GIVE_ALARM_HEAT_PUMP_NUMBER, {
    startDateTime,
    endDateTime,
    timeInterval,
    type,
  })
}

export async function queryHeatPumpSelect() {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.QUERY_HEAT_PUMP_SELECT, {})
}

export async function giveAlarmHeatPumpDistribution({
  startDateTime = '',
  endDateTime = '',
  timeInterval = 'day',
  heatPump = '',
} = {}) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.GIVE_ALARM_HEAT_PUMP_DISTRIBUTION, {
    startDateTime,
    endDateTime,
    timeInterval,
    heatPump,
  })
}

export async function giveAlarmSystemDistribution({ startDateTime = '', endDateTime = '', timeInterval = 'day' } = {}) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.GIVE_ALARM_SYSTEM_DISTRIBUTION, {
    startDateTime,
    endDateTime,
    timeInterval,
  })
}

export async function giveAlarmDeviceDistribution({ startDateTime = '', endDateTime = '', timeInterval = 'day', device = '' } = {}) {
  return callAlgorithmProcess(ALGORITHM_PROCESS_IDS.GIVE_ALARM_DEVICE_DISTRIBUTION, {
    startDateTime,
    endDateTime,
    timeInterval,
    device,
  })
}
