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
      <FeatureInfoCard icon={constantPressurePumpIcon} iconAlt={'\u5b9a\u538b\u6cf5'} title={'\u5b9a\u538b\u6cf5'} selected />

      <section className="device-param-page__section">
        <h3 className="device-param-page__title">{'\u53c2\u6570\u8bbe\u7f6e'}</h3>
        <div className="device-param-page__rows">
          <LabeledSelectRow
            label={'\u5b9a\u538b\u8865\u6c34\u542f\u52a8\u538b\u529b\u8bbe\u7f6e\uff08kPa\uff09'}
            value={startPressure}
            suffix="kPa"
            onChange={setStartPressure}
          />
          <LabeledSelectRow
            label={'\u5b9a\u538b\u8865\u6c34\u505c\u6b62\u538b\u529b\u8bbe\u7f6e\uff08kPa\uff09'}
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
