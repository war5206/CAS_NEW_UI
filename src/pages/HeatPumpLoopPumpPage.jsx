import { useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import waterPumpIcon from '../assets/water-pump.svg'
import './HeatPumpLoopPumpPage.css'

function HeatPumpLoopPumpPage() {
  const [isIntervalSavingEnabled, setIsIntervalSavingEnabled] = useState(false)
  const [startMinutes, setStartMinutes] = useState('10')
  const [stopMinutes, setStopMinutes] = useState('10')
  const [rotationDays, setRotationDays] = useState('72')

  return (
    <main className="hp-loop-pump-page">
      <FeatureInfoCard
        icon={waterPumpIcon}
        iconAlt={'\u6c34\u6cf5'}
        title={'\u6c34\u6cf5\u95f4\u9694\u5faa\u73af\u8282\u80fd\u529f\u80fd'}
        description={'\u5f00\u542f\u65f6\uff0c\u6c34\u6cf5\u6309\u7167\u95f4\u9694\u542f/\u505c\u7684\u8282\u80fd\u65b9\u5f0f\u8fd0\u884c'}
        selected={isIntervalSavingEnabled}
        onClick={() => setIsIntervalSavingEnabled((previous) => !previous)}
      />

      <section className="hp-loop-pump-page__rows">
        <h3 className="hp-loop-pump-page__section-title">{'\u5faa\u73af\u8bbe\u7f6e'}</h3>
        <div className="hp-loop-pump-page__row-list">
          <LabeledSelectRow
            label={'\u5faa\u73af\u6cf5\u95f4\u9694\u542f\u52a8\u65f6\u95f4\uff08\u5206\u949f\uff09'}
            description={'\u8282\u80fd\u529f\u80fd\u5f00\u542f\u540e\uff0c\u6240\u6709\u673a\u7ec4\u505c\u673a\u540e\u5faa\u73af\u6cf5\u6301\u7eed\u8fd0\u884c\u65f6\u95f4'}
            value={startMinutes}
            onChange={setStartMinutes}
            useModeCardControl
          />
          <LabeledSelectRow
            label={'\u5faa\u73af\u6cf5\u95f4\u9694\u505c\u6b62\u65f6\u95f4\uff08\u5206\u949f\uff09'}
            description={'\u8282\u80fd\u529f\u80fd\u5f00\u542f\u540e\uff0c\u5faa\u73af\u6cf5\u6301\u7eed\u505c\u6b62\u65f6\u95f4'}
            value={stopMinutes}
            onChange={setStopMinutes}
            useModeCardControl
          />
          <LabeledSelectRow
            label={'\u70ed\u6cf5\u5faa\u73af\u8f6e\u503c\u65f6\u95f4\uff08\u5929\uff09'}
            description={'\u5faa\u73af\u6cf5\u4e3b\u5907\u76f8\u4e92\u5207\u6362\u7684\u65f6\u95f4'}
            value={rotationDays}
            onChange={setRotationDays}
            useModeCardControl
          />
        </div>
      </section>
    </main>
  )
}

export default HeatPumpLoopPumpPage
