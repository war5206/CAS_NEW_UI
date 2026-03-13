import { useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import couplingEnergyIcon from '../assets/icons/couple-energy.svg'
import './CouplingEnergyPage.css'

function CouplingEnergyIcon() {
  return <img src={couplingEnergyIcon} alt="" aria-hidden="true" />
}

function CouplingEnergyPage() {
  const [isCouplingEnabled, setIsCouplingEnabled] = useState(true)

  return (
    <main className="coupling-energy-page">
      <FeatureInfoCard
        icon={<CouplingEnergyIcon />}
        title="耦合能源"
        description="开启时，耦合能源参与系统的运行"
        selected={isCouplingEnabled}
        onClick={() => setIsCouplingEnabled((previous) => !previous)}
        className="coupling-energy-page__card"
        confirmConfig={({ nextSelected }) => ({
          message: `确认${nextSelected ? '开启' : '关闭'}耦合能源吗？`,
        })}
      />
    </main>
  )
}

export default CouplingEnergyPage
