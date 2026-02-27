import { useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import ModeOptionCard from '../components/ModeOptionCard'
import waterPumpIcon from '../assets/water-pump.svg'
import fixedFrequencyIcon from '../assets/fixed-frequency.svg'
import variableFrequencyIcon from '../assets/frequency-conversion.svg'
import './DeviceParamPage.css'

function TerminalLoopPumpPage() {
  const [mode, setMode] = useState('variable')
  const [pressureDiff, setPressureDiff] = useState('10')
  const [rotationDays, setRotationDays] = useState('10')

  return (
    <main className="device-param-page">
      <FeatureInfoCard
        icon={waterPumpIcon}
        iconAlt={'\u6c34\u6cf5'}
        title={'\u6c34\u6cf5\u95f4\u9694\u5faa\u73af\u8282\u80fd\u529f\u80fd'}
        description={'\u5f00\u542f\u65f6\uff0c\u6c34\u6cf5\u6309\u7167\u95f4\u9694\u542f/\u505c\u7684\u8282\u80fd\u65b9\u5f0f\u8fd0\u884c'}
        selected
      />

      <section className="device-param-page__section">
        <h3 className="device-param-page__title">{'\u8fd0\u884c\u6a21\u5f0f'}</h3>
        <div className="device-param-page__mode-grid">
          <ModeOptionCard
            icon={fixedFrequencyIcon}
            iconAlt={'\u5b9a\u9891'}
            label={'\u5b9a\u9891'}
            selected={mode === 'fixed'}
            onClick={() => setMode('fixed')}
          />
          <ModeOptionCard
            icon={variableFrequencyIcon}
            iconAlt={'\u53d8\u9891'}
            label={'\u53d8\u9891'}
            selected={mode === 'variable'}
            onClick={() => setMode('variable')}
          />
        </div>
      </section>

      <section className="device-param-page__section">
        <div className="device-param-page__rows">
          <LabeledSelectRow
            label={'\u538b\u5dee\u8bbe\u5b9a\uff08kPa\uff09'}
            description={'\u53d8\u9891\u4f9b\u6c34\u6cf5\u4e0b\u901a\u8fc7\u8c03\u8282\u9891\u7387\u7ef4\u6301\u6b64\u538b\u5dee'}
            value={pressureDiff}
            onChange={setPressureDiff}
            showIndicator
            useModeCardControl
          />
        </div>
      </section>

      <section className="device-param-page__section">
        <h3 className="device-param-page__title">{'\u5faa\u73af\u8bbe\u7f6e'}</h3>
        <div className="device-param-page__rows">
          <LabeledSelectRow
            label={'\u672b\u7aef\u5faa\u73af\u6cf5\u8f6e\u503c\u65f6\u95f4\uff08\u5929\uff09'}
            description={'\u5faa\u73af\u6cf5\u4e3b\u5907\u76f8\u4e92\u5207\u6362\u7684\u65f6\u95f4'}
            value={rotationDays}
            onChange={setRotationDays}
            showIndicator
            useModeCardControl
          />
        </div>
      </section>
    </main>
  )
}

export default TerminalLoopPumpPage
