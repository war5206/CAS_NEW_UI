import { HEAT_PUMP_STATUS } from '@/config/homeHeatPumps'
import { isOnValue } from '@/utils/realvalMap'

export function buildRuntimeStateText({ run = false, defrost = false, fault = false } = {}) {
  const parts = [run ? '运行' : '待机']
  if (defrost) {
    parts.push('化霜')
  }
  if (fault) {
    parts.push('故障')
  }
  return parts.join('/')
}

/** Comm_Status 为 1 / "1" 表示通讯正常 */
export function isCommStatusNormal(value) {
  return isOnValue(value)
}

/** Fault_Alarm=1，或 Comm_Status 非 1，均视为故障 */
export function hasRuntimeFault({ faultAlarm, commStatus, includeCommStatus = false } = {}) {
  if (isOnValue(faultAlarm)) {
    return true
  }

  if (!includeCommStatus) {
    return false
  }

  return !isCommStatusNormal(commStatus)
}

export function resolveHeatPumpStatusFromRuntime({
  alarm,
  run,
  state,
  defrost,
  commStatus,
  includeCommStatus = false,
} = {}) {
  if (hasRuntimeFault({ faultAlarm: alarm, commStatus, includeCommStatus })) {
    return HEAT_PUMP_STATUS.MALFUNCTION
  }

  if (defrost === true || String(state ?? '').trim().includes('化霜')) {
    return HEAT_PUMP_STATUS.DEFROSTING
  }

  if (isOnValue(run)) {
    return HEAT_PUMP_STATUS.RUNNING
  }

  return HEAT_PUMP_STATUS.SHUTDOWN
}

export function resolveRuntimeStatusFromPoints({ operation, defrosting, fault, commStatus } = {}) {
  const run = isOnValue(operation)
  const defrost = isOnValue(defrosting)
  const faultAlarm = isOnValue(fault)
  const hasFault = hasRuntimeFault({ faultAlarm, commStatus, includeCommStatus: true })
  const state = buildRuntimeStateText({ run, defrost, fault: hasFault })

  return {
    alarm: hasFault,
    run,
    defrost,
    state,
    status: resolveHeatPumpStatusFromRuntime({
      alarm: hasFault,
      run,
      state,
      defrost,
    }),
  }
}
