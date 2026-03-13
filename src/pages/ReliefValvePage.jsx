import { useState } from 'react'
import LabeledSelectRow from '../components/LabeledSelectRow'
import './DeviceParamPage.css'

function ReliefValvePage() {
  const [startPressure, setStartPressure] = useState('10')
  const [stopPressure, setStopPressure] = useState('10')

  return (
    <main className="device-param-page">
      <section className="device-param-page__section">
        <h3 className="device-param-page__title">参数设置</h3>
        <div className="device-param-page__rows">
          <LabeledSelectRow
            label="泄压补水启动压力设定（kPa）"
            value={startPressure}
            suffix="kPa"
            onChange={setStartPressure}
            confirmConfig={({ nextValue }) => ({ message: `确认将启动压力设置为 ${nextValue} kPa 吗？` })}
          />
          <LabeledSelectRow
            label="泄压补水停止压力设定（kPa）"
            value={stopPressure}
            suffix="kPa"
            onChange={setStopPressure}
            confirmConfig={({ nextValue }) => ({ message: `确认将停止压力设置为 ${nextValue} kPa 吗？` })}
          />
        </div>
      </section>
    </main>
  )
}

export default ReliefValvePage
