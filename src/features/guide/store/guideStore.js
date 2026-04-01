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

export const guideStore = {
  getState,
  setState,
  subscribe,
  setSystemTypeId,
  setSystemConfig,
  setProjectInfo,
}
