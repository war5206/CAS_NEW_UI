import { useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import constantPressurePumpIcon from '../assets/constant-pressure-pump.svg'
import './DeviceParamPage.css'

function ConstantPressurePumpPage() {
  const [startPressure, setStartPressure] = useState('10')
  const [stopPressure, setStopPressure] = useState('20')

  return (
    <main className="device-param-page">
      <section className="device-param-page__section">
        <h3 className="device-param-page__title">{'参数设置'}</h3>
        <div className="device-param-page__rows">
          <LabeledSelectRow
            label={'定压补水启动压力设置（kPa）'}
            value={startPressure}
            suffix="kPa"
            onChange={setStartPressure}
          />
          <LabeledSelectRow
            label={'定压补水停止压力设置（kPa）'}
            value={stopPressure}
            suffix="kPa"
            onChange={setStopPressure}
          />
        </div>
      </section>
    </main>
  )
}

export default ConstantPressurePumpPage
