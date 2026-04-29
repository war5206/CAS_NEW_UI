import { useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import waterPumpIcon from '../assets/water-pump.svg'
import './DeviceParamPage.css'

function TerminalLoopPumpPage() {
  const [pressureDiff, setPressureDiff] = useState('10')
  const [startMinutes, setStartMinutes] = useState('10')
  const [stopMinutes, setStopMinutes] = useState('10')
  const [rotationDays, setRotationDays] = useState('10')

  return (
    <main className="device-param-page">
      <FeatureInfoCard
        icon={waterPumpIcon}
        iconAlt="水泵"
        title="水泵间隔循环节能功能"
        description="开启时，水泵按照间隔启停的节能方式运行"
        selected
      />

      <section className="device-param-page__section">
        <div className="device-param-page__rows">
          <LabeledSelectRow
            label="末端循环泵轮值时间（天）"
            description="循环泵主备相互切换的时间"
            value={rotationDays}
            onChange={setRotationDays}
            showIndicator
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将轮值时间设置为 ${nextValue} 天吗？` })}
          />
        </div>
      </section>

      <section className="device-param-page__section">
        <div className="device-param-page__rows">
          <LabeledSelectRow
            label="压差设定（kPa）"
            description="变频供水泵下通过调节频率维持此压差"
            value={pressureDiff}
            onChange={setPressureDiff}
            showIndicator
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将压差设定为 ${nextValue} kPa 吗？` })}
          />
          <LabeledSelectRow
            label="循环泵间隔启动时间（分钟）"
            description="节能功能开启，所有机组停机后循环泵持续运行时间"
            value={startMinutes}
            suffix="分钟"
            onChange={setStartMinutes}
            showIndicator
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将循环泵间隔启动时间设置为 ${nextValue} 分钟吗？` })}
          />
          <LabeledSelectRow
            label="循环泵间隔停止时间（分钟）"
            description="节能功能开启，循环泵持续停止时间"
            value={stopMinutes}
            suffix="分钟"
            onChange={setStopMinutes}
            showIndicator
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将循环泵间隔停止时间设置为 ${nextValue} 分钟吗？` })}
          />
        </div>
      </section>
    </main>
  )
}

export default TerminalLoopPumpPage
