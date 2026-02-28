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
      <section className="device-param-page__section">
        <h3 className="device-param-page__title">{'参数设置'}</h3>
        <div className="device-param-page__rows">
          <LabeledSelectRow
            label={'排污时间点'}
            description={'排污的时间设定'}
            value={drainTimePoint}
            onChange={setDrainTimePoint}
            popupType="time"
            useModeCardControl
          />
          <LabeledSelectRow
            label={'排污周期（天）'}
            value={drainCycleDays}
            suffix={'天'}
            onChange={setDrainCycleDays}
            useModeCardControl
          />
          <LabeledSelectRow
            label={'排污持续时间（秒）'}
            value={drainDurationSec}
            suffix={'秒'}
            onChange={setDrainDurationSec}
            useModeCardControl
          />
        </div>
      </section>
    </main>
  )
}

export default DrainValvePage
