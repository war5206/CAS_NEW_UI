import systemMap from '../assets/system.png'
import modeStatusIcon from '../assets/modeStatus.svg'
import costAnalysisIcon from '../assets/costAnalysis.svg'
import temperatureIcon from '../assets/temperature.svg'
import deviceStatusIcon from '../assets/deviceStatus.svg'
import avatarA from '../assets/A.png'
import rmbIcon from '../assets/rmb.svg'
import modeArrowRight from '../assets/modeStatusArrowRight.svg'
import modeDivider from '../assets/modeStatusDivider.svg'
import heatingIcon from '../assets/heating.png'
import intelligentIcon from '../assets/intelligent.svg'
import HomeWidget from '../components/HomeWidget'
import SavedCostDisplay from '../components/SavedCostDisplay'
import RealTimeTemperatureChart from '../components/RealTimeTemperatureChart'
import DeviceStatusPanel from '../components/DeviceStatusPanel'

function HomePage() {
  return (
    <div className="home-screen">
      <section className="home-system-panel">
        <div className="home-system-canvas">
          <img src={systemMap} alt={'\u7cfb\u7edf\u539f\u7406\u56fe\u5360\u4f4d'} className="home-system-image" />
          <div className="home-canvas-mask" />
          <div className="home-pager">
            <span className="home-pager-dot is-active" />
            <span className="home-pager-dot" />
            <span className="home-pager-dot" />
          </div>
        </div>
      </section>

      <aside className="home-side-panel">
        <HomeWidget title={'\u6a21\u5f0f\u72b6\u6001'} icon={modeStatusIcon} className="home-widget-mode">
          <div className="home-mode-card">
            <div className="home-mode-avatar">
              <img src={avatarA} alt="" aria-hidden="true" />
            </div>
            <div className="home-mode-body">
              <div className="home-mode-row">
                <img src={modeArrowRight} alt="" aria-hidden="true" className="home-mode-row-icon" />
                <div className="home-mode-name">{'\u667a\u80fd\u6a21\u5f0f\u8fd0\u884c\u4e2d'}</div>
              </div>
              <img src={modeDivider} alt="" aria-hidden="true" className="home-mode-divider" />
              <div className="home-mode-row">
                <img src={modeArrowRight} alt="" aria-hidden="true" className="home-mode-row-icon" />
                <div className="home-mode-icon-group">
                  <img src={heatingIcon} alt="" aria-hidden="true" className="home-mode-state-icon" />
                  <img src={intelligentIcon} alt="" aria-hidden="true" className="home-mode-state-icon" />
                </div>
              </div>
            </div>
          </div>

          <SavedCostDisplay value="222.7" />
          <div className="home-stat-note">{'\u6ce8\uff1a\u8d39\u7528\u7ed3\u7b97\u81ea2026\u5e743\u670815\u65e5\u81f3\u4eca\u65e5'}</div>
        </HomeWidget>

        <HomeWidget title={'\u8d39\u7528\u7edf\u8ba1'} icon={costAnalysisIcon} className="home-widget-cost">
          <div className="home-cost-grid">
            <div className="home-cost-item is-month" style={{height: '44px'}}>
              <div className="home-cost-item-label-wrap">
                <img src={rmbIcon} alt="" aria-hidden="true" className="home-cost-month-icon" />
                <span className="home-cost-item-label">{'\u672c\u6708'}</span>
              </div>
              <div className="home-cost-item-value">
                <span className="home-cost-item-number">108.13</span>
                <span className="home-cost-item-unit">{'\u5143'}</span>
              </div>
            </div>
            <div className="home-cost-item">
              <span className="home-cost-item-label">{'\u4eca\u65e5'}</span>
              <div className="home-cost-item-value">
                <span className="home-cost-item-number">7.33</span>
                <span className="home-cost-item-unit">{'\u5143'}</span>
              </div>
            </div>
            <div className="home-cost-item">
              <span className="home-cost-item-label">{'\u6628\u65e5'}</span>
              <div className="home-cost-item-value">
                <span className="home-cost-item-number">8.12</span>
                <span className="home-cost-item-unit">{'\u5143'}</span>
              </div>
            </div>
          </div>
        </HomeWidget>

        <HomeWidget
          title={'\u5b9e\u65f6\u6e29\u5ea6'}
          icon={temperatureIcon}
          titleRight={'\u73af\u5883\u6e29\u5ea6\uff1a -2.1\u2103'}
        >
          <RealTimeTemperatureChart />
        </HomeWidget>

        <HomeWidget title={'\u8bbe\u5907\u72b6\u6001'} icon={deviceStatusIcon}>
          <DeviceStatusPanel />
        </HomeWidget>
      </aside>
    </div>
  )
}

export default HomePage
