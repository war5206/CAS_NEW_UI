import FeatureInfoCard from '../components/FeatureInfoCard'
import './CouplingEnergyPage.css'

function CouplingEnergyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="coupling-energy-page__icon" aria-hidden="true">
      <circle cx="6.5" cy="12" r="3.2" />
      <circle cx="17.5" cy="7.2" r="3.2" />
      <circle cx="17.5" cy="16.8" r="3.2" />
      <path d="M9.4 10.6 14.5 8.3M9.4 13.4l5.1 2.3" />
    </svg>
  )
}

function CouplingEnergyPage() {
  return (
    <main className="coupling-energy-page">
      <FeatureInfoCard
        icon={<CouplingEnergyIcon />}
        title="耦合能源"
        description="开启时，耦合能源参与系统的运行"
        selected
        className="coupling-energy-page__card"
      />
    </main>
  )
}

export default CouplingEnergyPage
