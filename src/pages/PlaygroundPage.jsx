import { Link } from 'react-router-dom'
import { useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import ModeOptionCard from '../components/ModeOptionCard'
import waterPumpIcon from '../assets/water-pump.svg'
import weatherCompensationIcon from '../assets/home/weather-compensation.svg'
import thermometerIcon from '../assets/thermometer.svg'
import './PlaygroundPage.css'

function FixedFrequencyIcon() {
  return <span className="playground-mode-token">HZ</span>
}

function VariableFrequencyIcon() {
  return <span className="playground-mode-token is-variable">HZ</span>
}

function PlaygroundPage() {
  const [featureEnabled, setFeatureEnabled] = useState(true)
  const [featurePairSelection, setFeaturePairSelection] = useState('constant-temperature')
  const [mode, setMode] = useState('variable')
  const [pressure, setPressure] = useState('10')

  return (
    <main className="playground-page">
      <header className="playground-page__header">
        <h1 className="playground-page__title">Component Playground</h1>
        <Link to="/home" className="playground-page__back-link">
          {'\u8fd4\u56de\u9996\u9875'}
        </Link>
      </header>

      <section className="playground-section">
        <h2 className="playground-section__title">FeatureInfoCard</h2>
        <FeatureInfoCard
          icon={waterPumpIcon}
          title={'\u6c34\u6cf5\u95f4\u9694\u5faa\u73af\u8282\u80fd\u529f\u80fd'}
          description={'\u5f00\u542f\u65f6\uff0c\u6c34\u6cf5\u6309\u7167\u95f4\u9694\u542f\u505c\u7684\u8282\u80fd\u65b9\u5f0f\u8fd0\u884c'}
          selected={featureEnabled}
          onClick={() => setFeatureEnabled((prev) => !prev)}
        />
      </section>

      <section className="playground-section">
        <h2 className="playground-section__title">FeatureInfoCard Pair</h2>
        <div className="playground-feature-pair">
          <FeatureInfoCard
            icon={weatherCompensationIcon}
            title={'\u6c14\u5019\u8865\u507f'}
            description={'\u6839\u636e\u73af\u5883\u6e29\u5ea6\u4e0d\u540c\u81ea\u52a8\u8c03\u8282\u56de\u6c34\u76ee\u6807\u6e29\u5ea6'}
            selected={featurePairSelection === 'weather-compensation'}
            selectedBadgePosition="start"
            onClick={() => setFeaturePairSelection('weather-compensation')}
            className="playground-feature-pair__item"
          />
          <FeatureInfoCard
            icon={thermometerIcon}
            title={'\u5b9a\u6e29\u6a21\u5f0f'}
            description={'\u56fa\u5b9a\u6e29\u5ea6\u8fd0\u884c'}
            selected={featurePairSelection === 'constant-temperature'}
            onClick={() => setFeaturePairSelection('constant-temperature')}
            className="playground-feature-pair__item"
          />
        </div>
      </section>

      <section className="playground-section">
        <h2 className="playground-section__title">ModeOptionCard</h2>
        <div className="playground-mode-grid">
          <ModeOptionCard
            icon={<FixedFrequencyIcon />}
            label={'\u5b9a\u9891'}
            selected={mode === 'fixed'}
            onClick={() => setMode('fixed')}
          />
          <ModeOptionCard
            icon={<VariableFrequencyIcon />}
            label={'\u53d8\u9891'}
            selected={mode === 'variable'}
            onClick={() => setMode('variable')}
          />
        </div>
      </section>

      <section className="playground-section">
        <h2 className="playground-section__title">LabeledSelectRow</h2>
        <LabeledSelectRow
          label={'\u538b\u5dee\u8bbe\u5b9a\uff08kPa\uff09'}
          description={'\u53d8\u9891\u4f9b\u6c34\u6cf5\u4e0b\u901a\u8fc7\u8c03\u8282\u9891\u7387\u7ef4\u6301\u6b64\u538b\u5dee'}
          value={pressure}
          onChange={setPressure}
        />
      </section>
    </main>
  )
}

export default PlaygroundPage
