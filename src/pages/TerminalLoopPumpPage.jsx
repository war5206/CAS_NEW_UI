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
        iconAlt={'水泵'}
        title={'水泵间隔循环节能功能'}
        description={'开启时，水泵按照间隔启/停的节能方式运行'}
        selected
      />

      <section className="device-param-page__section">
        <h3 className="device-param-page__title">{'运行模式'}</h3>
        <div className="device-param-page__mode-grid">
          <ModeOptionCard
            icon={fixedFrequencyIcon}
            iconAlt={'定频'}
            label={'定频'}
            selected={mode === 'fixed'}
            onClick={() => setMode('fixed')}
          />
          <ModeOptionCard
            icon={variableFrequencyIcon}
            iconAlt={'变频'}
            label={'变频'}
            selected={mode === 'variable'}
            onClick={() => setMode('variable')}
          />
        </div>
      </section>

      <section className="device-param-page__section">
        <div className="device-param-page__rows">
          <LabeledSelectRow
            label={'压差设定（kPa）'}
            description={'变频供水泵下通过调节频率维持此压差'}
            value={pressureDiff}
            onChange={setPressureDiff}
            showIndicator
            useModeCardControl
          />
        </div>
      </section>

      <section className="device-param-page__section">
        <h3 className="device-param-page__title">{'循环设置'}</h3>
        <div className="device-param-page__rows">
          <LabeledSelectRow
            label={'末端循环泵轮值时间（天）'}
            description={'循环泵主备相互切换的时间'}
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
