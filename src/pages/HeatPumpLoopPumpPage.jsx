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
        iconAlt={'水泵'}
        title={'水泵间隔循环节能功能'}
        description={'开启时，水泵按照间隔启/停的节能方式运行'}
        selected={isIntervalSavingEnabled}
        onClick={() => setIsIntervalSavingEnabled((previous) => !previous)}
      />

      <section className={`hp-loop-pump-page__rows${!isIntervalSavingEnabled ? ' is-disabled' : ''}`}>
        <h3 className="hp-loop-pump-page__section-title">{'循环设置'}</h3>
        <div className="hp-loop-pump-page__row-list">
          <LabeledSelectRow
            label={'循环泵间隔启动时间（分钟）'}
            description={'节能功能开启后，所有机组停机后循环泵持续运行时间'}
            value={startMinutes}
            suffix={'分钟'}
            onChange={setStartMinutes}
            disabled={!isIntervalSavingEnabled}
            useModeCardControl
          />
          <LabeledSelectRow
            label={'循环泵间隔停止时间（分钟）'}
            description={'节能功能开启后，循环泵持续停止时间'}
            value={stopMinutes}
            suffix={'分钟'}
            onChange={setStopMinutes}
            disabled={!isIntervalSavingEnabled}
            useModeCardControl
          />
          <LabeledSelectRow
            label={'热泵循环轮值时间（天）'}
            description={'循环泵主备相互切换的时间'}
            value={rotationDays}
            suffix={'天'}
            onChange={setRotationDays}
            disabled={!isIntervalSavingEnabled}
            useModeCardControl
          />
        </div>
      </section>
    </main>
  )
}

export default HeatPumpLoopPumpPage
