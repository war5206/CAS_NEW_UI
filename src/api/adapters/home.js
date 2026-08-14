import {
  HEAT_PUMP_GRID_ITEMS,
  HEAT_PUMP_GRID_COLS,
  HEAT_PUMP_GRID_ROWS,
  HEAT_PUMP_STATUS,
  getHeatPumpStatusSummary,
} from '@/config/homeHeatPumps'
import {
  getUnitDisplayName,
  parseUnitDeviceCodeLoose,
} from '@/config/projectUnitDevices'
import { createUnitDeviceDetailsFromParam } from '@/config/unitDeviceParamPoints'
import { isOnValue } from '@/utils/realvalMap'
import {
  buildRuntimeStateText,
  resolveHeatPumpStatusFromRuntime,
} from '@/utils/heatPumpRuntimeStatus'
import { adaptCouplingEnergyFromRealvalMap } from '@/config/couplingEnergyTypes'

const DEFAULT_TEMPERATURE_LABELS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const DEFAULT_SUPPLY_DATA = [42, 43, 44, 38, 37, 42, 43, 40, 36, 35]
const DEFAULT_RETURN_DATA = [31, 32, 33, 31, 30.5, 30.8, 31, 30.7, 30.2, 28]
const DEFAULT_TARGET_DATA = [31, 31.4, 31.8, 30.8, 30.9, 31, 30.8, 31, 31.2, 32]

function normalizeTempSeries(rawList, fallback) {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return fallback
  }
  return rawList.map((value) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  })
}

function normalizeHourLabels(rawList, fallback) {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return fallback
  }
  return rawList.map((item) => {
    const text = String(item ?? '')
    const hourPart = text.includes(':') ? text.split(':')[0] : text
    const parsed = Number(hourPart)
    return Number.isFinite(parsed) ? String(parsed) : text
  })
}

function normalizeRunModeValue(value) {
  if (value === null || value === undefined) return ''
  const text = String(value).trim()
  if (text === '0' || text === '1') return text
  try {
    const numeric = Number(text)
    if (!Number.isFinite(numeric)) return ''
    if (numeric === 1) return '1'
    if (numeric === 0) return '0'
    return ''
  } catch (error) {
    return ''
  }
}

function pickDefinedField(bags, keys) {
  for (const key of keys) {
    for (const bag of bags) {
      if (!bag || typeof bag !== 'object') continue
      if (Object.prototype.hasOwnProperty.call(bag, key)) {
        const value = bag[key]
        if (value !== null && value !== undefined && value !== '') {
          return value
        }
      }
    }
  }

  for (const key of keys) {
    for (const bag of bags) {
      if (!bag || typeof bag !== 'object') continue
      if (Object.prototype.hasOwnProperty.call(bag, key) && (bag[key] === 0 || bag[key] === '0')) {
        return bag[key]
      }
    }
  }

  return null
}

function resolveSystemOperatingMode(optional, source) {
  return pickDefinedField(
    [optional, source?.optional, source],
    ['systemOperatingMode', 'SystemOperatingMode', 'system_operating_mode'],
  )
}

function buildModePresentationFromOperatingMode(rawOperatingModeValue, fallbackModeName) {
  if (rawOperatingModeValue === null || rawOperatingModeValue === undefined || rawOperatingModeValue === '') {
    return { name: fallbackModeName, avatarType: 'A' }
  }

  // 0=智能模式，1=手动模式（与 ModeSelectPage / SystemOperatingMode 一致）
  if (isOnValue(rawOperatingModeValue)) {
    return { name: '手动模式运行中', avatarType: 'H' }
  }

  const normalized = normalizeRunModeValue(rawOperatingModeValue)
  if (normalized === '1') {
    return { name: '手动模式运行中', avatarType: 'H' }
  }
  if (normalized === '0') {
    return { name: '智能模式运行中', avatarType: 'A' }
  }

  return { name: fallbackModeName, avatarType: 'A' }
}

function buildModeIconsPresentation(hpTotalRunModeValue, qhbcValue) {
  const iconAVisible = hpTotalRunModeValue === '0' || hpTotalRunModeValue === '1'
  const iconASrc = hpTotalRunModeValue === '0' ? 'cooling' : 'heating'
  const iconBVisible = qhbcValue === '0' || qhbcValue === '1'
  const iconBBlue = qhbcValue === '1'
  return { iconAVisible, iconASrc, iconBVisible, iconBBlue }
}

function toNumberOrFallback(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toText(value, fallback) {
  if (value == null || value === '') {
    return fallback
  }

  return String(value)
}

function toBoolean(value, fallback) {
  if (typeof value === 'boolean') return value
  if (value == null || value === '') return fallback
  if (isOnValue(value)) return true
  if (value === 0 || value === false) return false

  const text = String(value).trim().toLowerCase()
  if (text === '0' || text === 'false' || text === 'off') return false

  const numeric = Number(text)
  if (Number.isFinite(numeric) && numeric === 0) return false

  return fallback
}

function normalizeHeatPumpStatus(value) {
  const normalizedValue = String(value || '').toLowerCase()

  if (['running', 'run', '1'].includes(normalizedValue)) return HEAT_PUMP_STATUS.RUNNING
  if (['malfunction', 'fault', 'error', '3'].includes(normalizedValue)) return HEAT_PUMP_STATUS.MALFUNCTION
  if (['defrosting', 'defrost', '2'].includes(normalizedValue)) return HEAT_PUMP_STATUS.DEFROSTING
  return HEAT_PUMP_STATUS.SHUTDOWN
}

function toHeatPumpLabelFromName(name, fallbackIndex) {
  const match = String(name ?? '').match(/\d+/)
  if (match) {
    return String(match[0]).padStart(2, '0')
  }
  return String(fallbackIndex).padStart(2, '0')
}

function createHeatPumpDetailsFromParam(heatPumpData = {}) {
  return createUnitDeviceDetailsFromParam(heatPumpData)
}

function buildFallbackLoopPumpItems() {
  return [
    { name: '水泵一', status: '运行中', tone: 'running' },
    { name: '水泵二', status: '已关闭', tone: 'off' },
    { name: '水泵三', status: '有故障', tone: 'fault' },
  ]
}

function pumpStateToPumpItem(name, stateText) {
  const normalized = String(stateText || '').trim()
  let tone = 'off'
  let status = '待机'
  if (normalized === '运行' || normalized === '开启') {
    tone = 'running'
    status = '运行中'
  } else if (normalized === '报警' || normalized === '故障') {
    tone = 'fault'
    status = '有故障'
  } else {
    tone = 'off'
    status = '待机'
  }
  return { name, status, tone }
}

function buildHeatPumpChartData(summary) {
  return [
    { name: '运行', value: summary.running, color: ['#3B9EFF', '#1F5FB8'] },
    { name: '待机', value: summary.shutdown, color: ['#9FAABD', '#69778E'] },
    { name: '化霜', value: summary.defrosting, color: ['#F4CE52', '#A77A1F'] },
    { name: '故障', value: summary.malfunction, color: ['#FF671E', '#A93600'] },
  ]
}

function adaptLoopPumpItems(items, fallbackItems) {
  if (!Array.isArray(items) || items.length === 0) {
    return fallbackItems
  }

  return items.map((item, index) => {
    const tone = item?.tone || (item?.status === '运行中' ? 'running' : item?.status === '有故障' ? 'fault' : 'off')
    return {
      name: toText(item?.name, `水泵${index + 1}`),
      status: toText(item?.status, tone === 'running' ? '运行中' : tone === 'fault' ? '有故障' : '已关闭'),
      tone,
    }
  })
}

function adaptHeatPumpItems(items, fallbackItems) {
  if (!Array.isArray(items) || items.length === 0) {
    return fallbackItems
  }

  return items.map((item, index) => {
    const unitId = parseUnitDeviceCodeLoose(item?.code) ?? parseUnitDeviceCodeLoose(item?.label) ?? item?.id
    const displayName =
      unitId != null ? getUnitDisplayName(unitId) : toText(item?.name, `热泵${index + 1}`)

    return {
      ...fallbackItems[index % fallbackItems.length],
      ...item,
      status: normalizeHeatPumpStatus(item?.status),
      label: displayName,
      name: displayName,
      details: Array.isArray(item?.details) ? item.details : fallbackItems[index % fallbackItems.length]?.details ?? [],
    }
  })
}

export function createDefaultSystemConfig() {
  return {
    systemTypeUuid: '1',
    terminalTypeUuid: '5',
    coupleEnergyTypeUuid: '',
  }
}

export function adaptSystemConfig(rawData) {
  const responseData = rawData?.data ?? rawData
  const projectData = responseData?.data?.projectData ?? responseData?.projectData ?? {}

  const couplingEnergyFromPlc = rawData?.couplingEnergyValueMap
    ? adaptCouplingEnergyFromRealvalMap(rawData.couplingEnergyValueMap)
    : null

  const coupleEnergyTypeUuid =
    couplingEnergyFromPlc?.typeId ??
    projectData.couple_energy_type_uuid ??
    projectData.coupleEnergyTypeUuid ??
    responseData?.data?.couple_energy_type_uuid ??
    responseData?.couple_energy_type_uuid ??
    ''

  return {
    systemTypeUuid: String(projectData.system_type_uuid ?? '1'),
    terminalTypeUuid: String(projectData.terminal_type_uuid ?? '5'),
    coupleEnergyTypeUuid: String(coupleEnergyTypeUuid),
  }
}

export function createDefaultHomeOverview() {
  const heatPumpItems = HEAT_PUMP_GRID_ITEMS
  const heatPumpSummary = getHeatPumpStatusSummary(heatPumpItems)
  const loopPumpItems = buildFallbackLoopPumpItems()

  return {
    fetchedAt: null,
    mode: {
      name: '智能模式运行中',
      savedCost: '222.7',
      ambientTempText: '-2.1C',
      avatarType: 'A',
      iconAVisible: true,
      iconASrc: 'heating',
      iconBVisible: true,
      iconBBlue: false,
    },
    cost: {
      note: '注：费用结算自 2026-01-15 至今',
      month: '108.13',
      today: '7.33',
      yesterday: '8.12',
    },
    system: {
      heatPumpSummary,
      outdoorTemp: '-2.1',
      condensatePipeTemp: '-2.1',
      heatTracingEnabled: false,
      couplingEnergyEnabled: true,
      waterPumpEnabled: true,
      supplyTemp: '-2.1',
      supplyPressure: '-2.1',
      returnPressure: '-2.1',
      returnTemp: '-2.1',
      circulationPumps: loopPumpItems,
      drainValveOpen: true,
      pressureTankOpen: true,
      pressureValveOpen: true,
      makeupPumps: [
        { name: '水泵一', status: '运行中', tone: 'running' },
        { name: '水泵二', status: '待机', tone: 'off' },
      ],
      waterTankLevel: '50',
      primarySupplyMainTemp: '',
      indoorTemperatures: [
        { name: '室内温度1', value: '0.0' },
        { name: '室内温度2', value: '0.0' },
        { name: '室内温度3', value: '0.0' },
        { name: '室内温度4', value: '0.0' },
        { name: '室内温度5', value: '0.0' },
      ],
      terminalCirculationPumps: [],
      targetBackwaterTemperature: '0.0℃',
    },
    temperature: {
      labels: DEFAULT_TEMPERATURE_LABELS,
      supplyData: DEFAULT_SUPPLY_DATA,
      returnData: DEFAULT_RETURN_DATA,
      targetData: DEFAULT_TARGET_DATA,
    },
    deviceStatus: {
      heatPumpData: buildHeatPumpChartData(heatPumpSummary),
      loopPumpItems,
    },
    heatPumpItems,
  }
}

export function createDefaultHomeTemperatureTrend() {
  return {
    labels: DEFAULT_TEMPERATURE_LABELS,
    supplyData: DEFAULT_SUPPLY_DATA,
    returnData: DEFAULT_RETURN_DATA,
    targetData: DEFAULT_TARGET_DATA,
  }
}

export function createDefaultHeatPumpArrange() {
  return Array.from({ length: HEAT_PUMP_GRID_ROWS * HEAT_PUMP_GRID_COLS }, (_, index) => {
    const row = Math.floor(index / HEAT_PUMP_GRID_COLS) + 1
    const col = (index % HEAT_PUMP_GRID_COLS) + 1
    return {
      key: `hp-empty-${row}-${col}`,
      id: null,
      row,
      col,
      status: HEAT_PUMP_STATUS.EMPTY,
      label: null,
      name: null,
      details: [],
    }
  })
}

export function adaptHeatPumpArrange(rawData) {
  const fallback = createDefaultHeatPumpArrange()
  const responseData = rawData?.data ?? rawData
  const source = responseData?.data ?? responseData ?? {}
  const heatPumpList = Array.isArray(source?.heatPump) ? source.heatPump : []

  if (heatPumpList.length === 0) {
    return fallback
  }

  const arrangedMap = new Map()

  heatPumpList.forEach((item, index) => {
    const row = toNumberOrFallback(item?.row, 1)
    const col = toNumberOrFallback(item?.column, 1)
    const safeRow = Math.min(Math.max(row, 1), HEAT_PUMP_GRID_ROWS)
    const safeCol = Math.min(Math.max(col, 1), HEAT_PUMP_GRID_COLS)
    const status = resolveHeatPumpStatusFromRuntime(item ?? {})
    const codeText = toText(item?.code, '')
    const unitId = parseUnitDeviceCodeLoose(codeText) ?? toNumberOrFallback(item?.id, index + 1)

    const displayName = `热泵${unitId}`

    arrangedMap.set(`${safeRow}-${safeCol}`, {
      key: `hp-${codeText || unitId}-${safeRow}-${safeCol}`,
      id: unitId,
      row: safeRow,
      col: safeCol,
      status,
      label: displayName,
      name: displayName,
      code: codeText,
      alarm: toBoolean(item?.alarm, false),
      run: toBoolean(item?.run, false),
      state: toText(item?.state, ''),
      details: [],
    })
  })

  return Array.from({ length: HEAT_PUMP_GRID_ROWS * HEAT_PUMP_GRID_COLS }, (_, index) => {
    const row = Math.floor(index / HEAT_PUMP_GRID_COLS) + 1
    const col = (index % HEAT_PUMP_GRID_COLS) + 1
    return arrangedMap.get(`${row}-${col}`) ?? {
      key: `hp-empty-${row}-${col}`,
      id: null,
      row,
      col,
      status: HEAT_PUMP_STATUS.EMPTY,
      label: null,
      name: null,
      details: [],
    }
  })
}

export function adaptHeatPumpParam(rawData, fallbackPump = {}) {
  const responseData = rawData?.data ?? rawData
  const source = responseData?.data ?? responseData ?? {}
  const heatPumpData = source?.heatPumpData ?? {}

  const alarm = toBoolean(source?.alarm, fallbackPump?.alarm ?? false)
  const run = toBoolean(source?.run, fallbackPump?.run ?? false)
  const defrost = toBoolean(source?.defrost, fallbackPump?.defrost ?? false)
  const rawState = toText(source?.state, fallbackPump?.state ?? '')
  const state = buildRuntimeStateText({ run, defrost, fault: alarm })

  return {
    ...fallbackPump,
    alarm,
    run,
    defrost,
    state,
    status: resolveHeatPumpStatusFromRuntime({ alarm, run, state: rawState, defrost }),
    details: createHeatPumpDetailsFromParam(heatPumpData, state),
  }
}

export function createDefaultHeatPumpOverviewPage() {
  return {
    list: [],
    pageNum: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  }
}

export function adaptHeatPumpOverviewPage(rawData) {
  const fallback = createDefaultHeatPumpOverviewPage()
  const responseData = rawData?.data ?? rawData
  const source = responseData?.data ?? responseData ?? {}
  const list = Array.isArray(source?.list) ? source.list : []

  return {
    list,
    pageNum: toNumberOrFallback(source?.pageNum, fallback.pageNum),
    pageSize: toNumberOrFallback(source?.pageSize, fallback.pageSize),
    total: toNumberOrFallback(source?.total, fallback.total),
    totalPages: Math.max(1, toNumberOrFallback(source?.totalPages, fallback.totalPages)),
  }
}

export function adaptHomeTemperatureTrend(rawData) {
  const fallback = createDefaultHomeTemperatureTrend()
  const responseData = rawData?.data ?? rawData
  const result = responseData?.data?.result ?? responseData?.result ?? {}

  const labels = normalizeHourLabels(result?.xList, fallback.labels)
  const supplyData = normalizeTempSeries(result?.supplyTempData?.yList, fallback.supplyData)
  const returnData = normalizeTempSeries(result?.backwaterTempData?.yList, fallback.returnData)
  const targetData = normalizeTempSeries(result?.targetBackwaterTempData?.yList, fallback.targetData)

  return {
    labels,
    supplyData,
    returnData,
    targetData,
  }
}

function scoreHomeOverviewPayload(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return -1

  let score = 0
  if (candidate.onlineHeatPump !== undefined) score += 10
  if (candidate.offlineHeatPump !== undefined) score += 5
  if (candidate.optional !== undefined) score += 4
  if (candidate.optional?.systemOperatingMode !== undefined) score += 8
  if (candidate.optional?.SystemOperatingMode !== undefined) score += 8
  if (candidate.userSupplyWaterTemperature !== undefined) score += 2
  if (candidate.userBackWaterTemperature !== undefined) score += 2
  if (candidate.supplyWaterPressure !== undefined) score += 2
  if (candidate.backWaterPressure !== undefined) score += 2
  if (candidate.system !== undefined) score += 1
  if (candidate.mode !== undefined) score += 1

  return score
}

/** 兼容算法编排多种返回结构：优先取含 onlineHeatPump / optional 的完整 payload，避免误选仅含静态 mode 的 result */
function extractHomeOverviewSource(rawData) {
  const envelope = rawData?.data ?? rawData
  if (!envelope || typeof envelope !== 'object') return {}

  const candidates = [
    envelope?.data,
    envelope?.data?.data,
    envelope,
    envelope?.result,
    envelope?.data?.result,
  ]

  let bestCandidate = null
  let bestScore = -1

  for (const candidate of candidates) {
    const score = scoreHomeOverviewPayload(candidate)
    if (score > bestScore) {
      bestScore = score
      bestCandidate = candidate
    }
  }

  if (bestCandidate && bestScore > 0) {
    return bestCandidate
  }

  return envelope?.data ?? envelope?.data?.result ?? envelope?.result ?? envelope ?? {}
}

function isNewHomeOverviewApi(source) {
  return (
    source.onlineHeatPump !== undefined ||
    source.offlineHeatPump !== undefined ||
    source.userSupplyWaterTemperature !== undefined ||
    source.userBackWaterTemperature !== undefined ||
    source.supplyWaterPressure !== undefined ||
    source.backWaterPressure !== undefined
  )
}

export function adaptHomeOverview(rawData) {
  const fallback = createDefaultHomeOverview()
  const source = extractHomeOverviewSource(rawData)

  if (isNewHomeOverviewApi(source)) {
    return adaptNewApiResponse(source, fallback)
  }

  const systemSource = source.system ?? {}
  const modeSource = source.mode ?? {}
  const costSource = source.cost ?? {}
  const temperatureSource = source.temperature ?? {}
  const heatPumpItems = adaptHeatPumpItems(source.heatPumpItems, fallback.heatPumpItems)
  const summarySource = source.heatPumpSummary ?? systemSource.heatPumpSummary ?? getHeatPumpStatusSummary(heatPumpItems)
  const loopPumpItems = adaptLoopPumpItems(source.loopPumpItems ?? systemSource.circulationPumps, fallback.deviceStatus.loopPumpItems)

  const heatPumpSummary = {
    running: toNumberOrFallback(summarySource.running, fallback.system.heatPumpSummary.running),
    shutdown: toNumberOrFallback(summarySource.shutdown, fallback.system.heatPumpSummary.shutdown),
    defrosting: toNumberOrFallback(summarySource.defrosting, fallback.system.heatPumpSummary.defrosting),
    malfunction: toNumberOrFallback(summarySource.malfunction, fallback.system.heatPumpSummary.malfunction),
  }

  const optional = source.optional ?? {}
  const systemOperatingMode = resolveSystemOperatingMode(optional, source)
  const operatingModePresentation =
    systemOperatingMode === null || systemOperatingMode === undefined || systemOperatingMode === ''
      ? null
      : buildModePresentationFromOperatingMode(systemOperatingMode, fallback.mode.name)

  return {
    fetchedAt: source.fetchedAt ?? rawData?.fetchedAt ?? null,
    mode: {
      name: operatingModePresentation?.name ?? toText(modeSource.name, fallback.mode.name),
      savedCost: toText(modeSource.savedCost, fallback.mode.savedCost),
      ambientTempText: toText(modeSource.ambientTempText, fallback.mode.ambientTempText),
      avatarType: operatingModePresentation?.avatarType ?? toText(modeSource.avatarType, fallback.mode.avatarType),
      iconAVisible: modeSource.iconAVisible ?? fallback.mode.iconAVisible,
      iconASrc: toText(modeSource.iconASrc, fallback.mode.iconASrc),
      iconBVisible: modeSource.iconBVisible ?? fallback.mode.iconBVisible,
      iconBBlue: modeSource.iconBBlue ?? fallback.mode.iconBBlue,
    },
    cost: {
      note: toText(costSource.note, fallback.cost.note),
      month: toText(costSource.month, fallback.cost.month),
      today: toText(costSource.today, fallback.cost.today),
      yesterday: toText(costSource.yesterday, fallback.cost.yesterday),
    },
    system: {
      heatPumpSummary,
      outdoorTemp: toText(systemSource.outdoorTemp, fallback.system.outdoorTemp),
      condensatePipeTemp: toText(systemSource.condensatePipeTemp, fallback.system.condensatePipeTemp),
      heatTracingEnabled: toBoolean(systemSource.heatTracingEnabled, fallback.system.heatTracingEnabled),
      couplingEnergyEnabled: toBoolean(systemSource.couplingEnergyEnabled, fallback.system.couplingEnergyEnabled),
      waterPumpEnabled: toBoolean(systemSource.waterPumpEnabled, fallback.system.waterPumpEnabled),
      supplyTemp: toText(systemSource.supplyTemp, fallback.system.supplyTemp),
      supplyPressure: toText(systemSource.supplyPressure, fallback.system.supplyPressure),
      returnPressure: toText(systemSource.returnPressure, fallback.system.returnPressure),
      returnTemp: toText(systemSource.returnTemp, fallback.system.returnTemp),
      circulationPumps: loopPumpItems,
      terminalCirculationPumps: adaptLoopPumpItems(systemSource.terminalCirculationPumps, []),
      drainValveOpen: toBoolean(systemSource.drainValveOpen, fallback.system.drainValveOpen),
      pressureTankOpen: toBoolean(systemSource.pressureTankOpen, fallback.system.pressureTankOpen),
      pressureValveOpen: toBoolean(systemSource.pressureValveOpen, fallback.system.pressureValveOpen),
      makeupPumps: adaptLoopPumpItems(systemSource.makeupPumps, fallback.system.makeupPumps),
      waterTankLevel: toText(systemSource.waterTankLevel, fallback.system.waterTankLevel),
      primarySupplyMainTemp: toText(systemSource.primarySupplyMainTemp, ''),
      indoorTemperatures: Array.isArray(systemSource.indoorTemperatures) ? systemSource.indoorTemperatures : fallback.system.indoorTemperatures,
      targetBackwaterTemperature: toText(systemSource.targetBackwaterTemperature, fallback.system.targetBackwaterTemperature),
    },
    temperature: {
      labels: Array.isArray(temperatureSource.labels) && temperatureSource.labels.length > 0 ? temperatureSource.labels : fallback.temperature.labels,
      supplyData: Array.isArray(temperatureSource.supplyData) && temperatureSource.supplyData.length > 0 ? temperatureSource.supplyData : fallback.temperature.supplyData,
      returnData: Array.isArray(temperatureSource.returnData) && temperatureSource.returnData.length > 0 ? temperatureSource.returnData : fallback.temperature.returnData,
      targetData: Array.isArray(temperatureSource.targetData) && temperatureSource.targetData.length > 0 ? temperatureSource.targetData : fallback.temperature.targetData,
    },
    deviceStatus: {
      heatPumpData: buildHeatPumpChartData(heatPumpSummary),
      loopPumpItems,
    },
    heatPumpItems,
  }
}

function adaptNewApiResponse(source, fallback) {
  const heatPumpSummary = {
    running: toNumberOrFallback(source.onlineHeatPump, 0),
    shutdown: toNumberOrFallback(source.offlineHeatPump, 0),
    defrosting: toNumberOrFallback(source.defrostHeatPump, 0),
    malfunction: toNumberOrFallback(source.alarmHeatPump, 0),
  }

  const circulationPumps = Array.isArray(source.heatCirculationPump)
    ? source.heatCirculationPump.map((p) => pumpStateToPumpItem(p.name, p.state))
    : fallback.system.circulationPumps

  const terminalCirculationPumps = Array.isArray(source.terminalCirculationPump)
    ? source.terminalCirculationPump.map((p) => pumpStateToPumpItem(p.name, p.state))
    : []

  const makeupPumps = [
    pumpStateToPumpItem('水泵一', source.replenishWaterPump1),
    pumpStateToPumpItem('水泵二', source.replenishWaterPump2),
  ]

  const indoorTemperatures = Array.isArray(source.terminalTemperature)
    ? source.terminalTemperature.map((t) => ({
        name: t.name,
        value: toText(t.value, '0.0'),
      }))
    : []

  const optional = source.optional ?? {}
  const ambientTemp = toText(source.ambientTemperature, fallback.system.outdoorTemp)
  const ambientTempText = `环境温度：${ambientTemp}℃`
  const systemOperatingMode = resolveSystemOperatingMode(optional, source)
  const hpTotalRunMode = normalizeRunModeValue(optional.hpTotalRunMode)
  const qhbcValue = normalizeRunModeValue(optional.qhbcValue)
  const modePresentation = buildModePresentationFromOperatingMode(systemOperatingMode, fallback.mode.name)
  const modeIconsPresentation = buildModeIconsPresentation(hpTotalRunMode, qhbcValue)

  const loopPumpItems = circulationPumps.length > 0 ? circulationPumps : fallback.deviceStatus.loopPumpItems

  return {
    fetchedAt: Date.now(),
    mode: {
      name: modePresentation.name,
      savedCost: toText(fallback.mode.savedCost, '0'),
      ambientTempText,
      avatarType: modePresentation.avatarType,
      iconAVisible: modeIconsPresentation.iconAVisible,
      iconASrc: modeIconsPresentation.iconASrc,
      iconBVisible: modeIconsPresentation.iconBVisible,
      iconBBlue: modeIconsPresentation.iconBBlue,
    },
    cost: fallback.cost,
    system: {
      heatPumpSummary,
      outdoorTemp: ambientTemp,
      condensatePipeTemp: toText(source.condensateWaterTemperature, '0'),
      heatTracingEnabled: toBoolean(source.tropicalCompanion, false),
      couplingEnergyEnabled: toBoolean(source.coupleEnergy, false),
      couplingEnergyName: toText(source.coupleEnergyName, ''),
      waterPumpEnabled: fallback.system.waterPumpEnabled,
      supplyTemp: toText(source.userSupplyWaterTemperature, '0'),
      supplyPressure: toText(source.supplyWaterPressure, '0'),
      returnPressure: toText(source.backWaterPressure, '0'),
      returnTemp: toText(source.userBackWaterTemperature, '0'),
      circulationPumps,
      terminalCirculationPumps,
      drainValveOpen: toBoolean(source.dirtSeparator, false),
      pressureTankOpen: fallback.system.pressureTankOpen,
      pressureValveOpen: toBoolean(source.pressureReliefValve, false),
      makeupPumps,
      waterTankLevel: toText(source.softenWaterTank, '0'),
      primarySupplyMainTemp: toText(source.onceSupplyWaterTemperature, ''),
      indoorTemperatures,
      targetBackwaterTemperature: toText(optional.targetBackwaterTemperature, '0.0℃'),
    },
    temperature: fallback.temperature,
    deviceStatus: {
      heatPumpData: buildHeatPumpChartData(heatPumpSummary),
      loopPumpItems,
    },
    heatPumpItems: fallback.heatPumpItems,
  }
}
