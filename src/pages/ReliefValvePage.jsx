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
      <section className="device-param-page__section">
        <h3 className="device-param-page__title">{'参数设置'}</h3>
        <div className="device-param-page__rows">
          <LabeledSelectRow
            label={'泄压补水启动压力设定（kPa）'}
            value={startPressure}
            suffix="kPa"
            onChange={setStartPressure}
          />
          <LabeledSelectRow
            label={'泄压补水停止压力设定（kPa）'}
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
