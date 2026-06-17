import { lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import PageTransition from '../components/PageTransition'
import { useSystemConfigStore } from '@/features/system/store/systemConfigStore'
import { useAuthStore } from '@/features/auth/store/authStore'
import { isRestrictedSettingsUser } from '@/features/auth/userRole'
import { SHOW_AIR_COOLED_AS_STANDALONE_UNITS } from '@/config/projectProfile'

const AlertsModulePage = lazy(() => import('./AlertsModulePage'))
const ArchiveManagementPage = lazy(() => import('./ArchiveManagementPage'))
const BasicSettingPage = lazy(() => import('./BasicSettingPage'))
const ClimateCompensationPage = lazy(() => import('./ClimateCompensationPage'))
const ColdStatisticsPage = lazy(() => import('./ColdStatisticsPage'))
const ConstantPressurePumpPage = lazy(() => import('./ConstantPressurePumpPage'))
const CostAnalysisPage = lazy(() => import('./CostAnalysisPage'))
const CouplingEnergyPage = lazy(() => import('./CouplingEnergyPage'))
const DataOverviewPage = lazy(() => import('./DataOverviewPage'))
const DrainValvePage = lazy(() => import('./DrainValvePage'))
const HeatPumpLoopPumpPage = lazy(() => import('./HeatPumpLoopPumpPage'))
const HeatPumpPage = lazy(() => import('./HeatPumpPage'))
const HeatStatisticsPage = lazy(() => import('./HeatStatisticsPage'))
const HeatTracePage = lazy(() => import('./HeatTracePage'))
const ModeSelectPage = lazy(() => import('./ModeSelectPage'))
const MonitorEmptyPage = lazy(() => import('./MonitorEmptyPage'))
const OperationsDeviceManagementPage = lazy(() => import('./OperationsDeviceManagementPage'))
const OperationsSystemManagementPage = lazy(() => import('./OperationsSystemManagementPage'))
const PeakValleyPage = lazy(() => import('./PeakValleyPage'))
const PowerStatisticsPage = lazy(() => import('./PowerStatisticsPage'))
const ReliefValvePage = lazy(() => import('./ReliefValvePage'))
const SmartStartStopPage = lazy(() => import('./SmartStartStopPage'))
const SmartTimerPage = lazy(() => import('./SmartTimerPage'))
const SystemManualPage = lazy(() => import('./SystemManualPage'))
const SystemParamsPage = lazy(() => import('./SystemParamsPage'))
const TerminalLoopPumpPage = lazy(() => import('./TerminalLoopPumpPage'))
const WaterStatisticsPage = lazy(() => import('./WaterStatisticsPage'))

function ModulePage({
  routeInfo,
  onUnsavedGuardChange,
  onSecondaryNavVisibilityChange,
  onModuleTabsVisibilityChange,
  onDetailBreadcrumbChange,
  onUnitLayoutCommitted,
}) {
  const { module, section, tab } = routeInfo
  const { systemTypeUuid } = useSystemConfigStore()
  const { userRole } = useAuthStore()
  const isSystemType2 = String(systemTypeUuid) === '2'
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
      content = isSystemType2 ? <TerminalLoopPumpPage /> : <Navigate to="/settings/device-params/heat-pump-loop-pump" replace />
    }

    if (tab?.id === 'heat-pump') {
      content = <HeatPumpPage deviceModuleType="heat-pump" />
    }

    if (tab?.id === 'air-cooled-module') {
      content = SHOW_AIR_COOLED_AS_STANDALONE_UNITS ? (
        <HeatPumpPage deviceModuleType="air-cooled-module" />
      ) : (
        <Navigate to="/settings/device-params/heat-pump" replace />
      )
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
    if (isRestrictedSettingsUser(userRole)) {
      content = <Navigate to="/settings/mode-select" replace />
    } else {
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
    if (tab.id === 'ops-terminal-loop-pump' && !isSystemType2) {
      content = <Navigate to="/operations/device-management/heat-pump-loop-pump" replace />
    } else {
      content = <OperationsDeviceManagementPage tabId={tab.id} />
    }
  }

  if (!content && module.id === 'operations' && section?.id === 'archive') {
    content = <ArchiveManagementPage />
  }

  if (!content && module.id === 'operations' && section?.id === 'manual') {
    content = <SystemManualPage />
  }

  if (!content && module.id === 'settings' && section?.id === 'base-setting') {
    if (isRestrictedSettingsUser(userRole)) {
      content = <Navigate to="/settings/mode-select" replace />
    } else {
      content = <BasicSettingPage tabId={tab?.id} />
    }
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

  return (
    <Suspense fallback={null}>
      <PageTransition transitionKey={routeInfo.key}>{content}</PageTransition>
    </Suspense>
  )
}

export default ModulePage
