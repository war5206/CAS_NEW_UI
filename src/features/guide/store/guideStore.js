// 系统选择与配置页面数据
let state = {
  // 系统选择与配置
  projectTypeId: '1',
  heatPump: '7',
  terminalTypeId: '1',
  systemTypeId: '1',
  coupleEnergyTypeId: '2',
  coupleEnergyNumber: '1',

  // 项目基本信息
  projectAcreage: '',
  coldAcreage: '',
  startHeatingSeason: '',
  endHeatingSeason: '',

  // 区域选择
  areaSelectedProvince: '江苏省',
  areaSelectedCity: '连云港市',

  // 热泵侧循环水泵配置
  heatCirculationPumpMain: '2',
  heatCirculationPumpSpare: '1',
  heatCirculationPumpMode: '定频',

  // 末端循环水泵配置
  terminalCirculationPumpMain: '1',
  terminalCirculationPumpSpare: '1',
  terminalCirculationPumpMode: '定频',
}

const listeners = new Set()

function getState() {
  return state
}

function setState(newState) {
  state = { ...state, ...newState }
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function setSystemTypeId(systemTypeId) {
  setState({ systemTypeId })
}

function setSystemConfig(config) {
  setState(config)
}

function setProjectInfo(info) {
  setState(info)
}

function setAreaSelection(selection) {
  setState(selection)
}

function setHeatPumpLoopPumpConfig(config) {
  setState(config)
}

function setTerminalLoopPumpConfig(config) {
  setState(config)
}

export const guideStore = {
  getState,
  setState,
  subscribe,
  setSystemTypeId,
  setSystemConfig,
  setProjectInfo,
  setAreaSelection,
  setHeatPumpLoopPumpConfig,
  setTerminalLoopPumpConfig,
}
