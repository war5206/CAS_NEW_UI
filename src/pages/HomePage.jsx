import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import systemMap from '../assets/home/system.png'
import modeStatusIcon from '../assets/home/modeStatus.svg'
import costAnalysisIcon from '../assets/home/costAnalysis.svg'
import temperatureIcon from '../assets/home/temperature.svg'
import deviceStatusIcon from '../assets/home/deviceStatus.svg'
import avatarA from '../assets/home/A.png'
import rmbIcon from '../assets/home/rmb.svg'
import modeArrowRight from '../assets/home/modeStatusArrowRight.svg'
import modeDivider from '../assets/home/modeStatusDivider.svg'
import heatingIcon from '../assets/device/heating-active.svg'
import weatherCompensationIcon from '../assets/home/weather-compensation.svg'
import backIcon from '../assets/layout/back.svg'
import HomeWidget from '../components/HomeWidget'
import HomeHeatPumpOverview from '../components/HomeHeatPumpOverview'
import HomeTerminalBuildingOverview from '../components/HomeTerminalBuildingOverview'
import SavedCostDisplay from '../components/SavedCostDisplay'
import RealTimeTemperatureChart from '../components/RealTimeTemperatureChart'
import DeviceStatusPanel from '../components/DeviceStatusPanel'
import { useHomeOverviewQuery } from '../features/home/hooks/useHomeOverviewQuery'

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
  RUNNING_COUNT: '运行台数',
  DEFROST: '化霜',
  UNIT: '台',
  STANDBY_COUNT: '待机台数',
  FAULT: '故障',
  OUTDOOR_TEMP: '室外温度',
  CELSIUS: '℃',
  CONDENSATE_WATER: '冷凝水',
  HEAT_TRACING_BELT: '伴热带',
  OFF: '已关闭',
  CONDENSATE_PIPE: '冷凝水管',
  COUPLING_ENERGY: '耦合能源',
  ON: '已开启',
  WATER_PUMP: '水泵',
  SUPPLY_TEMP: '供水温度',
  SUPPLY_PRESSURE: '供水压力',
  RETURN_PRESSURE: '回水压力',
  RETURN_TEMP: '回水温度',
  HEAT_PUMP_LOOP_PUMP: '热泵循环泵',
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
  MODE_STATUS: '模式状态',
  SMART_MODE_RUNNING: '智能模式运行中',
  COST_NOTE: '注：费用结算自2026年3月15日至今日',
  COST_ANALYSIS: '费用统计',
  THIS_MONTH: '本月',
  TODAY: '今日',
  YESTERDAY: '昨日',
  YUAN: '元',
  REAL_TIME_TEMP: '实时温度',
  AMBIENT_TEMP: '环境温度：-2.1℃',
  DEVICE_STATUS: '设备状态',
  BACK_HOME: '返回主页',
}

function HomePage({ onActivePageChange, committedUnitLayoutSlots }) {
  const location = useLocation()
  const [activePage, setActivePage] = useState(HOME_PAGE_VIEW.DASHBOARD)
  const [isSystemImageLoaded, setIsSystemImageLoaded] = useState(false)
  const isHomeRoute = location.pathname === '/home' || location.pathname === '/home/'
  const { data: homeOverview } = useHomeOverviewQuery({ enabled: isHomeRoute })

  useEffect(() => {
    onActivePageChange?.(HOME_PAGE_TITLE_MAP[activePage] ?? HOME_PAGE_TITLE_MAP[HOME_PAGE_VIEW.DASHBOARD])
  }, [activePage, onActivePageChange])

  useEffect(() => {
    if (location.pathname === '/home' || location.pathname === '/home/') {
      setActivePage(HOME_PAGE_VIEW.DASHBOARD)
    }
  }, [location.pathname])

  const goBackHome = () => setActivePage(HOME_PAGE_VIEW.DASHBOARD)
  const goToHeatPumpOverview = () => setActivePage(HOME_PAGE_VIEW.HEAT_PUMP_OVERVIEW)
  const goToTerminalBuilding = () => setActivePage(HOME_PAGE_VIEW.TERMINAL_BUILDING)
  const statusSummary = homeOverview.system.heatPumpSummary
  return (
    <div className="home-pager">
      <div className="home-pager-track">
        <div className={`home-page home-screen${activePage === HOME_PAGE_VIEW.DASHBOARD ? ' is-active' : ''}`}>
          <section className="home-system-panel">
            <div className="home-system-canvas">
              <img
                src={systemMap}
                alt={HOME_TEXT.SYSTEM_IMAGE_ALT}
                className="home-system-image"
                onLoad={() => setIsSystemImageLoaded(true)}
                onError={() => setIsSystemImageLoaded(true)}
              />
              <div className={`home-system-overlay${isSystemImageLoaded ? ' is-ready' : ''}`}>
                <div className="home-system-node home-system-node--heat-pump">
                  <div className="home-system-caption home-system-caption--title">{HOME_TEXT.HEAT_PUMP_GROUP}</div>
                  <div className="home-system-row">
                    <span className="home-system-caption">{HOME_TEXT.RUNNING_COUNT}</span>
                    <span className="home-system-value">{statusSummary.running}</span>
                    <span className="home-system-extra">
                      ({HOME_TEXT.DEFROST} <span className="home-system-value is-defrost">{statusSummary.defrosting}</span>
                      {HOME_TEXT.UNIT})
                    </span>
                  </div>
                  <div className="home-system-row">
                    <span className="home-system-caption">{HOME_TEXT.STANDBY_COUNT}</span>
                    <span className="home-system-value">{statusSummary.shutdown}</span>
                    <span className="home-system-extra">
                      ({HOME_TEXT.FAULT} <span className="home-system-value is-fault">{statusSummary.malfunction}</span>
                      {HOME_TEXT.UNIT})
                    </span>
                  </div>
                </div>

                <div className="home-system-node home-system-node--outdoor-temperature home-system-inline">
                  <span className="home-system-caption">{HOME_TEXT.OUTDOOR_TEMP}</span>
                  <span className="home-system-value">{homeOverview.system.outdoorTemp}</span>
                  <span className="home-system-unit">{HOME_TEXT.CELSIUS}</span>
                </div>

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

                <div className="home-system-node home-system-node--coupling-energy home-system-inline">
                  <span className="home-system-caption">{HOME_TEXT.COUPLING_ENERGY}</span>
                  <span className={`home-system-state ${homeOverview.system.couplingEnergyEnabled ? 'is-on' : 'is-off'}`}>
                    {homeOverview.system.couplingEnergyEnabled ? HOME_TEXT.ON : HOME_TEXT.OFF}
                  </span>
                </div>

                <div className="home-system-node home-system-node--pump-status home-system-inline">
                  <span className="home-system-caption">{HOME_TEXT.WATER_PUMP}</span>
                  <span className={`home-system-state ${homeOverview.system.waterPumpEnabled ? 'is-on' : 'is-off'}`}>
                    {homeOverview.system.waterPumpEnabled ? HOME_TEXT.ON : HOME_TEXT.OFF}
                  </span>
                </div>

                <div className="home-system-node home-system-node--supply-temperature home-system-inline">
                  <span className="home-system-caption">{HOME_TEXT.SUPPLY_TEMP}</span>
                  <span className="home-system-value">{homeOverview.system.supplyTemp}</span>
                  <span className="home-system-unit">{HOME_TEXT.CELSIUS}</span>
                </div>

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
                  {homeOverview.system.circulationPumps.slice(0, 3).map((pump) => (
                    <div key={pump.name} className="home-system-row">
                      <span className={`home-system-caption${pump.tone === 'fault' ? ' is-fault' : ''}`}>{pump.name}</span>
                      <span className={`home-system-state ${pump.tone === 'running' ? 'is-on' : pump.tone === 'fault' ? 'is-fault' : 'is-off'}`}>
                        {pump.status}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="home-system-node home-system-node--bypass-valve">{HOME_TEXT.DIFFERENTIAL_BYPASS_VALVE}</div>

                <div className="home-system-node home-system-node--drain-valve home-system-inline">
                  <span className="home-system-caption">{HOME_TEXT.DRAIN_VALVE}</span>
                  <span className={`home-system-state ${homeOverview.system.drainValveOpen ? 'is-on' : 'is-off'}`}>
                    {homeOverview.system.drainValveOpen ? HOME_TEXT.ON : HOME_TEXT.OFF}
                  </span>
                </div>

                <div className="home-system-node home-system-node--pressure-tank home-system-inline">
                  <span className="home-system-caption">{HOME_TEXT.PRESSURE_TANK}</span>
                  <span className={`home-system-state ${homeOverview.system.pressureTankOpen ? 'is-on' : 'is-off'}`}>
                    {homeOverview.system.pressureTankOpen ? HOME_TEXT.ON : HOME_TEXT.OFF}
                  </span>
                </div>

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

                <div className="home-system-node home-system-node--water-tank">
                  <div className="home-system-caption">{HOME_TEXT.WATER_TANK}</div>
                  <div className="home-system-inline">
                    <span className="home-system-value">{homeOverview.system.waterTankLevel}</span>
                    <span className="home-system-unit">%</span>
                  </div>
                </div>

                <div className="home-system-node home-system-node--soft-water">{HOME_TEXT.SOFT_WATER}</div>
                <div className="home-system-node home-system-node--terminal-building">{HOME_TEXT.TERMINAL_BUILDING}</div>
                <div className="home-system-node home-system-node--terminal-building-tip">{HOME_TEXT.TERMINAL_BUILDING_TIP}</div>
                <div className="home-system-node home-system-node--heat-pump-click-tip">{HOME_TEXT.HEAT_PUMP_PAGE_TIP}</div>
                <button
                  type="button"
                  className="home-system-hitbox home-system-hitbox--heat-pump-icon"
                  onClick={goToHeatPumpOverview}
                  aria-label={HOME_TEXT.ENTER_HEAT_PUMP_PAGE}
                />
                <button
                  type="button"
                  className="home-system-hitbox home-system-hitbox--terminal-building-icon"
                  onClick={goToTerminalBuilding}
                  aria-label={HOME_TEXT.ENTER_TERMINAL_PAGE}
                />
              </div>
              <div className="home-canvas-mask" />
            </div>
          </section>

          <aside className="home-side-panel">
            <HomeWidget title={HOME_TEXT.MODE_STATUS} icon={modeStatusIcon} className="home-widget-mode">
              <div className="home-mode-card">
                <div className="home-mode-avatar">
                  <img src={avatarA} alt="" aria-hidden="true" />
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
                      <img src={heatingIcon} alt="" aria-hidden="true" className="home-mode-state-icon" />
                      <img src={weatherCompensationIcon} alt="" aria-hidden="true" className="home-mode-state-icon" />
                    </div>
                  </div>
                </div>
              </div>

              <SavedCostDisplay value={homeOverview.mode.savedCost} />
              <div className="home-stat-note">{homeOverview.cost.note}</div>
            </HomeWidget>

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

            <HomeWidget title={HOME_TEXT.REAL_TIME_TEMP} icon={temperatureIcon} titleRight={homeOverview.mode.ambientTempText}>
              <RealTimeTemperatureChart
                labels={homeOverview.temperature.labels}
                supplySeries={homeOverview.temperature.supplyData}
                returnSeries={homeOverview.temperature.returnData}
                targetSeries={homeOverview.temperature.targetData}
              />
            </HomeWidget>

            <HomeWidget title={HOME_TEXT.DEVICE_STATUS} icon={deviceStatusIcon}>
              <DeviceStatusPanel
                heatPumpData={homeOverview.deviceStatus.heatPumpData}
                loopPumpData={homeOverview.deviceStatus.loopPumpItems}
              />
            </HomeWidget>
          </aside>
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
