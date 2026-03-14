import { useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts'
import SelectDropdown from '../components/SelectDropdown'
import TimePickerModal from '../components/TimePickerModal'
import dateIcon from '../assets/icons/date.svg'
import closeIcon from '../assets/icons/close.svg'
import { getStoredClimateMode } from '../utils/climateModeState'
import { getStoredEnergyPriceState } from '../utils/energyPriceState'
import { getStoredTemperatureMode } from '../utils/temperatureModeState'
import './OperationsSystemManagementPage.css'

const DATETIME_YEARS = Array.from({ length: 11 }, (_, index) => 2020 + index)
const DATETIME_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)
const DATETIME_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)
const DATETIME_HOURS = Array.from({ length: 24 }, (_, index) => index)
const DATETIME_MINUTES = Array.from({ length: 60 }, (_, index) => index)
const HOUR_IN_MS = 60 * 60 * 1000
const DAY_IN_MS = 24 * HOUR_IN_MS

const SETTING_OPTIONS = [
  { value: 'mode-select', label: '模式选择' },
  { value: 'climate-compensation', label: '气候补偿' },
  { value: 'smart-timer', label: '智能定时' },
  { value: 'smart-start-stop', label: '智能启停' },
  { value: 'peak-valley', label: '热电协同' },
  { value: 'coupling-energy', label: '耦合能源' },
  { value: 'heat-pump', label: '热泵' },
  { value: 'water-pump', label: '水泵' },
  { value: 'constant-pressure-pump', label: '定压泵' },
  { value: 'heat-trace', label: '伴热带' },
  { value: 'drain-valve', label: '排污阀' },
  { value: 'relief-valve', label: '泄压阀' },
  { value: 'project-system-type', label: '项目系统类型' },
  { value: 'energy-price', label: '能源价格' },
  { value: 'system', label: '系统' },
  { value: 'heat-pump-meter-1', label: '热泵电表1' },
  { value: 'heat-pump-meter-2', label: '热泵电表2' },
  { value: 'water-pump-meter', label: '水泵电表' },
  { value: 'water-heat-meter', label: '水表和热表' },
]
const UNIT_OPTIONS = Array.from({ length: 33 }, (_, index) => ({
  value: `heat-pump-${index + 1}`,
  label: `热泵${index + 1}`,
}))

const PROJECT_TYPE_OPTIONS = [
  { value: 'heating', label: '采暖' },
  { value: 'cooling-heating', label: '冷暖' },
  { value: 'hot-water', label: '热水' },
]

const TERMINAL_FORM_OPTIONS = [
  { value: 'floor-heating', label: '地暖' },
  { value: 'radiator', label: '暖气片' },
  { value: 'fan-coil', label: '风机盘管' },
]

const SYSTEM_TYPE_OPTIONS = [
  { value: 'primary', label: '一次系统' },
  { value: 'secondary', label: '二次系统' },
]

const REGION_OPTIONS = [
  {
    value: 'jiangsu',
    label: '江苏省',
    cities: [
      { value: 'nanjing', label: '南京市' },
      { value: 'lianyungang', label: '连云港市' },
      { value: 'suzhou', label: '苏州市' },
    ],
  },
  {
    value: 'zhejiang',
    label: '浙江省',
    cities: [
      { value: 'hangzhou', label: '杭州市' },
      { value: 'ningbo', label: '宁波市' },
    ],
  },
  {
    value: 'beijing',
    label: '北京市',
    cities: [
      { value: 'chaoyang', label: '朝阳区' },
      { value: 'haidian', label: '海淀区' },
    ],
  },
]

const COUPLING_ENERGY_TYPES = ['无耦合能源', '电锅炉', '燃气锅炉', '水源热泵', '风冷热泵']
const WATER_PUMP_MODE_STATES = ['定频', '变频']
const SYSTEM_RUNNING_MODE_STATES = ['手动模式', '智能模式']
const HEAT_PUMP_MODE_STATES = ['制冷模式', '制热模式']

const REGION_LABEL_MAP = REGION_OPTIONS.reduce((map, province) => {
  map[province.value] = province.label
  province.cities.forEach((city) => {
    map[city.value] = city.label
  })
  return map
}, {})

const PROJECT_SYSTEM_DEFAULTS = {
  projectType: 'cooling-heating',
  terminalForm: 'floor-heating',
  systemType: 'primary',
  province: 'jiangsu',
  city: 'lianyungang',
  heatPumpCount: '33',
}

const COUPLING_ENERGY_DEFAULTS = {
  type: '电锅炉',
  count: '2',
}

const LOOP_PUMP_DEFAULTS = {
  mainPumpCount: '2',
  standbyPumpCount: '1',
}

const SMART_TIMER_TEMPERATURES = ['35', '34', '33', '32', '31', '30', '29', '28', '27', '26', '25', '24']
const SMART_TIMER_ENABLED = [true, true, true, false, false, false, false, false, false, false, false, false]

const SYSTEM_STATUS_ITEMS = [
  { key: 'hp-pump-1', label: '热泵循环泵1号运行反馈', value: '运行', unit: 'state', chartType: 'state' },
  { key: 'hp-pump-2', label: '热泵循环泵2号运行反馈', value: '运行', unit: 'state', chartType: 'state' },
  { key: 'hp-pump-3', label: '热泵循环泵3号运行反馈', value: '待机', unit: 'state', chartType: 'state' },
  { key: 'liquid-pump-1', label: '补水泵1运行反馈', value: '运行', unit: 'state', chartType: 'state' },
  { key: 'liquid-pump-2', label: '补水泵2运行反馈', value: '待机', unit: 'state', chartType: 'state' },
  { key: 'supply-pressure', label: '供水压力', value: '185.2 kPa', unit: 'kPa', chartType: 'pressure' },
  { key: 'return-pressure', label: '回水压力', value: '235.2 kPa', unit: 'kPa', chartType: 'pressure' },
  { key: 'primary-temp', label: '一次侧供水总管温度', value: '32.6 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'user-supply-temp', label: '用户侧供水总管温度', value: '32.7 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'user-return-temp', label: '用户测回水总管温度', value: '32.3 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'condense-pipe-temp', label: '冷凝水管道温度', value: '42 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'temperature', label: '温度', value: '0.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'humidity', label: '湿度', value: '0.0 %', unit: '%', chartType: 'humidity' },
  { key: 'noise', label: '噪声', value: '0.0 db', unit: 'db', chartType: 'noise' },
  { key: 'wind-level', label: '风向档位', value: '0.0', unit: '', chartType: 'gear' },
  { key: 'wind-angle', label: '风向角度', value: '0.0 °', unit: '°', chartType: 'angle' },
]

const UNIT_ITEMS = [
  { key: 'communication', label: '通讯状态', value: '开启', unit: 'switch', chartType: 'switch' },
  { key: 'fault-code', label: '总故障代码', value: '0.0', unit: '', chartType: 'fault' },
  { key: 'inlet-temp', label: '进水温度', value: '30.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'outlet-temp', label: '出水温度', value: '30.0℃', unit: '℃', chartType: 'temperature' },
  { key: 'ambient-temp', label: '环境温度', value: '18.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'exhaust-temp-1', label: '排气温度1', value: '24.0℃', unit: '℃', chartType: 'temperature' },
  { key: 'return-air-temp-1', label: '回气温度1', value: '13.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'outer-coil-temp-1', label: '外盘管温度1', value: '12.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'inner-coil-temp-1', label: '内盘管温度1', value: '21.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'eco-in-temp-1', label: '经济器进口温度1', value: '18.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'eco-out-temp-1', label: '经济器出口温度1', value: '18.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'compressor-current-1', label: '压缩机1电流', value: '0.0 A', unit: 'A', chartType: 'current' },
  { key: 'main-valve-open-1', label: '主阀1开度', value: '0.0', unit: '', chartType: 'opening' },
  { key: 'main-valve-open-2', label: '主阀1开度', value: '15.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'aux-valve-open-1', label: '辅阀1开度', value: '0.0', unit: '', chartType: 'opening' },
  { key: 'exhaust-temp-2', label: '排气温度2', value: '24.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'return-air-temp-2', label: '回气温度2', value: '13.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'outer-coil-temp-2', label: '外盘管温度2', value: '18.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'inner-coil-temp-2', label: '内盘管温度2', value: '23.0 ℃', unit: '℃', chartType: 'temperature' },
  { key: 'eco-in-temp-2', label: '经济器进口温度2', value: '17.0 ℃', unit: '℃', chartType: 'temperature' },
]

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function getCurrentDateTimeParts() {
  const now = new Date()
  return [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()]
}

function getDefaultTrendTimeRange() {
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - DAY_IN_MS)

  return {
    startTime: normalizeDateTime(
      `${startDate.getFullYear()}-${padNumber(startDate.getMonth() + 1)}-${padNumber(startDate.getDate())} ${padNumber(startDate.getHours())}:${padNumber(startDate.getMinutes())}`,
    ),
    endTime: normalizeDateTime(
      `${endDate.getFullYear()}-${padNumber(endDate.getMonth() + 1)}-${padNumber(endDate.getDate())} ${padNumber(endDate.getHours())}:${padNumber(endDate.getMinutes())}`,
    ),
  }
}

function parseDateTime(value) {
  if (!value) {
    return getCurrentDateTimeParts()
  }

  const [datePart = '', timePart = '00:00'] = value.split(' ')
  const [year = 2024, month = 6, day = 1] = datePart.split('-').map(Number)
  const [hour = 0, minute = 0] = timePart.split(':').map(Number)
  return [year, month, day, hour, minute]
}

function formatDateTimeParts(value) {
  const [year, month, day, hour, minute] = value
  return `${year}.${padNumber(month)}.${padNumber(day)} ${padNumber(hour)}:${padNumber(minute)}:00`
}

function normalizeDateTime(value) {
  const [year, month, day, hour, minute] = parseDateTime(value)
  return `${year}-${padNumber(month)}-${padNumber(day)} ${padNumber(hour)}:${padNumber(minute)}`
}

function formatSeriesLabel(timestamp, span) {
  const monthDay = `${padNumber(timestamp.getMonth() + 1)}-${padNumber(timestamp.getDate())}`
  const hourMinute = `${padNumber(timestamp.getHours())}:${padNumber(timestamp.getMinutes())}`

  if (span <= DAY_IN_MS) {
    return hourMinute
  }

  if (span <= DAY_IN_MS * 2) {
    return `${monthDay} ${hourMinute}`
  }

  return monthDay
}

function getSeriesPointCount(span) {
  if (span <= 0) {
    return 1
  }

  if (span <= DAY_IN_MS) {
    return Math.min(24, Math.max(2, Math.round(span / HOUR_IN_MS) + 1))
  }

  return Math.min(31, Math.max(2, Math.round(span / DAY_IN_MS) + 1))
}

function createEnumMetric(key, label, value, chartStates, unit = '状态') {
  return {
    key,
    label,
    value,
    unit,
    chartType: 'enum',
    chartStates,
  }
}

function createSwitchMetric(key, label, enabled) {
  return createEnumMetric(key, label, enabled ? '开启' : '关闭', ['关闭', '开启'], '开关')
}

function createValueMetric(key, label, value, unit = '', chartType = 'number') {
  return {
    key,
    label,
    value,
    unit,
    chartType,
  }
}

function findOptionLabel(options, value, fallback = '--') {
  return options.find((item) => item.value === value)?.label ?? fallback
}

function buildModeSelectItems() {
  const climateMode = getStoredClimateMode()
  const heatPumpMode = getStoredTemperatureMode()

  return [
    createEnumMetric('run-mode', '系统运行模式', '智能模式', SYSTEM_RUNNING_MODE_STATES, '模式'),
    createSwitchMetric('climate-comp-enabled', '气候补偿功能', climateMode === 'climate'),
    createSwitchMetric('smart-timer-enabled', '智能定时模式', true),
    createSwitchMetric('smart-start-enabled', '智能启停功能', true),
    createSwitchMetric('peak-valley-enabled', '热电协同功能', true),
    createSwitchMetric('coupling-energy-enabled', '耦合能源功能', true),
    createSwitchMetric('terminal-linkage-enabled', '末端联动功能', true),
    createSwitchMetric('heat-pump-protect-enabled', '热泵长时间运行保护功能', true),
    createEnumMetric(
      'heat-pump-total-mode',
      '热泵总运行模式',
      heatPumpMode === 'cooling' ? '制冷模式' : '制热模式',
      HEAT_PUMP_MODE_STATES,
      '模式',
    ),
  ]
}

function buildClimateCompensationItems() {
  const heatPumpMode = getStoredTemperatureMode()
  const targetReturnTemp = heatPumpMode === 'cooling' ? '18.0 ℃' : '24.0 ℃'

  return [
    createValueMetric('target-return-temp', '目标回水温度', targetReturnTemp, '℃', 'temperature'),
    createValueMetric('constant-return-temp', '定温回水温度', '10.0 ℃', '℃', 'temperature'),
  ]
}

function buildSmartTimerItems() {
  const temperatureItems = SMART_TIMER_TEMPERATURES.map((value, index) =>
    createValueMetric(
      `smart-timer-temp-${index + 1}`,
      `定时段${index + 1}定温回水温度设定`,
      `${value}.0 ℃`,
      '℃',
      'temperature',
    ),
  )

  const enabledItems = SMART_TIMER_ENABLED.map((enabled, index) =>
    createSwitchMetric(`smart-timer-enabled-${index + 1}`, `定时段${index + 1}使能`, enabled),
  )

  return [...temperatureItems, ...enabledItems]
}

function buildSmartStartStopItems() {
  return [
    createValueMetric('smart-start-temp-diff', '加减载温差', '10.0 ℃', '℃', 'temperature'),
    createValueMetric('smart-start-load-cycle', '加载周期', '10 分钟', '分钟', 'duration'),
    createValueMetric('smart-start-unload-cycle', '减载周期', '10 分钟', '分钟', 'duration'),
    createValueMetric('smart-start-min-freq', '最低频率', '5 Hz', 'Hz', 'frequency'),
    createValueMetric('smart-start-max-freq', '最高频率', '14 Hz', 'Hz', 'frequency'),
    createValueMetric('smart-start-cooling-diff', '制冷温差设定', '10.0 ℃', '℃', 'temperature'),
  ]
}

function buildPeakValleyItems() {
  return [
    createValueMetric('peak-valley-compensation', '蓄能补偿值', '2', '', 'number'),
    createValueMetric('peak-valley-charge', '蓄热值', '95 分钟', '分钟', 'duration'),
    createValueMetric('peak-valley-release', '放热值', '95 分钟', '分钟', 'duration'),
    createValueMetric('peak-valley-expense-rate', '费用倍率值', '50 %', '%', 'percentage'),
  ]
}

function buildCouplingEnergyItems() {
  return [
    createEnumMetric(
      'coupling-energy-type',
      '耦合能源类型',
      COUPLING_ENERGY_DEFAULTS.type,
      COUPLING_ENERGY_TYPES,
      '类型',
    ),
    createValueMetric('coupling-energy-count', '耦合能源台数', `${COUPLING_ENERGY_DEFAULTS.count} 台`, '台', 'count'),
  ]
}

function buildHeatPumpSettingItems() {
  return [
    createValueMetric('heat-pump-protect-judge', '热泵持续运行保护判断时长', '5 h', 'h', 'duration'),
    createValueMetric('heat-pump-protect-stop', '热泵运行保护停机时长', '5 min', 'min', 'duration'),
    createValueMetric('heat-pump-running-count', '机组正在运行台数', '2 台', '台', 'count'),
    createValueMetric('heat-pump-min-runtime', '热泵最小运行时长', '10 min', 'min', 'duration'),
  ]
}

function buildWaterPumpItems() {
  return [
    createSwitchMetric('loop-pump-1-switch', '热泵循环泵1号开关', true),
    createSwitchMetric('loop-pump-2-switch', '热泵循环泵2号开关', false),
    createSwitchMetric('loop-pump-3-switch', '热泵循环泵3号开关', false),
    createValueMetric('loop-pump-main-count', '热泵循环泵主泵台数', `${LOOP_PUMP_DEFAULTS.mainPumpCount} 台`, '台', 'count'),
    createValueMetric('loop-pump-standby-count', '热泵循环泵备泵台数', `${LOOP_PUMP_DEFAULTS.standbyPumpCount} 台`, '台', 'count'),
    createEnumMetric('loop-pump-mode', '运行模式', '变频', WATER_PUMP_MODE_STATES, '模式'),
    createSwitchMetric('loop-pump-saving', '热泵循环泵间隔循环节能功能', false),
    createValueMetric('loop-pump-start-interval', '热泵循环泵间隔启动时间', '10 分钟', '分钟', 'duration'),
    createValueMetric('loop-pump-stop-interval', '热泵循环泵间隔停止时间', '10 分钟', '分钟', 'duration'),
    createValueMetric('loop-pump-rotation-time', '热泵循环泵轮值时间', '72 天', '天', 'duration'),
  ]
}

function buildConstantPressurePumpItems() {
  return [
    createSwitchMetric('constant-pressure-pump-1', '定压泵1手动开关', true),
    createSwitchMetric('constant-pressure-pump-2', '定压泵2手动开关', false),
    createValueMetric('constant-pressure-start', '定压泵启动压力', '10.0 kPa', 'kPa', 'pressure'),
    createValueMetric('constant-pressure-stop', '定压泵停止压力', '20.0 kPa', 'kPa', 'pressure'),
  ]
}

function buildHeatTraceItems() {
  return [
    createSwitchMetric('heat-trace-manual', '伴热带手动开关', false),
    createValueMetric('heat-trace-start-temp', '伴热带启动温度设置', '10.0 ℃', '℃', 'temperature'),
    createValueMetric('heat-trace-stop-temp', '伴热带关闭温度设置', '10.0 ℃', '℃', 'temperature'),
    createValueMetric('heat-trace-delay-close', '延时关闭时间', '10 分钟', '分钟', 'duration'),
  ]
}

function buildDrainValveItems() {
  return [
    createSwitchMetric('drain-valve-manual', '排污阀手动开关', false),
    createValueMetric('drain-valve-cycle', '排污周期（天）', '5 天', '天', 'duration'),
    createValueMetric('drain-valve-time', '排污时间点', '08:00', '', 'timepoint'),
    createValueMetric('drain-valve-duration', '排污持续时间（s）', '10 s', 's', 'duration'),
  ]
}

function buildReliefValveItems() {
  return [
    createSwitchMetric('relief-valve-manual', '泄压阀手动开关', false),
    createValueMetric('relief-valve-start', '泄压阀启动压力', '10.0 kPa', 'kPa', 'pressure'),
    createValueMetric('relief-valve-stop', '泄压阀停止压力', '10.0 kPa', 'kPa', 'pressure'),
  ]
}

function buildProjectSystemTypeItems() {
  const areaLabel = `${REGION_LABEL_MAP[PROJECT_SYSTEM_DEFAULTS.province]} / ${REGION_LABEL_MAP[PROJECT_SYSTEM_DEFAULTS.city]}`

  return [
    createEnumMetric(
      'project-type',
      '项目类型',
      findOptionLabel(PROJECT_TYPE_OPTIONS, PROJECT_SYSTEM_DEFAULTS.projectType),
      PROJECT_TYPE_OPTIONS.map((item) => item.label),
      '类型',
    ),
    createEnumMetric(
      'terminal-form',
      '末端形式',
      findOptionLabel(TERMINAL_FORM_OPTIONS, PROJECT_SYSTEM_DEFAULTS.terminalForm),
      TERMINAL_FORM_OPTIONS.map((item) => item.label),
      '类型',
    ),
    createEnumMetric(
      'system-type',
      '系统类型',
      findOptionLabel(SYSTEM_TYPE_OPTIONS, PROJECT_SYSTEM_DEFAULTS.systemType),
      SYSTEM_TYPE_OPTIONS.map((item) => item.label),
      '类型',
    ),
    createEnumMetric('project-area', '区域', areaLabel, Object.values(REGION_LABEL_MAP), '区域'),
    createValueMetric('project-heat-pump-count', '热泵总台数', `${PROJECT_SYSTEM_DEFAULTS.heatPumpCount} 台`, '台', 'count'),
  ]
}

function buildEnergyPriceItems() {
  const energyPriceState = getStoredEnergyPriceState()
  const electricityItems = energyPriceState.electricPlans.flatMap((plan, planIndex) =>
    plan.segments.map((segment, segmentIndex) =>
      createValueMetric(
        `energy-price-electric-${plan.id}-${segmentIndex}`,
        `电价${planIndex + 1}-${segmentIndex + 1}`,
        `${segment.start}-${segment.end} / ${segment.price || '--'} 元/kWh`,
        '元/kWh',
        'price',
      ),
    ),
  )

  return [
    ...electricityItems,
    createValueMetric('energy-price-water', '水价', `${energyPriceState.waterFixed} 元/m³`, '元/m³', 'price'),
    createValueMetric('energy-price-gas', '气价', `${energyPriceState.gasFixed} 元/m³`, '元/m³', 'price'),
  ]
}

function buildSystemItems() {
  return [
    createSwitchMetric('system-power', '系统开关机', true),
    createValueMetric('system-indoor-avg-1d', '一天的室内温度平均值', '22.6 ℃', '℃', 'temperature'),
    createValueMetric('system-indoor-avg-3d', '三天的室内温度平均值', '22.3 ℃', '℃', 'temperature'),
    createValueMetric('system-heating-season-avg', '采暖季累计的室内平均值', '21.8 ℃', '℃', 'temperature'),
    createValueMetric('system-cooling-season-avg', '制冷季累计的室内平均值', '25.4 ℃', '℃', 'temperature'),
  ]
}

function buildPowerMeterItems(prefix) {
  return [
    createValueMetric(`${prefix}-voltage-a`, 'A相电压', '381 V', 'V', 'voltage'),
    createValueMetric(`${prefix}-voltage-b`, 'B相电压', '384 V', 'V', 'voltage'),
    createValueMetric(`${prefix}-voltage-c`, 'C相电压', '379 V', 'V', 'voltage'),
    createValueMetric(`${prefix}-current-a`, 'A相电流', '16.2 A', 'A', 'current'),
    createValueMetric(`${prefix}-current-b`, 'B相电流', '15.8 A', 'A', 'current'),
    createValueMetric(`${prefix}-current-c`, 'C相电流', '16.5 A', 'A', 'current'),
    createValueMetric(`${prefix}-power-a`, 'A相功率', '6.2 kW', 'kW', 'power'),
    createValueMetric(`${prefix}-power-b`, 'B相功率', '6.0 kW', 'kW', 'power'),
    createValueMetric(`${prefix}-power-c`, 'C相功率', '6.4 kW', 'kW', 'power'),
    createValueMetric(`${prefix}-energy-total`, '累计耗电量', '12850.0 kWh', 'kWh', 'energy'),
  ]
}

function buildWaterHeatMeterItems() {
  return [
    createValueMetric('water-meter-total-flow', '水表累计流量', '3256.0 m³', 'm³', 'flow'),
    createValueMetric('heat-meter-supply-temp', '热表供水温度', '38.6 ℃', '℃', 'temperature'),
    createValueMetric('heat-meter-return-temp', '热表回水温度', '31.4 ℃', '℃', 'temperature'),
    createValueMetric('heat-meter-power', '热表功率', '186.0 kW', 'kW', 'power'),
    createValueMetric('heat-meter-flow', '热表瞬时流量', '18.5 m³/h', 'm³/h', 'flow'),
    createValueMetric('heat-meter-total-flow', '热表累计流量', '4980.0 m³', 'm³', 'flow'),
    createValueMetric('heat-meter-total-heat', '热表累计热量', '12680.0 kWh', 'kWh', 'energy'),
    createValueMetric('heat-meter-total-cool', '热表累计冷量', '9320.0 kWh', 'kWh', 'energy'),
  ]
}

function buildSystemSettingItems(settingKey) {
  switch (settingKey) {
    case 'mode-select':
      return buildModeSelectItems()
    case 'climate-compensation':
      return buildClimateCompensationItems()
    case 'smart-timer':
      return buildSmartTimerItems()
    case 'smart-start-stop':
      return buildSmartStartStopItems()
    case 'peak-valley':
      return buildPeakValleyItems()
    case 'coupling-energy':
      return buildCouplingEnergyItems()
    case 'heat-pump':
      return buildHeatPumpSettingItems()
    case 'water-pump':
      return buildWaterPumpItems()
    case 'constant-pressure-pump':
      return buildConstantPressurePumpItems()
    case 'heat-trace':
      return buildHeatTraceItems()
    case 'drain-valve':
      return buildDrainValveItems()
    case 'relief-valve':
      return buildReliefValveItems()
    case 'project-system-type':
      return buildProjectSystemTypeItems()
    case 'energy-price':
      return buildEnergyPriceItems()
    case 'system':
      return buildSystemItems()
    case 'heat-pump-meter-1':
      return buildPowerMeterItems('heat-pump-meter-1')
    case 'heat-pump-meter-2':
      return buildPowerMeterItems('heat-pump-meter-2')
    case 'water-pump-meter':
      return buildPowerMeterItems('water-pump-meter')
    case 'water-heat-meter':
      return buildWaterHeatMeterItems()
    default:
      return buildModeSelectItems()
  }
}

function formatTimePointValue(totalMinutes) {
  const safeMinutes = Math.min(24 * 60, Math.max(0, Math.round(Number(totalMinutes) || 0)))
  const hour = Math.floor(safeMinutes / 60)
  const minute = safeMinutes % 60
  return `${padNumber(hour)}:${padNumber(minute)}`
}

function createRandomSeries(metric, rangeStart, rangeEnd, _revision = 0) {
  void _revision
  const startDate = new Date(rangeStart.replace(' ', 'T'))
  const endDate = new Date(rangeEnd.replace(' ', 'T'))
  const totalSpan = Math.max(0, endDate.getTime() - startDate.getTime())
  const total = getSeriesPointCount(totalSpan)
  const points = []

  const ranges = {
    temperature: { min: 18, max: 45, decimals: 1 },
    pressure: { min: 160, max: 260, decimals: 1 },
    humidity: { min: 25, max: 95, decimals: 1 },
    noise: { min: 20, max: 70, decimals: 1 },
    current: { min: 0, max: 25, decimals: 1 },
    voltage: { min: 360, max: 410, decimals: 1 },
    energy: { min: 900, max: 1500, decimals: 1 },
    power: { min: 5200, max: 7600, decimals: 1 },
    flow: { min: 5, max: 80, decimals: 1 },
    count: { min: 0, max: 40, decimals: 0 },
    price: { min: 0.2, max: 1.2, decimals: 2 },
    duration: { min: 0, max: 120, decimals: 0 },
    frequency: { min: 0, max: 20, decimals: 0 },
    percentage: { min: 0, max: 100, decimals: 0 },
    timepoint: { min: 0, max: 24 * 60, decimals: 0 },
    opening: { min: 0, max: 100, decimals: 1 },
    angle: { min: 0, max: 360, decimals: 1 },
    gear: { min: 0, max: 5, decimals: 0 },
    fault: { min: 0, max: 8, decimals: 0 },
    state: { min: 0, max: 1, decimals: 0 },
    switch: { min: 0, max: 1, decimals: 0 },
    mode: { min: 0, max: 2, decimals: 0 },
  }

  const range =
    metric.chartType === 'enum'
      ? { min: 0, max: Math.max(1, (metric.chartStates?.length ?? 2) - 1), decimals: 0 }
      : ranges[metric.chartType] ?? { min: 0, max: 50, decimals: 1 }

  for (let index = 0; index < total; index += 1) {
    const ratio = total === 1 ? 0 : index / (total - 1)
    const timestamp = new Date(startDate.getTime() + totalSpan * ratio)
    const rawValue = range.min + Math.random() * (range.max - range.min)
    const value =
      range.decimals === 0 ? Math.round(rawValue) : Number(rawValue.toFixed(range.decimals))

    points.push({
      label: formatSeriesLabel(timestamp, totalSpan),
      value,
    })
  }

  return points
}

function getMetricPresentation(metric) {
  if (metric.chartType === 'enum') {
    const states = metric.chartStates?.length ? metric.chartStates : ['状态0', '状态1']
    const max = Math.max(1, states.length - 1)

    return {
      lineLabel: metric.label,
      yAxisLabel: metric.unit || '状态',
      ticks: Array.from({ length: max + 1 }, (_, index) => max - index),
      min: 0,
      max,
      visualMin: -0.2,
      visualMax: max + 0.2,
      formatter: (value) => `${Math.round(value)}`,
      tooltipFormatter: (value) => states[Math.round(value)] ?? states[0],
    }
  }

  if (metric.chartType === 'state') {
    return {
      lineLabel: metric.label,
      yAxisLabel: '状态',
      ticks: [1, 0],
      min: 0,
      max: 1,
      visualMin: -0.2,
      visualMax: 1.2,
      formatter: (value) => `${Math.round(value)}`,
      tooltipFormatter: (value) => (value >= 0.5 ? '运行' : '待机'),
    }
  }

  if (metric.chartType === 'switch') {
    return {
      lineLabel: metric.label,
      yAxisLabel: '开关',
      ticks: [1, 0],
      min: 0,
      max: 1,
      visualMin: -0.2,
      visualMax: 1.2,
      formatter: (value) => `${Math.round(value)}`,
      tooltipFormatter: (value) => (value >= 0.5 ? '开启' : '关闭'),
    }
  }

  if (metric.chartType === 'mode') {
    return {
      lineLabel: metric.label,
      yAxisLabel: '模式',
      ticks: [2, 1, 0],
      min: 0,
      max: 2,
      visualMin: -0.2,
      visualMax: 2.2,
      formatter: (value) => ['制冷模式', '智能模式', '制热模式'][Math.round(value)] ?? '智能模式',
      tooltipFormatter: (value) => ['制冷模式', '智能模式', '制热模式'][Math.round(value)] ?? '智能模式',
    }
  }

  if (metric.chartType === 'timepoint') {
    return {
      lineLabel: metric.label,
      yAxisLabel: '时间',
      ticks: [1440, 1080, 720, 360, 0],
      min: 0,
      max: 24 * 60,
      visualMin: -30,
      visualMax: 24 * 60 + 30,
      formatter: (value) => formatTimePointValue(value),
      tooltipFormatter: (value) => formatTimePointValue(value),
    }
  }

  return {
    lineLabel: metric.label,
    yAxisLabel: metric.unit || '数值',
    ticks: [50, 40, 30, 20, 10, 0],
    min: 0,
    max:
      metric.chartType === 'pressure'
        ? 300
        : metric.chartType === 'humidity'
          ? 100
            : metric.chartType === 'noise'
              ? 80
            : metric.chartType === 'current'
              ? 30
            : metric.chartType === 'voltage'
              ? 450
            : metric.chartType === 'energy'
              ? 1600
            : metric.chartType === 'power'
              ? 8000
            : metric.chartType === 'flow'
              ? 100
            : metric.chartType === 'count'
              ? 40
            : metric.chartType === 'price'
              ? 2
            : metric.chartType === 'duration'
              ? 180
            : metric.chartType === 'frequency'
              ? 20
            : metric.chartType === 'percentage'
              ? 100
            : metric.chartType === 'angle'
              ? 360
                : metric.chartType === 'opening'
                  ? 100
                  : metric.chartType === 'fault'
                    ? 10
                    : metric.chartType === 'gear'
                      ? 5
                      : 50,
    formatter: (value) => `${value}`,
    tooltipFormatter: (value) => `${value}${metric.unit ? ` ${metric.unit}` : ''}`,
  }
}

function buildChartGeometry(series, presentation) {
  const width = 1120
  const height = 430
  const left = 46
  const right = 36
  const top = 36
  const bottom = 50
  const innerWidth = width - left - right
  const innerHeight = height - top - bottom
  const visualMin = presentation.visualMin ?? presentation.min
  const visualMax = presentation.visualMax ?? presentation.max

  const points = series.map((item, index) => {
    const x = left + (innerWidth * index) / Math.max(1, series.length - 1)
    const y = top + innerHeight - ((item.value - visualMin) / Math.max(1, visualMax - visualMin)) * innerHeight
    return [x, Math.min(top + innerHeight, Math.max(top, y))]
  })

  const linePath = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  const areaPath = `${linePath} L ${points.at(-1)?.[0] ?? 0} ${top + innerHeight} L ${points[0]?.[0] ?? 0} ${top + innerHeight} Z`

  return { points, linePath, areaPath }
}

function getChartAxisInterval(metric) {
  switch (metric.chartType) {
    case 'pressure':
      return 50
    case 'voltage':
      return 10
    case 'humidity':
    case 'noise':
    case 'opening':
    case 'percentage':
      return 20
    case 'current':
      return 5
    case 'flow':
      return 10
    case 'energy':
      return 200
    case 'power':
      return 1000
    case 'price':
      return 0.2
    case 'duration':
      return 30
    case 'frequency':
      return 5
    case 'count':
      return 5
    case 'timepoint':
      return 360
    case 'angle':
      return 60
    case 'fault':
      return 2
    case 'gear':
    case 'state':
    case 'switch':
    case 'mode':
    case 'enum':
      return 1
    default:
      return 10
  }
}

function TrendChart({ metric, chartData, presentation }) {
  const chartRef = useRef(null)

  useEffect(() => {
    if (!chartRef.current) {
      return undefined
    }

    const existingChart = echarts.getInstanceByDom(chartRef.current)
    if (existingChart) {
      existingChart.dispose()
    }

    const chart = echarts.init(chartRef.current)
    const axisInterval = chartData.length > 12 ? Math.ceil(chartData.length / 8) - 1 : 0
    const yAxisInterval = getChartAxisInterval(metric)
    const isDiscreteChart = ['enum', 'state', 'switch', 'mode', 'fault', 'gear'].includes(metric.chartType)

    chart.setOption({
      animation: false,
      tooltip: {
        trigger: 'axis',
        triggerOn: 'mousemove|click',
        appendToBody: true,
        backgroundColor: 'rgba(30, 39, 52, 0.96)',
        borderColor: 'rgba(77, 110, 153, 0.45)',
        borderWidth: 1,
        padding: [12, 14],
        textStyle: {
          color: '#ffffff',
          fontSize: 16,
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: 'rgba(181, 196, 220, 0.48)',
            width: 1,
          },
        },
        formatter: (params) => {
          const point = Array.isArray(params) ? params[0] : params
          if (!point) {
            return ''
          }

          return `${point.axisValue}<br/>${point.marker}${presentation.lineLabel} ${presentation.tooltipFormatter(point.data)}`
        },
      },
      grid: {
        top: 12,
        left: 18,
        right: 24,
        bottom: 54,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        name: '时间',
        nameLocation: 'end',
        nameGap: 18,
        data: chartData.map((item) => item.label),
        axisLine: {
          lineStyle: {
            color: 'rgba(121, 139, 163, 0.55)',
          },
        },
        axisTick: { show: false },
        axisLabel: {
          color: '#a9b5c4',
          fontSize: 16,
          margin: 14,
          hideOverlap: true,
          interval: axisInterval,
        },
      },
      yAxis: {
        type: 'value',
        min: presentation.min,
        max: presentation.max,
        interval: yAxisInterval,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#a9b5c4',
          fontSize: 16,
          formatter: (value) => presentation.formatter(value),
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(198, 213, 238, 0.68)',
            type: 'dashed',
          },
        },
      },
      series: [
        {
          name: presentation.lineLabel,
          type: 'line',
          smooth: false,
          step: isDiscreteChart ? 'middle' : false,
          symbol: 'circle',
          showSymbol: true,
          symbolSize: 8,
          clip: false,
          data: chartData.map((item) => item.value),
          lineStyle: {
            width: 2.5,
            color: '#ff5c2f',
          },
          itemStyle: {
            color: '#ff5c2f',
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(255, 95, 52, 0.42)' },
              { offset: 1, color: 'rgba(255, 95, 52, 0.04)' },
            ]),
          },
        },
      ],
    })

    const resizeObserver = new ResizeObserver(() => {
      chart.resize()
    })
    resizeObserver.observe(chartRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.dispose()
    }
  }, [chartData, metric, presentation])

  return <div ref={chartRef} className="ops-trend-modal__echart" />
}

function TrendModal({ metric, startTime, endTime, onStartTimeChange, onEndTimeChange, onSearch, chartData, onClose }) {
  const [pickerField, setPickerField] = useState(null)
  const presentation = useMemo(() => getMetricPresentation(metric), [metric])
  const [tooltipIndex, setTooltipIndex] = useState(null)
  const geometry = useMemo(() => buildChartGeometry(chartData, presentation), [chartData, presentation])
  const resolvedTooltipIndex = tooltipIndex !== null && chartData[tooltipIndex] ? tooltipIndex : null
  const tooltipPoint =
    resolvedTooltipIndex === null ? null : geometry.points[resolvedTooltipIndex] ?? geometry.points[0] ?? null
  const tooltipValue =
    resolvedTooltipIndex === null ? null : chartData[resolvedTooltipIndex]?.value ?? chartData[0]?.value ?? 0
  const tooltipPosition = useMemo(() => {
    if (!tooltipPoint) {
      return null
    }

    const tooltipWidth = 236
    const tooltipHeight = 66
    const offsetX = 22
    const placeRight = tooltipPoint[0] + offsetX + tooltipWidth <= 1120
    const x = placeRight ? tooltipPoint[0] + offsetX : tooltipPoint[0] - tooltipWidth - offsetX
    const placeTop = tooltipPoint[1] - tooltipHeight - 12 >= 0
    const y = placeTop ? tooltipPoint[1] - tooltipHeight - 12 : tooltipPoint[1] + 18

    return {
      x,
      y,
    }
  }, [tooltipPoint])

  const updateTooltipIndex = (clientX, currentTarget) => {
    if (!geometry.points.length) {
      setTooltipIndex(null)
      return
    }

    const rect = currentTarget.getBoundingClientRect()
    const widthRatio = rect.width / 1120
    const scaledPoints = geometry.points.map(([x]) => rect.left + x * widthRatio)

    const nearestIndex = scaledPoints.reduce((bestIndex, pointX, index) => {
      if (bestIndex === -1) {
        return index
      }

      const bestDistance = Math.abs(scaledPoints[bestIndex] - clientX)
      const currentDistance = Math.abs(pointX - clientX)
      return currentDistance < bestDistance ? index : bestIndex
    }, -1)

    setTooltipIndex(nearestIndex === -1 ? null : nearestIndex)
  }

  return (
    <>
      <div className="ops-trend-modal__backdrop" onClick={onClose}>
        <div className="ops-trend-modal" onClick={(event) => event.stopPropagation()}>
          <header className="ops-trend-modal__header">
            <h3>{metric.label}</h3>
            <button type="button" onClick={onClose} aria-label="关闭">
              <img src={closeIcon} alt="" aria-hidden="true" />
            </button>
          </header>

          <div className="ops-trend-modal__toolbar">
            <span>时间范围</span>
            <button type="button" className="ops-trend-modal__date" onClick={() => setPickerField('start')}>
              <span>{formatDateTimeParts(parseDateTime(startTime))}</span>
              <img src={dateIcon} alt="" aria-hidden="true" />
            </button>
            <em>-</em>
            <button type="button" className="ops-trend-modal__date" onClick={() => setPickerField('end')}>
              <span>{formatDateTimeParts(parseDateTime(endTime))}</span>
              <img src={dateIcon} alt="" aria-hidden="true" />
            </button>
            <button type="button" className="ops-trend-modal__search" onClick={onSearch}>查询</button>
          </div>

          <div className="ops-trend-modal__content">
            <div className="ops-trend-modal__caption">{metric.label}变化曲线</div>
            <div className="ops-trend-modal__ylabel">{presentation.yAxisLabel}</div>

            <div className="ops-trend-modal__chart">
              <TrendChart metric={metric} chartData={chartData} presentation={presentation} />
              <div className="ops-trend-modal__grid" style={{ '--ops-grid-rows': presentation.ticks.length }}>
                {presentation.ticks.map((tick) => (
                  <div key={tick} className="ops-trend-modal__grid-row">
                    <span>{presentation.formatter(tick)}</span>
                    <i />
                  </div>
                ))}
              </div>

              <svg
                viewBox="0 0 1120 430"
                className="ops-trend-modal__svg"
                preserveAspectRatio="none"
                aria-hidden="true"
                onPointerMove={(event) => updateTooltipIndex(event.clientX, event.currentTarget)}
                onPointerDown={(event) => updateTooltipIndex(event.clientX, event.currentTarget)}
                onClick={(event) => updateTooltipIndex(event.clientX, event.currentTarget)}
                onPointerLeave={() => setTooltipIndex(null)}
              >
                <defs>
                  <linearGradient id="ops-area-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255,95,52,0.42)" />
                    <stop offset="100%" stopColor="rgba(255,95,52,0.04)" />
                  </linearGradient>
                </defs>
                <path d={geometry.areaPath} fill="url(#ops-area-gradient)" />
                <path d={geometry.linePath} fill="none" stroke="#ff5c2f" strokeWidth="2.5" />
                {tooltipPoint && tooltipValue !== null && tooltipPosition ? (
                  <>
                    <circle cx={tooltipPoint[0]} cy={tooltipPoint[1]} r="8" fill="#ff5c2f" />
                    <g transform={`translate(${tooltipPosition.x} ${tooltipPosition.y})`}>
                      <rect width="236" height="66" rx="10" fill="#1e2734" stroke="rgba(77,110,153,0.45)" />
                      <circle cx="28" cy="33" r="7" fill="#ff5c2f" />
                      <text x="54" y="40" fill="#ffffff" fontSize="22">{chartData[resolvedTooltipIndex]?.label ?? chartData[0]?.label ?? '--'}</text>
                      <text x="138" y="40" fill="#ffffff" fontSize="22">{presentation.tooltipFormatter(tooltipValue)}</text>
                    </g>
                  </>
                ) : null}
              </svg>

              <div className="ops-trend-modal__xaxis">
                {chartData.map((item) => (
                  <span key={item.label}>{item.label}</span>
                ))}
                <span>时间</span>
              </div>
            </div>

            <div className="ops-trend-modal__legend">
              <i />
              <span>{presentation.lineLabel}</span>
            </div>
          </div>

          <footer className="ops-trend-modal__footer">
            <button type="button" onClick={onClose}>关闭</button>
          </footer>
        </div>
      </div>

      <TimePickerModal
        isOpen={Boolean(pickerField)}
        title="时间选择"
        columns={[
          { key: 'year', options: DATETIME_YEARS, formatter: (value) => `${value}年` },
          { key: 'month', options: DATETIME_MONTHS, formatter: (value) => `${padNumber(value)}月` },
          { key: 'day', options: DATETIME_DAYS, formatter: (value) => `${padNumber(value)}日` },
          { key: 'hour', options: DATETIME_HOURS, formatter: (value) => padNumber(value) },
          { key: 'minute', options: DATETIME_MINUTES, formatter: (value) => padNumber(value) },
        ]}
        value={parseDateTime(pickerField === 'start' ? startTime : endTime)}
        showBackdrop={false}
        onClose={() => setPickerField(null)}
        onConfirm={(nextValue) => {
          const normalized = normalizeDateTime(formatDateTimeParts(nextValue).replace(/\./g, '-').replace(':00', ''))
          if (pickerField === 'start') {
            onStartTimeChange(normalized)
          } else {
            onEndTimeChange(normalized)
          }
          setPickerField(null)
        }}
      />
    </>
  )
}

function MetricCard({ item, onClick }) {
  return (
    <button type="button" className="ops-system-card" onClick={() => onClick(item)}>
      <span className="ops-system-card__label">{item.label}</span>
      <strong className="ops-system-card__value">{item.value}</strong>
    </button>
  )
}

function OperationsSystemManagementPage({ tabId }) {
  const [activeSetting, setActiveSetting] = useState(SETTING_OPTIONS[0].value)
  const [activeUnit, setActiveUnit] = useState(UNIT_OPTIONS[0].value)
  const [activeMetric, setActiveMetric] = useState(null)
  const defaultTrendTimeRange = useMemo(() => getDefaultTrendTimeRange(), [])
  const [startTime, setStartTime] = useState(defaultTrendTimeRange.startTime)
  const [endTime, setEndTime] = useState(defaultTrendTimeRange.endTime)
  const [chartVersion, setChartVersion] = useState(0)
  const systemSettingItems = buildSystemSettingItems(activeSetting)
  const chartData = useMemo(
    () => (activeMetric ? createRandomSeries(activeMetric, startTime, endTime, chartVersion) : []),
    [activeMetric, chartVersion, endTime, startTime],
  )

  useEffect(() => {
    setActiveMetric(null)
  }, [activeSetting, activeUnit, tabId])

  const selectedUnit = useMemo(
    () => UNIT_OPTIONS.find((item) => item.value === activeUnit) ?? UNIT_OPTIONS[0],
    [activeUnit],
  )

  const viewConfig = useMemo(() => {
    if (tabId === 'status-data') {
      return {
        selector: null,
        tip: '点击卡片查看历史状态数据曲线图',
        items: SYSTEM_STATUS_ITEMS,
      }
    }

    if (tabId === 'setting-data') {
      return {
        selector: (
          <SelectDropdown
            className="ops-system-page__select"
            triggerClassName="ops-system-page__select-trigger"
            dropdownClassName="ops-system-page__select-menu"
            optionClassName="ops-system-page__select-option"
            options={SETTING_OPTIONS}
            value={activeSetting}
            onChange={setActiveSetting}
            triggerAriaLabel="选择系统设置数据"
            listAriaLabel="系统设置数据选项"
          />
        ),
        tip: '点击卡片查看历史状态数据曲线图',
        items: systemSettingItems,
      }
    }

    const unitNumber = Number(activeUnit.replace('heat-pump-', '')) || 1
    return {
      selector: (
        <SelectDropdown
          className="ops-system-page__select"
          triggerClassName="ops-system-page__select-trigger"
          dropdownClassName="ops-system-page__select-menu"
          optionClassName="ops-system-page__select-option"
          options={UNIT_OPTIONS}
          value={activeUnit}
          onChange={setActiveUnit}
          triggerAriaLabel="选择热泵机组"
          listAriaLabel="热泵机组选项"
        />
      ),
      tip: '点击卡片查看历史状态数据曲线图',
      items: UNIT_ITEMS.map((item, index) => {
        if (!item.unit || item.unit === 'switch') {
          return item
        }

        if (item.chartType === 'temperature') {
          const nextValue = 12 + ((unitNumber + index * 2) % 24)
          return { ...item, value: `${nextValue.toFixed(1)} ℃` }
        }

        if (item.chartType === 'current') {
          const nextValue = ((unitNumber + index) % 8) + 0.5
          return { ...item, value: `${nextValue.toFixed(1)} A` }
        }

        if (item.chartType === 'opening') {
          const nextValue = (unitNumber * 7 + index * 9) % 100
          return { ...item, value: `${nextValue.toFixed(1)}` }
        }

        return item
      }).map((item) =>
        item.label === '通讯状态'
          ? { ...item, value: unitNumber % 3 === 0 ? '关闭' : '开启' }
          : item.label === '总故障代码'
            ? { ...item, value: `${unitNumber % 4}` }
            : item,
      ),
      currentTitle: selectedUnit.label,
    }
  }, [activeSetting, activeUnit, selectedUnit.label, systemSettingItems, tabId])

  const handleOpenMetric = (item) => {
    const nextRange = getDefaultTrendTimeRange()
    setStartTime(nextRange.startTime)
    setEndTime(nextRange.endTime)
    setActiveMetric(item)
  }

  const handleStartTimeChange = (nextValue) => {
    setStartTime(nextValue)
    if (nextValue > endTime) {
      setEndTime(nextValue)
    }
  }

  const handleEndTimeChange = (nextValue) => {
    setEndTime(nextValue)
    if (nextValue < startTime) {
      setStartTime(nextValue)
    }
  }

  const handleSearch = () => {
    if (!activeMetric) {
      return
    }
    setChartVersion((previous) => previous + 1)
  }

  return (
    <>
      <main className="ops-system-page">
        {viewConfig.selector ? <div className="ops-system-page__toolbar">{viewConfig.selector}</div> : null}

        <p className="ops-system-page__tip">{viewConfig.tip}</p>

        <section className="ops-system-page__grid">
          {viewConfig.items.map((item) => (
            <MetricCard key={item.key} item={item} onClick={handleOpenMetric} />
          ))}
        </section>
      </main>

      {activeMetric ? (
        <TrendModal
          metric={activeMetric}
          startTime={startTime}
          endTime={endTime}
          onStartTimeChange={handleStartTimeChange}
          onEndTimeChange={handleEndTimeChange}
          onSearch={handleSearch}
          chartData={chartData}
          onClose={() => setActiveMetric(null)}
        />
      ) : null}
    </>
  )
}

export default OperationsSystemManagementPage
