import HeatPumpLoopPumpPage from './HeatPumpLoopPumpPage'
import TerminalLoopPumpPage from './TerminalLoopPumpPage'
import HeatPumpPage from './HeatPumpPage'
import HeatTracePage from './HeatTracePage'
import ConstantPressurePumpPage from './ConstantPressurePumpPage'
import DrainValvePage from './DrainValvePage'
import ReliefValvePage from './ReliefValvePage'
import ModeSelectPage from './ModeSelectPage'
import ClimateCompensationPage from './ClimateCompensationPage'
import CouplingEnergyPage from './CouplingEnergyPage'
import BasicSettingPage from './BasicSettingPage'
import SystemParamsPage from './SystemParamsPage'
import SmartStartStopPage from './SmartStartStopPage'
import PeakValleyPage from './PeakValleyPage'
import SmartTimerPage from './SmartTimerPage'
import AlertsModulePage from './AlertsModulePage'
import DataOverviewPage from './DataOverviewPage'
import PowerStatisticsPage from './PowerStatisticsPage'
import WaterStatisticsPage from './WaterStatisticsPage'
import HeatStatisticsPage from './HeatStatisticsPage'
import ColdStatisticsPage from './ColdStatisticsPage'
import CostAnalysisPage from './CostAnalysisPage'
import OperationsSystemManagementPage from './OperationsSystemManagementPage'
import OperationsDeviceManagementPage from './OperationsDeviceManagementPage'

function ModulePage({
  routeInfo,
  onUnsavedGuardChange,
  onSecondaryNavVisibilityChange,
  onModuleTabsVisibilityChange,
  onDetailBreadcrumbChange,
  onUnitLayoutCommitted,
}) {
  const { module, section, tab } = routeInfo
  const isModeSelectSection = module.id === 'settings' && section?.id === 'mode-select'
  const isDeviceParamsSection = module.id === 'settings' && section?.id === 'device-params'

  if (isModeSelectSection) {
    return <ModeSelectPage />
  }

  if (isDeviceParamsSection) {
    if (tab?.id === 'hp-loop-pump') {
      return <HeatPumpLoopPumpPage />
    }

    if (tab?.id === 'terminal-loop-pump') {
      return <TerminalLoopPumpPage />
    }

    if (tab?.id === 'heat-pump') {
      return <HeatPumpPage />
    }

    if (tab?.id === 'heat-trace') {
      return <HeatTracePage />
    }

    if (tab?.id === 'constant-pressure-pump') {
      return <ConstantPressurePumpPage />
    }

    if (tab?.id === 'drain-valve') {
      return <DrainValvePage />
    }

    if (tab?.id === 'relief-valve') {
      return <ReliefValvePage />
    }
  }

  const isBaseSettingSystemParamsPage =
    module.id === 'settings' && section?.id === 'base-setting' && tab?.id === 'system-params'

  if (isBaseSettingSystemParamsPage) {
    return (
      <SystemParamsPage
        onUnsavedGuardChange={onUnsavedGuardChange}
        onSecondaryNavVisibilityChange={onSecondaryNavVisibilityChange}
        onModuleTabsVisibilityChange={onModuleTabsVisibilityChange}
        onDetailBreadcrumbChange={onDetailBreadcrumbChange}
        onUnitLayoutCommitted={onUnitLayoutCommitted}
      />
    )
  }

  const isModeSettingClimatePage =
    module.id === 'settings' && section?.id === 'mode-setting' && tab?.id === 'climate'

  if (isModeSettingClimatePage) {
    return <ClimateCompensationPage />
  }

  const isModeSettingStartStopPage =
    module.id === 'settings' && section?.id === 'mode-setting' && tab?.id === 'start-stop'

  if (isModeSettingStartStopPage) {
    return <SmartStartStopPage />
  }

  const isModeSettingPeakValleyPage =
    module.id === 'settings' && section?.id === 'mode-setting' && tab?.id === 'peak'

  if (isModeSettingPeakValleyPage) {
    return <PeakValleyPage />
  }
  const isModeSettingTimerPage =
    module.id === 'settings' && section?.id === 'mode-setting' && tab?.id === 'timer'

  if (isModeSettingTimerPage) {
    return <SmartTimerPage />
  }



  const isAnalysisDataOverviewPage = module.id === 'analysis' && section?.id === 'data-overview'

  if (isAnalysisDataOverviewPage) {
    return <DataOverviewPage />
  }

  const isAnalysisPowerStatisticsPage = module.id === 'analysis' && section?.id === 'power'

  if (isAnalysisPowerStatisticsPage) {
    return <PowerStatisticsPage />
  }

  const isAnalysisWaterStatisticsPage = module.id === 'analysis' && section?.id === 'water'

  if (isAnalysisWaterStatisticsPage) {
    return <WaterStatisticsPage />
  }

  const isAnalysisHeatStatisticsPage = module.id === 'analysis' && section?.id === 'heat'

  if (isAnalysisHeatStatisticsPage) {
    return <HeatStatisticsPage />
  }

  const isAnalysisColdStatisticsPage = module.id === 'analysis' && section?.id === 'cold'

  if (isAnalysisColdStatisticsPage) {
    return <ColdStatisticsPage />
  }

  const isAnalysisCostAnalysisPage = module.id === 'analysis' && section?.id === 'cost'

  if (isAnalysisCostAnalysisPage) {
    return <CostAnalysisPage />
  }

  const isAlertsPage = module.id === 'alerts' && section

  if (isAlertsPage) {
    return <AlertsModulePage sectionId={section.id} onDetailBreadcrumbChange={onDetailBreadcrumbChange} />
  }

  const isOperationsSystemManagementPage =
    module.id === 'operations' && section?.id === 'system-management' && tab

  if (isOperationsSystemManagementPage) {
    return <OperationsSystemManagementPage tabId={tab.id} />
  }

  const isOperationsDeviceManagementPage =
    module.id === 'operations' && section?.id === 'device-management' && tab

  if (isOperationsDeviceManagementPage) {
    return <OperationsDeviceManagementPage tabId={tab.id} />
  }

  const isModeSettingCouplingPage =
    module.id === 'settings' && section?.id === 'mode-setting' && tab?.id === 'coupling'

  if (isModeSettingCouplingPage) {
    return <CouplingEnergyPage />
  }

  const isBasicSettingSection = module.id === 'settings' && section?.id === 'base-setting'

  if (isBasicSettingSection) {
    return <BasicSettingPage tabId={tab?.id} />
  }

  return (
    <div className="placeholder-card module-placeholder">
      <div className="placeholder-title">{module.label}模块</div>
      <div className="placeholder-meta">当前页面：{section?.label ?? '一级模块'}</div>
      {tab ? <div className="placeholder-meta">当前 Tab：{tab.label}</div> : null}
      <div className="placeholder-note">内容区域待填充</div>
    </div>
  )
}

export default ModulePage
