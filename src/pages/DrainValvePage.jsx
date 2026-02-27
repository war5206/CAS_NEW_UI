import { useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import drainValveIcon from '../assets/drain-value.svg'
import './DeviceParamPage.css'

function DrainValvePage() {
  const [drainTimePoint, setDrainTimePoint] = useState('08:00')
  const [drainCycleDays, setDrainCycleDays] = useState('05')
  const [drainDurationSec, setDrainDurationSec] = useState('10')

  return (
    <main className="device-param-page">
      <FeatureInfoCard icon={drainValveIcon} iconAlt={'\u6392\u6c61\u9600'} title={'\u6392\u6c61\u9600'} selected />

      <section className="device-param-page__section">
        <h3 className="device-param-page__title">{'\u53c2\u6570\u8bbe\u7f6e'}</h3>
        <div className="device-param-page__rows">
          <LabeledSelectRow
            label={'\u6392\u6c61\u65f6\u95f4\u70b9'}
            description={'\u6392\u6c61\u7684\u65f6\u95f4\u8bbe\u5b9a'}
            value={drainTimePoint}
            onChange={setDrainTimePoint}
            showIndicator
            useModeCardControl
          />
          <LabeledSelectRow
            label={'\u6392\u6c61\u5468\u671f\uff08\u5929\uff09'}
            value={drainCycleDays}
            onChange={setDrainCycleDays}
            useModeCardControl
          />
          <LabeledSelectRow
            label={'\u6392\u6c61\u6301\u7eed\u65f6\u95f4\uff08\u79d2\uff09'}
            value={drainDurationSec}
            onChange={setDrainDurationSec}
            useModeCardControl
          />
        </div>
      </section>
    </main>
  )
}

export default DrainValvePage
