import HeatPumpLoopPumpPage from './HeatPumpLoopPumpPage'
import TerminalLoopPumpPage from './TerminalLoopPumpPage'
import HeatPumpPage from './HeatPumpPage'
import HeatTracePage from './HeatTracePage'
import ConstantPressurePumpPage from './ConstantPressurePumpPage'
import DrainValvePage from './DrainValvePage'
import ReliefValvePage from './ReliefValvePage'

function ModulePage({ routeInfo }) {
  const { module, section, tab } = routeInfo
  const isDeviceParamsSection = module.id === 'settings' && section?.id === 'device-params'

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
