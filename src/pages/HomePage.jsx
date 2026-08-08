import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import standardSystemMap from '../assets/home/system.png'
import dajuyuanSystemMap from '../assets/home/dajuyuan-system.png'
import systemMap2 from '../assets/home/system2.png'
import coupleGasBoilerIcon from '../assets/home/couple-gasboiler.png'
import coupleWaterSourceHeatPumpIcon from '../assets/home/couple-wshp.png'
import coupleAirCooledModuleIcon from '../assets/home/couple-cool.png'
import coupleElectricBoilerIcon from '../assets/home/couple-elecboiler.png'
import modeStatusIcon from '../assets/home/modeStatus.svg'
import costAnalysisIcon from '../assets/home/costAnalysis.svg'
import temperatureIcon from '../assets/home/temperature.svg'
import deviceStatusIcon from '../assets/home/deviceStatus.svg'
import avatarA from '../assets/home/A.png'
import avatarH from '../assets/home/H.png'
import rmbIcon from '../assets/home/rmb.svg'
import modeArrowRight from '../assets/home/modeStatusArrowRight.svg'
import modeDivider from '../assets/home/modeStatusDivider.svg'
import heatingIcon from '../assets/device/heating-active.svg'
import coolingIcon from '../assets/device/cooling-active.svg'
import weatherCompensationIcon from '../assets/home/weather-compensation.svg'
import backIcon from '../assets/layout/back.svg'
import HomeWidget from '../components/HomeWidget'
import HomeHeatPumpOverview from '../components/HomeHeatPumpOverview'
import HomeTerminalBuildingOverview from '../components/HomeTerminalBuildingOverview'
import SavedCostDisplay from '../components/SavedCostDisplay'
import RealTimeTemperatureChart from '../components/RealTimeTemperatureChart'
import DeviceStatusPanel from '../components/DeviceStatusPanel'
import HomeUnitStatusBlock from '../components/HomeUnitStatusBlock'
import { useHomeUnitStatusPoll } from '../hooks/useHomeUnitStatusPoll'
import { COUPLE_ENERGY_TYPE_AIR_COOLED_MODULE_ID } from '@/config/projectUnitDevices'
import {
  isDajuyuanProfile,
  SHOW_DEVICE_STATUS_LOOP_PUMP_TAB,
  SHOW_HOME_AIR_COOLED_STATUS_BLOCK,
  SYSTEM_DIAGRAM_KEY,
} from '@/config/projectProfile'
import { useHomeOverviewQuery } from '../features/home/hooks/useHomeOverviewQuery'
import { useSystemConfigQuery } from '../features/home/hooks/useSystemConfigQuery'
import { useTemp24HourQuery } from '../features/home/hooks/useTemp24HourQuery'
import { useHomeFeatureSettings } from '@/features/home/store/homeFeatureSettingsStore'
import { useSystemConfigStore } from '@/features/system/store/systemConfigStore'

const HOME_PAGE_VIEW = {
  DASHBOARD: 'dashboard',
  HEAT_PUMP_OVERVIEW: 'heat-pump-overview',
  TERMINAL_BUILDING: 'terminal-building',
}

const HOME_PAGE_TITLE_MAP = {
  [HOME_PAGE_VIEW.DASHBOARD]: '首页',
  [HOME_PAGE_VIEW.HEAT_PUMP_OVERVIEW]: '热泵总览',
  [HOME_PAGE_VIEW.TERMINAL_BUILDING]: '末端建筑',
}

const HOME_TEXT = {
  SYSTEM_IMAGE_ALT: '系统原理图',
  HEAT_PUMP_GROUP: '热泵机组',
  AIR_COOLED_MODULE_GROUP: '风冷模块机组',
  OUTDOOR_TEMP: '室外温度',
  CELSIUS: '℃',
  CONDENSATE_WATER: '冷凝水',
  HEAT_TRACING_BELT: '伴热带',
  OFF: '已关闭',
  CONDENSATE_PIPE: '冷凝水管',
  COUPLING_ENERGY: '耦合能源',
  ON: '已开启',
  SUPPLY_TEMP: '供水温度',
  PRIMARY_SUPPLY_MAIN_TEMP: '一次侧供水总管温度',
  SUPPLY_PRESSURE: '供水压力',
  RETURN_PRESSURE: '回水压力',
  RETURN_TEMP: '回水温度',
  HEAT_PUMP_LOOP_PUMP: '热泵循环泵',
  TERMINAL_LOOP_PUMP: '末端循环泵',
  PUMP_1: '水泵一',
  PUMP_2: '水泵二',
  PUMP_3: '水泵三',
  RUNNING: '运行中',
  STANDBY: '待机',
  HAS_FAULT: '有故障',
  DIFFERENTIAL_BYPASS_VALVE: '压差旁通阀',
  DRAIN_VALVE: '排污阀',
  PRESSURE_TANK: '定压罐',
  PRESSURE_VALVE: '泄压阀',
  MAKEUP_PUMP: '定压补水泵',
  WATER_TANK: '水箱',
  SOFT_WATER: '软化水',
  TERMINAL_BUILDING: '末端建筑',
  TERMINAL_BUILDING_TIP: '点击查看详情',
  HEAT_PUMP_PAGE_TIP: '点击查看详情',
  ENTER_HEAT_PUMP_PAGE: '进入热泵总览页面',
  ENTER_TERMINAL_PAGE: '进入末端建筑页面',
  ENTER_HEAT_TRACE_PAGE: '进入伴热带设置页面',
  ENTER_LOOP_PUMP_PAGE: '进入热泵循环泵设置页面',
  ENTER_TERMINAL_LOOP_PUMP_PAGE: '进入末端循环泵设置页面',
  ENTER_DRAIN_VALVE_PAGE: '进入排污阀设置页面',
  ENTER_RELIEF_VALVE_PAGE: '进入泄压阀设置页面',
  ENTER_CONSTANT_PRESSURE_PAGE: '进入定压补水泵设置页面',
  MODE_STATUS: '模式状态',
  SMART_MODE_RUNNING: '智能模式运行中',
  COST_NOTE: '注：费用结算自2026年3月15日至今日',
  COST_ANALYSIS: '费用统计',
  THIS_MONTH: '本月',
  TODAY: '今日',
  YESTERDAY: '昨日',
  YUAN: '元',
  REAL_TIME_TEMP: '目标回水温度',
  AMBIENT_TEMP: '环境温度：-2.1℃',
  DEVICE_STATUS: '设备状态',
  BACK_HOME: '返回主页',
  TERMINAL_DEVICE_ELECTRIC_BOILER: '电锅炉',
  TERMINAL_DEVICE_GAS_BOILER: '燃气锅炉',
  TERMINAL_DEVICE_WATER_SOURCE_HEAT_PUMP: '水源热泵',
  TERMINAL_DEVICE_AIR_COOLED_MODULE: '风冷模块',
  TERMINAL_LOOP_PUMP_TAB: '末端循环水泵',
}

const COUPLE_DEVICE_IMAGE_MAP = {
  '1': { src: coupleElectricBoilerIcon, alt: HOME_TEXT.TERMINAL_DEVICE_ELECTRIC_BOILER },
  '2': { src: coupleWaterSourceHeatPumpIcon, alt: HOME_TEXT.TERMINAL_DEVICE_WATER_SOURCE_HEAT_PUMP },
  '3': { src: coupleAirCooledModuleIcon, alt: HOME_TEXT.TERMINAL_DEVICE_AIR_COOLED_MODULE },
  '4': { src: coupleGasBoilerIcon, alt: HOME_TEXT.TERMINAL_DEVICE_GAS_BOILER },
}

const COUPLE_DEVICE_LAYOUT_MAP = {
  '1': {
    banner: { top: '130px', left: '750px' },
    couplingEnergyNode: { left: '76.5%', top: '33%' },
  },
  '2': {
    banner: { top: '255px', left: '750px' },
    couplingEnergyNode: { left: '73%', top: '23%' },
  },
  '3': {
    banner: { top: '220px', left: '750px' },
    couplingEnergyNode: { left: '74.5%', top: '19%' },
  },
  '4': {
    banner: { top: '280px', left: '750px' },
    couplingEnergyNode: { left: '73.5%', top: '25%' },
  },
}

const SYSTEM_IMAGE_STANDARD = standardSystemMap
const SYSTEM_IMAGE_DAJUYUAN = dajuyuanSystemMap
const SYSTEM_IMAGE_TYPE2 = systemMap2
const SYSTEM_IMAGE_BY_PROFILE = SYSTEM_DIAGRAM_KEY === 'dajuyuan' ? SYSTEM_IMAGE_DAJUYUAN : SYSTEM_IMAGE_STANDARD

function HomePage({ onActivePageChange, committedUnitLayoutSlots }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [activePage, setActivePage] = useState(HOME_PAGE_VIEW.DASHBOARD)
  const [isSystemImageLoaded, setIsSystemImageLoaded] = useState(false)
  const isHomeRoute = location.pathname === '/home' || location.pathname === '/home/'
  const isHomeDashboard = activePage === HOME_PAGE_VIEW.DASHBOARD
  const homeOverviewQuery = useHomeOverviewQuery({ enabled: isHomeRoute && isHomeDashboard })
  const { refetch: refetchHomeOverview } = homeOverviewQuery
  const homeUnitStatusPoll = useHomeUnitStatusPoll({
    enabled: isHomeRoute && isHomeDashboard,
  })
  const systemConfigQuery = useSystemConfigQuery({ enabled: isHomeRoute })
  const { refetch: refetchSystemConfig } = systemConfigQuery
  const temp24HourQuery = useTemp24HourQuery({ enabled: isHomeRoute && isHomeDashboard })
  const homeOverview = homeOverviewQuery.data
  const systemConfigStore = useSystemConfigStore()
  const systemConfig = useMemo(
    () => ({
      ...systemConfigQuery.data,
      ...(systemConfigStore.hasFetched
        ? {
            systemTypeUuid: systemConfigStore.systemTypeUuid,
            terminalTypeUuid: systemConfigStore.terminalTypeUuid,
            coupleEnergyTypeUuid: systemConfigStore.coupleEnergyTypeUuid,
          }
        : {}),
    }),
    [systemConfigQuery.data, systemConfigStore],
  )
  const temp24HourTrend = temp24HourQuery.data
  const homeFeatureSettings = useHomeFeatureSettings()
  const wasHomeRouteRef = useRef(isHomeRoute)
  const shouldDelayDashboardRender =
    isHomeRoute &&
    isHomeDashboard &&
    (!homeOverviewQuery.hasFetchedData || !systemConfigQuery.hasFetchedData || !temp24HourQuery.hasFetchedData)

  const isSystemType2 = systemConfig.systemTypeUuid === '2'
  const resolvedSystemImage = isSystemType2 && SYSTEM_IMAGE_TYPE2 ? SYSTEM_IMAGE_TYPE2 : SYSTEM_IMAGE_BY_PROFILE
  const coupleEnergyTypeUuid = systemConfig.coupleEnergyTypeUuid
  const isAirCooledModuleCoupling = coupleEnergyTypeUuid === COUPLE_ENERGY_TYPE_AIR_COOLED_MODULE_ID
  const coupleDevice = COUPLE_DEVICE_IMAGE_MAP[coupleEnergyTypeUuid] ?? null
  const coupleDeviceLayout = COUPLE_DEVICE_LAYOUT_MAP[coupleEnergyTypeUuid] ?? null
  const shouldShowCouplingEnergy = Boolean(coupleDevice && coupleDeviceLayout)
  const shouldShowAirCooledModuleOnDiagram =
    isAirCooledModuleCoupling && SHOW_HOME_AIR_COOLED_STATUS_BLOCK
  const coupleDeviceBannerStyle = coupleDeviceLayout
    ? {
        ...coupleDeviceLayout.banner,
        right: 'auto',
        display: 'block',
        padding: 0,
      }
    : undefined
  const couplingEnergyNodeStyle = coupleDeviceLayout?.couplingEnergyNode

  useEffect(() => {
    onActivePageChange?.(HOME_PAGE_TITLE_MAP[activePage] ?? HOME_PAGE_TITLE_MAP[HOME_PAGE_VIEW.DASHBOARD])
  }, [activePage, onActivePageChange])

  useEffect(() => {
    if (location.pathname === '/home' || location.pathname === '/home/') {
      setActivePage(HOME_PAGE_VIEW.DASHBOARD)
    }
  }, [location.pathname])

  useEffect(() => {
    if (isHomeRoute && !wasHomeRouteRef.current) {
      refetchSystemConfig()
      void refetchHomeOverview()
    }
    wasHomeRouteRef.current = isHomeRoute
  }, [isHomeRoute, refetchHomeOverview, refetchSystemConfig])

  const goBackHome = () => setActivePage(HOME_PAGE_VIEW.DASHBOARD)
  const goToHeatPumpOverview = () => setActivePage(HOME_PAGE_VIEW.HEAT_PUMP_OVERVIEW)
  // 末端建筑入口暂时隐藏，恢复遮罩层时一并恢复
  // const goToTerminalBuilding = () => setActivePage(HOME_PAGE_VIEW.TERMINAL_BUILDING)
  const heatPumpOverlaySummary = homeUnitStatusPoll.heatPump.summary
  const airCooledModuleStatus = homeUnitStatusPoll.airCooledModule.summary
  const deviceStatusHeatPumpData = homeUnitStatusPoll.heatPump.chartData
  const indoorTemperatures = homeOverview.system.indoorTemperatures
  const terminalCirculationPumps = homeOverview.system.terminalCirculationPumps
  const indoorTemperatureVisibility = homeFeatureSettings.indoorTemperatureVisibility ?? [true, true, true, true, true]
  const visibleIndoorTemperatures = indoorTemperatures.filter((_, index) => indoorTemperatureVisibility[index] !== false)
  const showModeStatus = homeFeatureSettings.showModeStatus !== false
  const showModeSavedCost = homeFeatureSettings.showModeSavedCost !== false
  const showCostAnalysis = homeFeatureSettings.showCostAnalysis !== false
  const showTargetBackwaterTemperature = homeFeatureSettings.showTargetBackwaterTemperature !== false
  const showDeviceStatus = homeFeatureSettings.showDeviceStatus !== false
  const sideWidgetOrder = []
  if (showModeStatus) sideWidgetOrder.push('mode')
  if (showCostAnalysis) sideWidgetOrder.push('cost')
  if (showTargetBackwaterTemperature) sideWidgetOrder.push('temperature')
  if (showDeviceStatus) sideWidgetOrder.push('deviceStatus')
  const hasVisibleSideWidgets = sideWidgetOrder.length > 0
  const sideWidgetRowHeightMap = {
    mode: showModeSavedCost ? '288px' : '158px',
    cost: 158,
    temperature: 228,
    deviceStatus: 258,
  }
  const resolveGridRowSize = (size) => (typeof size === 'number' ? `${size}px` : size)
  const sidePanelStyle = hasVisibleSideWidgets
    ? { gridTemplateRows: sideWidgetOrder.map((item) => resolveGridRowSize(sideWidgetRowHeightMap[item])).join(' ') }
    : undefined
  const isManualModeAvatar = homeOverview.mode.avatarType === 'H'
  const modeAvatar = isManualModeAvatar ? avatarH : avatarA
  const modeAIcon = homeOverview.mode.iconASrc === 'cooling' ? coolingIcon : heatingIcon

  if (shouldDelayDashboardRender) {
    return (
      <div className="home-page-loading" aria-busy="true">
        <div className="home-page-loading__spinner" aria-hidden />
        <p className="home-page-loading__text">正在加载首页数据...</p>
      </div>
    )
  }

  return (
    <div className="home-pager">
      <div className="home-pager-track">
        <div
          className={`home-page home-screen${activePage === HOME_PAGE_VIEW.DASHBOARD ? ' is-active' : ''}${
            hasVisibleSideWidgets ? '' : ' home-screen--no-side-panel'
          }`}
        >
          <section className="home-system-panel">
            <div className="home-system-canvas">
              {shouldShowCouplingEnergy && (
                <div className="home-terminal-device-banner" style={coupleDeviceBannerStyle}>
                  {coupleDevice.src ? (
                    <img src={coupleDevice.src} alt={coupleDevice.alt} className="home-terminal-device-image" />
                  ) : (
                    <span className="home-terminal-device-placeholder">{coupleDevice.alt}</span>
                  )}
                </div>
              )}
              <img
                src={resolvedSystemImage}
                alt={HOME_TEXT.SYSTEM_IMAGE_ALT}
                className="home-system-image"
                onLoad={() => setIsSystemImageLoaded(true)}
                onError={() => setIsSystemImageLoaded(true)}
              />
              <div
                className={`home-system-overlay home-system-overlay--${SYSTEM_DIAGRAM_KEY}${isSystemImageLoaded ? ' is-ready' : ''}`}
              >
                <HomeUnitStatusBlock
                  title={HOME_TEXT.HEAT_PUMP_GROUP}
                  summary={heatPumpOverlaySummary}
                  className="home-system-node--heat-pump"
                />
                {shouldShowAirCooledModuleOnDiagram ? (
                  <HomeUnitStatusBlock
                    title={HOME_TEXT.AIR_COOLED_MODULE_GROUP}
                    summary={airCooledModuleStatus}
                    className="home-system-node--air-cooled-module"
                  />
                ) : null}

                <div className="home-system-node home-system-node--outdoor-temperature home-system-inline">
                  <span className="home-system-caption">{HOME_TEXT.OUTDOOR_TEMP}</span>
                  <span className="home-system-value">{homeOverview.system.outdoorTemp}</span>
                  <span className="home-system-unit">{HOME_TEXT.CELSIUS}</span>
                </div>

                {!isDajuyuanProfile ? (
                  <>
                    <div className="home-system-node home-system-node--condensate">{HOME_TEXT.CONDENSATE_WATER}</div>

                    <div className="home-system-node home-system-node--heat-tracing home-system-inline">
                      <span className="home-system-caption">{HOME_TEXT.HEAT_TRACING_BELT}</span>
                      <span className={`home-system-state ${homeOverview.system.heatTracingEnabled ? 'is-on' : 'is-off'}`}>
                        {homeOverview.system.heatTracingEnabled ? HOME_TEXT.ON : HOME_TEXT.OFF}
                      </span>
                      <span className="home-system-caption">{HOME_TEXT.CONDENSATE_PIPE}</span>
                      <span className="home-system-value">{homeOverview.system.condensatePipeTemp}</span>
                      <span className="home-system-unit">{HOME_TEXT.CELSIUS}</span>
                    </div>
                  </>
                ) : null}

                {shouldShowCouplingEnergy && (
                  <div
                    className="home-system-node home-system-node--coupling-energy home-system-inline"
                    style={couplingEnergyNodeStyle}
                  >
                    <span className="home-system-caption">{HOME_TEXT.COUPLING_ENERGY}</span>
                    <span className={`home-system-state ${homeOverview.system.couplingEnergyEnabled ? 'is-on' : 'is-off'}`}>
                      {homeOverview.system.couplingEnergyEnabled ? HOME_TEXT.ON : HOME_TEXT.OFF}
                    </span>
                  </div>
                )}

                <div className="home-system-node home-system-node--indoor-temperature-list">
                  {visibleIndoorTemperatures.map((item, index) => (
                    <div key={`indoor-temperature-${index}`} className="home-system-row">
                      <span className="home-system-caption">{item.name}</span>
                      <span className="home-system-value">{item.value}</span>
                      <span className="home-system-unit">{HOME_TEXT.CELSIUS}</span>
                    </div>
                  ))}
                </div>

                <div className="home-system-node home-system-node--supply-temperature home-system-inline">
                  <span className="home-system-caption">{HOME_TEXT.SUPPLY_TEMP}</span>
                  <span className="home-system-value">{homeOverview.system.supplyTemp}</span>
                  <span className="home-system-unit">{HOME_TEXT.CELSIUS}</span>
                </div>

                {isSystemType2 && (
                  <div className="home-system-node home-system-node--terminal-loop-pump">
                    <div className="home-system-caption home-system-caption--title">{HOME_TEXT.TERMINAL_LOOP_PUMP}</div>
                    {terminalCirculationPumps.length > 0 ? (
                      terminalCirculationPumps.map((pump) => (
                        <div key={pump.name} className="home-system-row">
                          <span className={`home-system-caption${pump.tone === 'fault' ? ' is-fault' : ''}`}>{pump.name}</span>
                          <span className={`home-system-state ${pump.tone === 'running' ? 'is-on' : pump.tone === 'fault' ? 'is-fault' : 'is-off'}`}>
                            {pump.status}
                          </span>
                        </div>
                      ))
                    ) : !isDajuyuanProfile ? (
                      homeOverview.system.circulationPumps.slice(0, 3).map((pump) => (
                        <div key={`terminal-${pump.name}`} className="home-system-row">
                          <span className={`home-system-caption${pump.tone === 'fault' ? ' is-fault' : ''}`}>{pump.name}</span>
                          <span className={`home-system-state ${pump.tone === 'running' ? 'is-on' : pump.tone === 'fault' ? 'is-fault' : 'is-off'}`}>
                            {pump.status}
                          </span>
                        </div>
                      ))
                    ) : null}
                  </div>
                )}

                {isSystemType2 && homeOverview.system.primarySupplyMainTemp !== '' && (
                  <div className="home-system-node home-system-node--primary-supply-main-temp home-system-inline">
                    <span className="home-system-caption">{HOME_TEXT.PRIMARY_SUPPLY_MAIN_TEMP}</span>
                    <span className="home-system-value">{homeOverview.system.primarySupplyMainTemp}</span>
                    <span className="home-system-unit">{HOME_TEXT.CELSIUS}</span>
                  </div>
                )}

                <div className="home-system-node home-system-node--supply-pressure home-system-inline">
                  <span className="home-system-caption">{HOME_TEXT.SUPPLY_PRESSURE}</span>
                  <span className="home-system-value">{homeOverview.system.supplyPressure}</span>
                  <span className="home-system-unit">Mpa</span>
                </div>

                <div className="home-system-node home-system-node--return-pressure home-system-inline">
                  <span className="home-system-caption">{HOME_TEXT.RETURN_PRESSURE}</span>
                  <span className="home-system-value">{homeOverview.system.returnPressure}</span>
                  <span className="home-system-unit">Mpa</span>
                </div>

                <div className="home-system-node home-system-node--return-temperature home-system-inline">
                  <span className="home-system-caption">{HOME_TEXT.RETURN_TEMP}</span>
                  <span className="home-system-value">{homeOverview.system.returnTemp}</span>
                  <span className="home-system-unit">{HOME_TEXT.CELSIUS}</span>
                </div>

                <div className="home-system-node home-system-node--circulation-pump">
                  <div className="home-system-caption home-system-caption--title">{HOME_TEXT.HEAT_PUMP_LOOP_PUMP}</div>
                  {!isDajuyuanProfile
                    ? homeOverview.system.circulationPumps.slice(0, 3).map((pump) => (
                        <div key={pump.name} className="home-system-row">
                          <span className={`home-system-caption${pump.tone === 'fault' ? ' is-fault' : ''}`}>{pump.name}</span>
                          <span className={`home-system-state ${pump.tone === 'running' ? 'is-on' : pump.tone === 'fault' ? 'is-fault' : 'is-off'}`}>
                            {pump.status}
                          </span>
                        </div>
                      ))
                    : null}
                </div>

                {!isDajuyuanProfile ? (
                  <div className="home-system-node home-system-node--bypass-valve">{HOME_TEXT.DIFFERENTIAL_BYPASS_VALVE}</div>
                ) : null}

                <div className="home-system-node home-system-node--drain-valve home-system-inline">
                  <span className="home-system-caption">{HOME_TEXT.DRAIN_VALVE}</span>
                  <span className={`home-system-state ${homeOverview.system.drainValveOpen ? 'is-on' : 'is-off'}`}>
                    {homeOverview.system.drainValveOpen ? HOME_TEXT.ON : HOME_TEXT.OFF}
                  </span>
                </div>

                {!isDajuyuanProfile ? (
                  <>
                    <div className="home-system-node home-system-node--pressure-tank">{HOME_TEXT.PRESSURE_TANK}</div>

                    <div className="home-system-node home-system-node--pressure-valve home-system-inline">
                      <span className="home-system-caption">{HOME_TEXT.PRESSURE_VALVE}</span>
                      <span className={`home-system-state ${homeOverview.system.pressureValveOpen ? 'is-on' : 'is-off'}`}>
                        {homeOverview.system.pressureValveOpen ? HOME_TEXT.ON : HOME_TEXT.OFF}
                      </span>
                    </div>

                    <div className="home-system-node home-system-node--makeup-pump">
                      <div className="home-system-caption">{HOME_TEXT.MAKEUP_PUMP}</div>
                      {homeOverview.system.makeupPumps.slice(0, 2).map((pump) => (
                        <div key={pump.name} className="home-system-row">
                          <span className={`home-system-caption${pump.tone === 'fault' ? ' is-fault' : ''}`}>{pump.name}</span>
                          <span className={`home-system-state ${pump.tone === 'running' ? 'is-on' : pump.tone === 'fault' ? 'is-fault' : 'is-off'}`}>
                            {pump.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="home-system-node home-system-node--water-tank home-system-inline">
                      <span className="home-system-caption">{HOME_TEXT.WATER_TANK}</span>
                      <span className="home-system-value">{homeOverview.system.waterTankLevel}</span>
                      <span className="home-system-unit">%</span>
                    </div>

                    <div className="home-system-node home-system-node--soft-water">{HOME_TEXT.SOFT_WATER}</div>
                  </>
                ) : null}
                <div className="home-system-node home-system-node--terminal-building">{HOME_TEXT.TERMINAL_BUILDING}</div>
                {/* 末端建筑查看详情暂时不用，隐藏提示与遮罩层（保留代码便于恢复）
                <div className="home-system-node home-system-node--terminal-building-tip">{HOME_TEXT.TERMINAL_BUILDING_TIP}</div>
                */}
                <div className="home-system-node home-system-node--heat-pump-click-tip">{HOME_TEXT.HEAT_PUMP_PAGE_TIP}</div>
                <button
                  type="button"
                  className="home-system-hitbox home-system-hitbox--heat-pump-icon"
                  onClick={goToHeatPumpOverview}
                  aria-label={HOME_TEXT.ENTER_HEAT_PUMP_PAGE}
                />
                {/* 末端建筑遮罩层暂时不用
                <button
                  type="button"
                  className="home-system-hitbox home-system-hitbox--terminal-building-icon"
                  onClick={goToTerminalBuilding}
                  aria-label={HOME_TEXT.ENTER_TERMINAL_PAGE}
                />
                */}
                {/* 设备参数跳转遮罩：left/top/width/height 在 App.css 中按原理图实际位置调整 */}
                {!isDajuyuanProfile ? (
                  <>
                    <button
                      type="button"
                      className="home-system-hitbox home-system-hitbox--heat-trace"
                      onClick={() => navigate('/settings/device-params/heat-trace')}
                      aria-label={HOME_TEXT.ENTER_HEAT_TRACE_PAGE}
                    />
                    <button
                      type="button"
                      className="home-system-hitbox home-system-hitbox--heat-pump-loop-pump"
                      onClick={() => navigate('/settings/device-params/heat-pump-loop-pump')}
                      aria-label={HOME_TEXT.ENTER_LOOP_PUMP_PAGE}
                    />
                    {isSystemType2 ? (
                      <button
                        type="button"
                        className="home-system-hitbox home-system-hitbox--terminal-loop-pump"
                        onClick={() => navigate('/settings/device-params/terminal-loop-pump')}
                        aria-label={HOME_TEXT.ENTER_TERMINAL_LOOP_PUMP_PAGE}
                      />
                    ) : null}
                    <button
                      type="button"
                      className="home-system-hitbox home-system-hitbox--drain-valve"
                      onClick={() => navigate('/settings/device-params/drain-valve')}
                      aria-label={HOME_TEXT.ENTER_DRAIN_VALVE_PAGE}
                    />
                    <button
                      type="button"
                      className="home-system-hitbox home-system-hitbox--relief-valve"
                      onClick={() => navigate('/settings/device-params/relief-valve')}
                      aria-label={HOME_TEXT.ENTER_RELIEF_VALVE_PAGE}
                    />
                    <button
                      type="button"
                      className="home-system-hitbox home-system-hitbox--constant-pressure-pump"
                      onClick={() => navigate('/settings/device-params/constant-pressure-pump')}
                      aria-label={HOME_TEXT.ENTER_CONSTANT_PRESSURE_PAGE}
                    />
                  </>
                ) : null}
              </div>
              <div className="home-canvas-mask" />
            </div>
          </section>

          {hasVisibleSideWidgets ? (
            <aside className="home-side-panel" style={sidePanelStyle}>
              {showModeStatus ? (
                <HomeWidget
                  title={HOME_TEXT.MODE_STATUS}
                  icon={modeStatusIcon}
                  className={`home-widget-mode${showModeSavedCost ? '' : ' home-widget-mode--compact'}`}
                >
                  <div className="home-mode-card">
                    <div className="home-mode-avatar">
                      <img
                        src={modeAvatar}
                        alt=""
                        aria-hidden="true"
                        className={isManualModeAvatar ? 'home-mode-avatar-image is-manual' : 'home-mode-avatar-image'}
                      />
                    </div>
                    <div className="home-mode-body">
                      <div className="home-mode-row">
                        <img src={modeArrowRight} alt="" aria-hidden="true" className="home-mode-row-icon" />
                        <div className="home-mode-name">{homeOverview.mode.name}</div>
                      </div>
                      <img src={modeDivider} alt="" aria-hidden="true" className="home-mode-divider" />
                      <div className="home-mode-row">
                        <img src={modeArrowRight} alt="" aria-hidden="true" className="home-mode-row-icon" />
                        <div className="home-mode-icon-group">
                          {homeOverview.mode.iconAVisible ? <img src={modeAIcon} alt="" aria-hidden="true" className="home-mode-state-icon" /> : null}
                          {homeOverview.mode.iconBVisible ? (
                            <img
                              src={weatherCompensationIcon}
                              alt=""
                              aria-hidden="true"
                              className={homeOverview.mode.iconBBlue ? 'home-mode-state-icon is-blue' : 'home-mode-state-icon'}
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  {showModeSavedCost ? <SavedCostDisplay value={homeOverview.mode.savedCost} /> : null}
                  {showModeSavedCost ? <div className="home-stat-note">{homeOverview.cost.note}</div> : null}
                </HomeWidget>
              ) : null}

              {showCostAnalysis ? (
                <HomeWidget title={HOME_TEXT.COST_ANALYSIS} icon={costAnalysisIcon} className="home-widget-cost">
                  <div className="home-cost-grid">
                    <div className="home-cost-item is-month" style={{ height: '44px' }}>
                      <div className="home-cost-item-label-wrap">
                        <img src={rmbIcon} alt="" aria-hidden="true" className="home-cost-month-icon" />
                        <span className="home-cost-item-label">{HOME_TEXT.THIS_MONTH}</span>
                      </div>
                      <div className="home-cost-item-value">
                        <span className="home-cost-item-number">{homeOverview.cost.month}</span>
                        <span className="home-cost-item-unit">{HOME_TEXT.YUAN}</span>
                      </div>
                    </div>
                    <div className="home-cost-item">
                      <span className="home-cost-item-label">{HOME_TEXT.TODAY}</span>
                      <div className="home-cost-item-value">
                        <span className="home-cost-item-number">{homeOverview.cost.today}</span>
                        <span className="home-cost-item-unit">{HOME_TEXT.YUAN}</span>
                      </div>
                    </div>
                    <div className="home-cost-item">
                      <span className="home-cost-item-label">{HOME_TEXT.YESTERDAY}</span>
                      <div className="home-cost-item-value">
                        <span className="home-cost-item-number">{homeOverview.cost.yesterday}</span>
                        <span className="home-cost-item-unit">{HOME_TEXT.YUAN}</span>
                      </div>
                    </div>
                  </div>
                </HomeWidget>
              ) : null}

              {showTargetBackwaterTemperature ? (
                <HomeWidget
                  title={HOME_TEXT.REAL_TIME_TEMP}
                  icon={temperatureIcon}
                  className="home-widget-temp"
                  titleRight={homeOverview.system.targetBackwaterTemperature}
                >
                  <RealTimeTemperatureChart
                    labels={temp24HourTrend.labels}
                    supplySeries={temp24HourTrend.supplyData}
                    returnSeries={temp24HourTrend.returnData}
                    targetSeries={temp24HourTrend.targetData}
                  />
                </HomeWidget>
              ) : null}

              {showDeviceStatus ? (
                <HomeWidget title={HOME_TEXT.DEVICE_STATUS} icon={deviceStatusIcon}>
                  <DeviceStatusPanel
                    heatPumpData={deviceStatusHeatPumpData}
                    airCooledModuleData={homeUnitStatusPoll.airCooledModule?.chartData}
                    loopPumpData={homeOverview.deviceStatus.loopPumpItems}
                    showLoopPumpTab={SHOW_DEVICE_STATUS_LOOP_PUMP_TAB}
                    showTerminalLoopPump={isSystemType2}
                    terminalLoopPumpData={terminalCirculationPumps}
                  />
                </HomeWidget>
              ) : null}
            </aside>
          ) : null}
        </div>

        {activePage === HOME_PAGE_VIEW.HEAT_PUMP_OVERVIEW ? (
          <div className="home-page home-hp is-active">
            <div className="home-subpage">
              <HomeHeatPumpOverview
                onBack={goBackHome}
                committedUnitLayoutSlots={committedUnitLayoutSlots}
                heatPumpItems={homeOverview.heatPumpItems}
              />
            </div>
          </div>
        ) : null}

        {activePage === HOME_PAGE_VIEW.TERMINAL_BUILDING ? (
          <div className="home-page home-building is-active">
            <div className="home-subpage">
              <button type="button" className="home-subpage-back" onClick={goBackHome} aria-label={HOME_TEXT.BACK_HOME}>
                <img src={backIcon} alt="" aria-hidden="true" className="home-subpage-back-icon" />
              </button>
              <HomeTerminalBuildingOverview />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default HomePage
