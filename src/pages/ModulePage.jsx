import PageTransition from '../components/PageTransition'
import AlertsModulePage from './AlertsModulePage'
import ArchiveManagementPage from './ArchiveManagementPage'
import BasicSettingPage from './BasicSettingPage'
import ClimateCompensationPage from './ClimateCompensationPage'
import ColdStatisticsPage from './ColdStatisticsPage'
import ConstantPressurePumpPage from './ConstantPressurePumpPage'
import CostAnalysisPage from './CostAnalysisPage'
import CouplingEnergyPage from './CouplingEnergyPage'
import DataOverviewPage from './DataOverviewPage'
import DrainValvePage from './DrainValvePage'
import HeatPumpLoopPumpPage from './HeatPumpLoopPumpPage'
import HeatPumpPage from './HeatPumpPage'
import HeatStatisticsPage from './HeatStatisticsPage'
import HeatTracePage from './HeatTracePage'
import ModeSelectPage from './ModeSelectPage'
import MonitorEmptyPage from './MonitorEmptyPage'
import OperationsDeviceManagementPage from './OperationsDeviceManagementPage'
import OperationsSystemManagementPage from './OperationsSystemManagementPage'
import PeakValleyPage from './PeakValleyPage'
import PowerStatisticsPage from './PowerStatisticsPage'
import ReliefValvePage from './ReliefValvePage'
import SmartStartStopPage from './SmartStartStopPage'
import SmartTimerPage from './SmartTimerPage'
import SystemManualPage from './SystemManualPage'
import SystemParamsPage from './SystemParamsPage'
import TerminalLoopPumpPage from './TerminalLoopPumpPage'
import WaterStatisticsPage from './WaterStatisticsPage'

function ModulePage({
  routeInfo,
  onUnsavedGuardChange,
  onSecondaryNavVisibilityChange,
  onModuleTabsVisibilityChange,
  onDetailBreadcrumbChange,
  onUnitLayoutCommitted,
}) {
  const { module, section, tab } = routeInfo
  let content = null

  const isModeSelectSection = module.id === 'settings' && section?.id === 'mode-select'
  const isDeviceParamsSection = module.id === 'settings' && section?.id === 'device-params'

  if (isModeSelectSection) {
    content = <ModeSelectPage />
  }

  if (!content && isDeviceParamsSection) {
    if (tab?.id === 'hp-loop-pump') {
      content = <HeatPumpLoopPumpPage />
    }

    if (tab?.id === 'terminal-loop-pump') {
      content = <TerminalLoopPumpPage />
    }

    if (tab?.id === 'heat-pump') {
      content = <HeatPumpPage />
    }

    if (tab?.id === 'heat-trace') {
      content = <HeatTracePage />
    }

    if (tab?.id === 'constant-pressure-pump') {
      content = <ConstantPressurePumpPage />
    }

    if (tab?.id === 'drain-valve') {
      content = <DrainValvePage />
    }

    if (tab?.id === 'relief-valve') {
      content = <ReliefValvePage />
    }
  }

  const isBaseSettingSystemParamsPage =
    module.id === 'settings' && section?.id === 'base-setting' && tab?.id === 'system-params'

  if (!content && isBaseSettingSystemParamsPage) {
    content = (
      <SystemParamsPage
        onUnsavedGuardChange={onUnsavedGuardChange}
        onSecondaryNavVisibilityChange={onSecondaryNavVisibilityChange}
        onModuleTabsVisibilityChange={onModuleTabsVisibilityChange}
        onDetailBreadcrumbChange={onDetailBreadcrumbChange}
        onUnitLayoutCommitted={onUnitLayoutCommitted}
      />
    )
  }

  if (!content && module.id === 'settings' && section?.id === 'mode-setting' && tab?.id === 'climate') {
    content = <ClimateCompensationPage />
  }

  if (!content && module.id === 'settings' && section?.id === 'mode-setting' && tab?.id === 'start-stop') {
    content = <SmartStartStopPage />
  }

  if (!content && module.id === 'settings' && section?.id === 'mode-setting' && tab?.id === 'peak') {
    content = <PeakValleyPage />
  }

  if (!content && module.id === 'settings' && section?.id === 'mode-setting' && tab?.id === 'timer') {
    content = <SmartTimerPage />
  }

  if (!content && module.id === 'settings' && section?.id === 'mode-setting' && tab?.id === 'coupling') {
    content = <CouplingEnergyPage />
  }

  if (!content && module.id === 'analysis' && section?.id === 'data-overview') {
    content = <DataOverviewPage />
  }

  if (!content && module.id === 'analysis' && section?.id === 'power') {
    content = <PowerStatisticsPage />
  }

  if (!content && module.id === 'analysis' && section?.id === 'water') {
    content = <WaterStatisticsPage />
  }

  if (!content && module.id === 'analysis' && section?.id === 'heat') {
    content = <HeatStatisticsPage />
  }

  if (!content && module.id === 'analysis' && section?.id === 'cold') {
    content = <ColdStatisticsPage />
  }

  if (!content && module.id === 'analysis' && section?.id === 'cost') {
    content = <CostAnalysisPage />
  }

  if (!content && module.id === 'alerts' && section) {
    content = <AlertsModulePage sectionId={section.id} onDetailBreadcrumbChange={onDetailBreadcrumbChange} />
  }

  if (!content && module.id === 'monitor') {
    content = <MonitorEmptyPage />
  }

  if (!content && module.id === 'operations' && section?.id === 'system-management' && tab) {
    content = <OperationsSystemManagementPage tabId={tab.id} />
  }

  if (!content && module.id === 'operations' && section?.id === 'device-management' && tab) {
    content = <OperationsDeviceManagementPage tabId={tab.id} />
  }

  if (!content && module.id === 'operations' && section?.id === 'archive') {
    content = <ArchiveManagementPage />
  }

  if (!content && module.id === 'operations' && section?.id === 'manual') {
    content = <SystemManualPage />
  }

  if (!content && module.id === 'settings' && section?.id === 'base-setting') {
    content = <BasicSettingPage tabId={tab?.id} />
  }

  if (!content) {
    content = (
      <div className="placeholder-card module-placeholder">
        <div className="placeholder-title">{module.label}模块</div>
        <div className="placeholder-meta">当前页面：{section?.label ?? '一级模块'}</div>
        {tab ? <div className="placeholder-meta">当前 Tab：{tab.label}</div> : null}
        <div className="placeholder-note">内容区域待补充</div>
      </div>
    )
  }

  return <PageTransition transitionKey={routeInfo.key}>{content}</PageTransition>
}

export default ModulePage
