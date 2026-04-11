function toText(value, fallback) {
  if (value == null || value === '') {
    return fallback
  }
  return String(value)
}

export function createDefaultScreenData() {
  return {
    heatPumpCount: '0',
    systemMode: '异常',
    alertCount: '0',
    supplyWaterTemp: '0',
    returnWaterTemp: '0'
  }
}

export function adaptScreenData(rawData) {
  const fallback = createDefaultScreenData()
  // 处理统一返回结构 { code, data, msg, success }
  const responseData = rawData?.data ?? rawData
  const source = responseData?.data ?? responseData ?? {}

  return {
    heatPumpCount: toText(source.heatPumpNumber, fallback.heatPumpCount),
    systemMode: toText(source.runMode, fallback.systemMode),
    alertCount: toText(source.alarmNumber, fallback.alertCount),
    supplyWaterTemp: toText(source.supplyWaterTemperature, fallback.supplyWaterTemp),
    returnWaterTemp: toText(source.returnWaterTemperature, fallback.returnWaterTemp)
  }
}
