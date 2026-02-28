import { Link } from 'react-router-dom'
import { useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import ModeOptionCard from '../components/ModeOptionCard'
import SliderSettingRow from '../components/SliderSettingRow'
import TimePickerModal from '../components/TimePickerModal'
import waterPumpIcon from '../assets/water-pump.svg'
import weatherCompensationIcon from '../assets/home/weather-compensation.svg'
import thermometerIcon from '../assets/thermometer.svg'
import './PlaygroundPage.css'

const DATE_YEARS = [2022, 2023, 2024, 2025, 2026, 2027, 2028]
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)
const DAYS = Array.from({ length: 31 }, (_, index) => index + 1)
const HOURS = Array.from({ length: 24 }, (_, index) => index)
const MINUTES = Array.from({ length: 60 }, (_, index) => index)

function FixedFrequencyIcon() {
  return <span className="playground-mode-token">HZ</span>
}

function VariableFrequencyIcon() {
  return <span className="playground-mode-token is-variable">HZ</span>
}

function formatTwoDigits(value) {
  return String(value).padStart(2, '0')
}

function PlaygroundPage() {
  const [featureEnabled, setFeatureEnabled] = useState(true)
  const [featurePairSelection, setFeaturePairSelection] = useState('constant-temperature')
  const [mode, setMode] = useState('variable')
  const [pressure, setPressure] = useState('10')
  const [heatingTemp, setHeatingTemp] = useState('5')
  const [activePickerKey, setActivePickerKey] = useState('')
  const [dateValue2Columns, setDateValue2Columns] = useState([4, 18])
  const [dateValue3Columns, setDateValue3Columns] = useState([2025, 4, 18])
  const [timeValue2Columns, setTimeValue2Columns] = useState([12, 38])
  const [timeValue3Columns, setTimeValue3Columns] = useState([12, 38, 38])

  const pickerMap = {
    'date-2': {
      title: '日期选择器',
      columns: [
        { key: 'month', options: MONTHS, formatter: (value) => formatTwoDigits(value) },
        { key: 'day', options: DAYS, formatter: (value) => formatTwoDigits(value) },
      ],
      value: dateValue2Columns,
      onConfirm: setDateValue2Columns,
    },
    'date-3': {
      title: '日期选择器',
      columns: [
        { key: 'year', options: DATE_YEARS, formatter: (value) => String(value) },
        { key: 'month', options: MONTHS, formatter: (value) => formatTwoDigits(value) },
        { key: 'day', options: DAYS, formatter: (value) => formatTwoDigits(value) },
      ],
      value: dateValue3Columns,
      onConfirm: setDateValue3Columns,
    },
    'time-2': {
      title: '时间选择器',
      columns: [
        { key: 'hour', options: HOURS, formatter: (value) => formatTwoDigits(value) },
        { key: 'minute', options: MINUTES, formatter: (value) => formatTwoDigits(value) },
      ],
      value: timeValue2Columns,
      onConfirm: setTimeValue2Columns,
    },
    'time-3': {
      title: '时间选择器',
      columns: [
        { key: 'hour', options: HOURS, formatter: (value) => formatTwoDigits(value) },
        { key: 'minute', options: MINUTES, formatter: (value) => formatTwoDigits(value) },
        { key: 'second', options: MINUTES, formatter: (value) => formatTwoDigits(value) },
      ],
      value: timeValue3Columns,
      onConfirm: setTimeValue3Columns,
    },
  }

  const activePicker = pickerMap[activePickerKey] ?? null

  return (
    <>
      <main className="playground-page">
        <header className="playground-page__header">
          <h1 className="playground-page__title">Component Playground</h1>
          <Link to="/home" className="playground-page__back-link">
            {'返回首页'}
          </Link>
        </header>

        <section className="playground-section">
          <h2 className="playground-section__title">FeatureInfoCard</h2>
          <FeatureInfoCard
            icon={waterPumpIcon}
            title={'水泵间隔循环节能功能'}
            description={'开启时，水泵按照间隔启停的节能方式运行'}
            selected={featureEnabled}
            onClick={() => setFeatureEnabled((prev) => !prev)}
          />
        </section>

        <section className="playground-section">
          <h2 className="playground-section__title">FeatureInfoCard Pair</h2>
          <div className="playground-feature-pair">
            <FeatureInfoCard
              icon={weatherCompensationIcon}
              title={'气候补偿'}
              description={'根据环境温度不同自动调节回水目标温度'}
              selected={featurePairSelection === 'weather-compensation'}
              selectedBadgePosition="start"
              onClick={() => setFeaturePairSelection('weather-compensation')}
              className="playground-feature-pair__item"
            />
            <FeatureInfoCard
              icon={thermometerIcon}
              title={'定温模式'}
              description={'固定温度运行'}
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
              label={'定频'}
              selected={mode === 'fixed'}
              onClick={() => setMode('fixed')}
            />
            <ModeOptionCard
              icon={<VariableFrequencyIcon />}
              label={'变频'}
              selected={mode === 'variable'}
              onClick={() => setMode('variable')}
            />
          </div>
        </section>

        <section className="playground-section">
          <h2 className="playground-section__title">LabeledSelectRow</h2>
          <LabeledSelectRow
            label={'压差设定（kPa）'}
            description={'变频供水泵下通过调节频率维持此压差'}
            value={pressure}
            onChange={setPressure}
          />
        </section>

        <section className="playground-section">
          <h2 className="playground-section__title">SliderSettingRow</h2>
          <SliderSettingRow
            label={'制热温度（℃）'}
            value={heatingTemp}
            min={0}
            max={50}
            step={1}
            suffix={'℃'}
            onChange={setHeatingTemp}
            keypadTitle={'设置制热温度'}
          />
        </section>

        <section className="playground-section">
          <h2 className="playground-section__title">TimePickerModal</h2>
          <div className="playground-picker-grid">
            <button type="button" className="playground-picker-card" onClick={() => setActivePickerKey('date-2')}>
              <span className="playground-picker-card__title">{'日期选择器 (2列)'}</span>
              <span className="playground-picker-card__value">
                {`${formatTwoDigits(dateValue2Columns[0])}-${formatTwoDigits(dateValue2Columns[1])}`}
              </span>
            </button>
            <button type="button" className="playground-picker-card" onClick={() => setActivePickerKey('date-3')}>
              <span className="playground-picker-card__title">{'日期选择器 (3列)'}</span>
              <span className="playground-picker-card__value">
                {`${dateValue3Columns[0]}-${formatTwoDigits(dateValue3Columns[1])}-${formatTwoDigits(dateValue3Columns[2])}`}
              </span>
            </button>
            <button type="button" className="playground-picker-card" onClick={() => setActivePickerKey('time-2')}>
              <span className="playground-picker-card__title">{'时间选择器 (2列)'}</span>
              <span className="playground-picker-card__value">
                {`${formatTwoDigits(timeValue2Columns[0])}:${formatTwoDigits(timeValue2Columns[1])}`}
              </span>
            </button>
            <button type="button" className="playground-picker-card" onClick={() => setActivePickerKey('time-3')}>
              <span className="playground-picker-card__title">{'时间选择器 (3列)'}</span>
              <span className="playground-picker-card__value">
                {`${formatTwoDigits(timeValue3Columns[0])}:${formatTwoDigits(timeValue3Columns[1])}:${formatTwoDigits(timeValue3Columns[2])}`}
              </span>
            </button>
          </div>
        </section>
      </main>

      <TimePickerModal
        isOpen={Boolean(activePicker)}
        title={activePicker?.title}
        columns={activePicker?.columns}
        value={activePicker?.value}
        onClose={() => setActivePickerKey('')}
        onConfirm={(nextValue) => {
          activePicker?.onConfirm(nextValue)
          setActivePickerKey('')
        }}
      />
    </>
  )
}

export default PlaygroundPage
