const API_BASE_URL_STORAGE_KEY = 'cas.apiBaseUrl'
const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.10.88:8090'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getStoredApiBaseUrl() {
  if (!canUseStorage()) {
    return DEFAULT_API_BASE_URL
  }

  return window.localStorage.getItem(API_BASE_URL_STORAGE_KEY) || DEFAULT_API_BASE_URL
}

export function setStoredApiBaseUrl(baseUrl) {
  if (!canUseStorage()) {
    return
  }

  const normalizedValue = String(baseUrl || '').trim()
  if (!normalizedValue) {
    window.localStorage.removeItem(API_BASE_URL_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(API_BASE_URL_STORAGE_KEY, normalizedValue)
}

export function getApiBaseUrl() {
  return getStoredApiBaseUrl()
}

export function getAlgorithmProcessPath() {
  return import.meta.env.VITE_ALGORITHM_PROCESS_PATH || '/FinforWorx/algorithm/process/execute'
}

// 算法过程 ID 常量
export const ALGORITHM_PROCESS_IDS = {
  HOME_OVERVIEW: 'queryHomePageDataNew',
  SCREEN_DATA: 'queryScreenData',
  SET_OPERATION_PASSWORD: 'setOperationPassword',
  LOGIN_VERIFICATION: 'loginVerification',
  SAVE_SYSTEM_CONFIG: 'saveSystemConfig',
  SAVE_PROJECT_CONFIG: 'saveProjectConfig',
  SAVE_AREA_CONFIG: 'saveAreaConfig',
  SAVE_BEGIN_CIRCULATING_PUMP_CONFIG: 'saveBeginCirculatingPumpConfig',
  SAVE_TERMINAL_CIRCULATING_PUMP_CONFIG: 'saveTerminalCirculatingPumpConfig',
  SCAN_DEVICE_STATE: 'scanDeviceState',
  SAVE_DEVICE_ARRANGE: 'saveDeviceArrange',
  QUERY_DEVICE_ARRANGE: 'queryDeviceArrange',
  SAVE_ENERGY_PRICE: 'saveEnergyPrice',
  QUERY_ENERGY_PRICE: 'queryEnergyPrice',
  /** 电价方案：新增/编辑合一（后端先按清除区间 DELETE 再批量 INSERT） */
  SAVE_ENERGY_PRICE_PLAN: 'saveEnergyPricePlan',
  SCAN_SYSTEM_DEVICE: 'scanSystemDevice',
  SET_INIT_STATE: 'setInitState',
  /** 进入系统：查询是否已完成初始化（initState：1 已初始化，0 需设密码等） */
  QUERY_INIT_STATE: 'queryInitState',
  DEVICE_UNLOCK: 'deviceUnlock',
  WRITE_REALVAL_BY_LONG_NAMES: 'writeRealvalByLongNames',
  QUERY_REALVAL_BY_LONG_NAMES: 'queryRealvalByLongNames',
  QUERY_MANUAL_SWITCH: 'queryManualSwitch',
  QUERY_SYSTEM_CONFIG: 'querySystemConfig',
  QUERY_TEMP_24_HOUR: 'queryTemp24hour',
  QUERY_HEAT_PUMP_ARRANGE: 'queryHeatPumpArrange',
  QUERY_HEAT_PUMP_PARAM: 'queryHeatPumpParam',
  QUERY_ALL_HEAT_PUMP_PARAM: 'queryAllHeatPumpParam',
  QUERY_UNIFY_WRITE_DATA: 'queryUnifyWriteData',
  QUERY_HEAT_PUMP_DATA: 'queryHeatPumpData',
  QUERY_REAL_ALARM: 'queryRealAlarm',
  HANDLE_REAL_ALARM: 'handleRealAlarm',
  SINGLE_REAL_ALARM: 'singleRealAlarm',
  QUERY_HIS_ALARM: 'queryHisAlarm',
  DELETE_HIS_ALARM: 'deleteHisAlarm',
  DELETE_CURRENT_PAGE_HIS_ALARM: 'deleteCurrentPageHisAlarm',
  FAULT_CODE_SELECT: 'faultCodeSelect',
  FAULT_NAME_SELECT: 'faultNameSelect',
  QUERY_FAULT_TREE: 'queryFaultTree',
  GIVE_ALARM_OVERVIEW: 'giveAlarmOverview',
  GIVE_ALARM_TREND: 'giveAlarmTrend',
  GIVE_ALARM_HEAT_PUMP_NUMBER: 'giveAlarmHeatPumpNumber',
  QUERY_HEAT_PUMP_SELECT: 'queryHeatPumpSelect',
  GIVE_ALARM_HEAT_PUMP_DISTRIBUTION: 'giveAlarmHeatPumpDistribution',
  GIVE_ALARM_SYSTEM_DISTRIBUTION: 'giveAlarmSystemDistribution',
  GIVE_ALARM_DEVICE_DISTRIBUTION: 'giveAlarmDeviceDistribution',
}
