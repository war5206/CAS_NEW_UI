import {
  getHomeUnitStatusGroups,
  LONG_NAME_HP_TOTAL_NUMBER,
} from './projectUnitDevices'
import {
  UNIT_DEVICE_STATUS_SUFFIX,
  getUnitDeviceStatusLongNames,
} from './unitDeviceParamPoints'

export { getHomeUnitStatusGroups, resolveBoardStatusDeviceIds } from './projectUnitDevices'

export const HEAT_PUMP_STATUS_POINT_SUFFIX = UNIT_DEVICE_STATUS_SUFFIX

export const HOME_UNIT_STATUS_GROUPS = getHomeUnitStatusGroups()

export function buildUnitStatusLongNames(startNo, count) {
  const longNames = []
  for (let index = 0; index < count; index += 1) {
    const pointNo = startNo + index
    const statusLongNames = getUnitDeviceStatusLongNames(pointNo)
    longNames.push(statusLongNames.operation, statusLongNames.defrosting, statusLongNames.fault, statusLongNames.commStatus)
  }
  return longNames
}

export function buildAllHomeUnitStatusLongNames({ heatPumpCount } = {}) {
  return buildHomeUnitStatusPollLongNames(heatPumpCount)
}

/** 首页状态轮询 longNames：含 HPTotalNumber + No1~NoN 状态点 */
export function buildHomeUnitStatusPollLongNames(heatPumpCount) {
  const groups = getHomeUnitStatusGroups({ heatPumpCount })
  const longNames = [LONG_NAME_HP_TOTAL_NUMBER]
  longNames.push(
    ...Object.values(groups).flatMap((group) => buildUnitStatusLongNames(group.startNo, group.count)),
  )
  return longNames
}

export function getUnitStatusPointLongNames(pointNo) {
  return getUnitDeviceStatusLongNames(pointNo)
}
