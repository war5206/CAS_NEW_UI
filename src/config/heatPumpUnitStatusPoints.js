import { AIR_COOLED_MODULE_START_NO } from './projectUnitDevices'
import {
  UNIT_DEVICE_STATUS_SUFFIX,
  getUnitDeviceStatusLongNames,
} from './unitDeviceParamPoints'

export const HEAT_PUMP_STATUS_POINT_SUFFIX = UNIT_DEVICE_STATUS_SUFFIX

export const HOME_UNIT_STATUS_GROUPS = {
  heatPump: {
    id: 'heat-pump',
    label: '热泵机组',
    startNo: 1,
    count: 13,
  },
  airCooledModule: {
    id: 'air-cooled-module',
    label: '风冷模块机组',
    startNo: AIR_COOLED_MODULE_START_NO,
    count: 12,
  },
}

export function buildUnitStatusLongNames(startNo, count) {
  const longNames = []
  for (let index = 0; index < count; index += 1) {
    const pointNo = startNo + index
    const statusLongNames = getUnitDeviceStatusLongNames(pointNo)
    longNames.push(statusLongNames.operation, statusLongNames.defrosting, statusLongNames.fault)
  }
  return longNames
}

export function buildAllHomeUnitStatusLongNames() {
  return Object.values(HOME_UNIT_STATUS_GROUPS).flatMap((group) => buildUnitStatusLongNames(group.startNo, group.count))
}

export function getUnitStatusPointLongNames(pointNo) {
  return getUnitDeviceStatusLongNames(pointNo)
}
