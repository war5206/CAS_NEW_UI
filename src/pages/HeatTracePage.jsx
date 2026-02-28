import { useState } from 'react'
import LabeledSelectRow from '../components/LabeledSelectRow'
import './DeviceParamPage.css'

function HeatTracePage() {
  const [startTemp, setStartTemp] = useState('10')
  const [stopTemp, setStopTemp] = useState('10')
  const [delayCloseMinutes, setDelayCloseMinutes] = useState('10')

  return (
    <main className="device-param-page">
      <section className="device-param-page__section">
        <h3 className="device-param-page__title">{'参数设置'}</h3>
        <div className="device-param-page__rows">
          <LabeledSelectRow
            label={'伴热带启动温度设置（℃）'}
            description={'当温度达到设定值时，伴热带启动'}
            value={startTemp}
            suffix={'℃'}
            onChange={setStartTemp}
            useModeCardControl
          />
          <LabeledSelectRow
            label={'伴热带关闭温度设置（℃）'}
            description={'当温度达到设定值时，伴热带关闭'}
            value={stopTemp}
            suffix={'℃'}
            onChange={setStopTemp}
            useModeCardControl
          />
          <LabeledSelectRow
            label={'化霜后延时关闭时间（分钟）'}
            description={'全部化霜结束后延时关闭伴热带时间设定'}
            value={delayCloseMinutes}
            suffix={'分钟'}
            onChange={setDelayCloseMinutes}
            useModeCardControl
          />
        </div>
      </section>
    </main>
  )
}

export default HeatTracePage
