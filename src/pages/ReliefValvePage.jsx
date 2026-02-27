import { useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import pressureReliefValveIcon from '../assets/pressure-relief-valve.svg'
import './DeviceParamPage.css'

function ReliefValvePage() {
  const [startPressure, setStartPressure] = useState('10')
  const [stopPressure, setStopPressure] = useState('10')

  return (
    <main className="device-param-page">
      <FeatureInfoCard icon={pressureReliefValveIcon} iconAlt={'\u6cc4\u538b\u9600'} title={'\u6cc4\u538b\u9600'} selected />

      <section className="device-param-page__section">
        <h3 className="device-param-page__title">{'\u53c2\u6570\u8bbe\u7f6e'}</h3>
        <div className="device-param-page__rows">
          <LabeledSelectRow
            label={'\u6cc4\u538b\u8865\u6c34\u542f\u52a8\u538b\u529b\u8bbe\u5b9a\uff08kPa\uff09'}
            value={startPressure}
            suffix="kPa"
            onChange={setStartPressure}
          />
          <LabeledSelectRow
            label={'\u6cc4\u538b\u8865\u6c34\u505c\u6b62\u538b\u529b\u8bbe\u5b9a\uff08kPa\uff09'}
            value={stopPressure}
            suffix="kPa"
            onChange={setStopPressure}
          />
        </div>
      </section>
    </main>
  )
}

export default ReliefValvePage
