import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import ModeOptionCard from '../components/ModeOptionCard'
import SliderSettingRow from '../components/SliderSettingRow'
import TimePickerModal from '../components/TimePickerModal'
import waterPumpIcon from '../assets/water-pump.svg'
import weatherCompensationIcon from '../assets/home/weather-compensation.svg'
import thermometerIcon from '../assets/thermometer.svg'
import { clearStoredToken, getStoredToken, parseUserFromToken, setStoredToken } from '../api/client/auth'
import { getStoredApiBaseUrl, setStoredApiBaseUrl } from '../api/client/config'
import { executeAlgorithmProcess, getToken, getTokenAndUser, loginWithPassword } from '../api/modules/playground'
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
  const [apiResponse, setApiResponse] = useState(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [apiBaseUrl, setApiBaseUrl] = useState(() => getStoredApiBaseUrl())
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('FinforWorx3.0')
  const [token, setToken] = useState(() => getStoredToken())
  const [userInfo, setUserInfo] = useState(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginResponse, setLoginResponse] = useState(null)
  const [getTokenLoading, setGetTokenLoading] = useState(false)
  const [getTokenResponse, setGetTokenResponse] = useState(null)
  const [getTokenAndUserLoading, setGetTokenAndUserLoading] = useState(false)
  const [getTokenAndUserResponse, setGetTokenAndUserResponse] = useState(null)

  useEffect(() => {
    if (token) {
      setStoredToken(token)
      setUserInfo(parseUserFromToken(token))
      return
    }

    clearStoredToken()
    setUserInfo(null)
  }, [token])

  useEffect(() => {
    setStoredApiBaseUrl(apiBaseUrl)
  }, [apiBaseUrl])

  const handleLogin = async () => {
    setLoginLoading(true)
    setLoginResponse(null)

    try {
      const response = await loginWithPassword({
        baseUrl: apiBaseUrl,
        username,
        password,
      })
      const { data, status } = response

      setLoginResponse({ success: data.code === '200', data, status })
      if (data.code === '200' && data.token) {
        setToken(data.token)
      }
    } catch (error) {
      setLoginResponse({ success: false, error: error.message })
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = () => {
    setToken('')
    setLoginResponse(null)
  }

  const handleGetToken = async () => {
    setGetTokenLoading(true)
    setGetTokenResponse(null)
    try {
      const response = await getToken({ baseUrl: apiBaseUrl, username, password })
      setGetTokenResponse({ success: true, data: response.data, status: response.status })
    } catch (error) {
      setGetTokenResponse({ success: false, error: error.message, data: error.data })
    } finally {
      setGetTokenLoading(false)
    }
  }

  const handleGetTokenAndUser = async () => {
    setGetTokenAndUserLoading(true)
    setGetTokenAndUserResponse(null)
    try {
      const response = await getTokenAndUser({ baseUrl: apiBaseUrl, username, password })
      setGetTokenAndUserResponse({ success: true, data: response.data, status: response.status })
      if (response.data?.code === '200' && response.data?.token) {
        setToken(response.data.token)
      }
    } catch (error) {
      setGetTokenAndUserResponse({ success: false, error: error.message, data: error.data })
    } finally {
      setGetTokenAndUserLoading(false)
    }
  }

  const pickerMap = {
    'date-2': {
      title: 'Date Picker',
      columns: [
        { key: 'month', options: MONTHS, formatter: (value) => formatTwoDigits(value) },
        { key: 'day', options: DAYS, formatter: (value) => formatTwoDigits(value) },
      ],
      value: dateValue2Columns,
      onConfirm: setDateValue2Columns,
    },
    'date-3': {
      title: 'Date Picker',
      columns: [
        { key: 'year', options: DATE_YEARS, formatter: (value) => String(value) },
        { key: 'month', options: MONTHS, formatter: (value) => formatTwoDigits(value) },
        { key: 'day', options: DAYS, formatter: (value) => formatTwoDigits(value) },
      ],
      value: dateValue3Columns,
      onConfirm: setDateValue3Columns,
    },
    'time-2': {
      title: 'Time Picker',
      columns: [
        { key: 'hour', options: HOURS, formatter: (value) => formatTwoDigits(value) },
        { key: 'minute', options: MINUTES, formatter: (value) => formatTwoDigits(value) },
      ],
      value: timeValue2Columns,
      onConfirm: setTimeValue2Columns,
    },
    'time-3': {
      title: 'Time Picker',
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

  const handleApiRequest = async () => {
    setApiLoading(true)
    setApiResponse(null)

    try {
      const response = await executeAlgorithmProcess({
        baseUrl: apiBaseUrl,
        token,
        algorithmProcessId: 'writeRealvalByLongNames',
        param: {
          data: {
            writeData: {
              'HeatPump\\SJMG\\No1\\SetpointCold': 25,
            },
          },
        },
      })

      setApiResponse({
        success: true,
        data: response.data,
        status: response.status,
      })
    } catch (error) {
      setApiResponse({ success: false, error: error.message })
    } finally {
      setApiLoading(false)
    }
  }

  return (
    <>
      <main className="playground-page">
        <header className="playground-page__header">
          <h1 className="playground-page__title">Component Playground</h1>
          <Link to="/home" className="playground-page__back-link">
            Back to Home
          </Link>
        </header>

        <section className="playground-section">
          <h2 className="playground-section__title">FeatureInfoCard</h2>
          <FeatureInfoCard
            icon={waterPumpIcon}
            title="Water Pump Energy Saving"
            description="Toggle a sample feature card for playground verification."
            selected={featureEnabled}
            onClick={() => setFeatureEnabled((prev) => !prev)}
          />
        </section>

        <section className="playground-section">
          <h2 className="playground-section__title">FeatureInfoCard Pair</h2>
          <div className="playground-feature-pair">
            <FeatureInfoCard
              icon={weatherCompensationIcon}
              title="Weather Compensation"
              description="Sample card for paired selection."
              selected={featurePairSelection === 'weather-compensation'}
              selectedBadgePosition="start"
              onClick={() => setFeaturePairSelection('weather-compensation')}
              className="playground-feature-pair__item"
            />
            <FeatureInfoCard
              icon={thermometerIcon}
              title="Constant Temperature"
              description="Sample card for paired selection."
              selected={featurePairSelection === 'constant-temperature'}
              onClick={() => setFeaturePairSelection('constant-temperature')}
              className="playground-feature-pair__item"
            />
          </div>
        </section>

        <section className="playground-section">
          <h2 className="playground-section__title">ModeOptionCard</h2>
          <div className="playground-mode-grid">
            <ModeOptionCard icon={<FixedFrequencyIcon />} label="Fixed" selected={mode === 'fixed'} onClick={() => setMode('fixed')} />
            <ModeOptionCard
              icon={<VariableFrequencyIcon />}
              label="Variable"
              selected={mode === 'variable'}
              onClick={() => setMode('variable')}
            />
          </div>
        </section>

        <section className="playground-section">
          <h2 className="playground-section__title">LabeledSelectRow</h2>
          <LabeledSelectRow
            label="Pressure Difference (kPa)"
            description="Sample select row wired to local state."
            value={pressure}
            onChange={setPressure}
          />
        </section>

        <section className="playground-section">
          <h2 className="playground-section__title">SliderSettingRow</h2>
          <SliderSettingRow
            label="Heating Temperature"
            value={heatingTemp}
            min={0}
            max={50}
            step={1}
            suffix="C"
            onChange={setHeatingTemp}
            keypadTitle="Set Heating Temperature"
          />
        </section>

        <section className="playground-section">
          <h2 className="playground-section__title">TimePickerModal</h2>
          <div className="playground-picker-grid">
            <button type="button" className="playground-picker-card" onClick={() => setActivePickerKey('date-2')}>
              <span className="playground-picker-card__title">Date Picker (2 columns)</span>
              <span className="playground-picker-card__value">
                {`${formatTwoDigits(dateValue2Columns[0])}-${formatTwoDigits(dateValue2Columns[1])}`}
              </span>
            </button>
            <button type="button" className="playground-picker-card" onClick={() => setActivePickerKey('date-3')}>
              <span className="playground-picker-card__title">Date Picker (3 columns)</span>
              <span className="playground-picker-card__value">
                {`${dateValue3Columns[0]}-${formatTwoDigits(dateValue3Columns[1])}-${formatTwoDigits(dateValue3Columns[2])}`}
              </span>
            </button>
            <button type="button" className="playground-picker-card" onClick={() => setActivePickerKey('time-2')}>
              <span className="playground-picker-card__title">Time Picker (2 columns)</span>
              <span className="playground-picker-card__value">
                {`${formatTwoDigits(timeValue2Columns[0])}:${formatTwoDigits(timeValue2Columns[1])}`}
              </span>
            </button>
            <button type="button" className="playground-picker-card" onClick={() => setActivePickerKey('time-3')}>
              <span className="playground-picker-card__title">Time Picker (3 columns)</span>
              <span className="playground-picker-card__value">
                {`${formatTwoDigits(timeValue3Columns[0])}:${formatTwoDigits(timeValue3Columns[1])}:${formatTwoDigits(timeValue3Columns[2])}`}
              </span>
            </button>
          </div>
        </section>

        <section className="playground-section">
          <h2 className="playground-section__title">API Base URL</h2>
          <div className="playground-api-inputs">
            <div className="playground-api-input-group">
              <label className="playground-api-label">Base URL</label>
              <input
                type="text"
                className="playground-api-input"
                value={apiBaseUrl}
                onChange={(event) => setApiBaseUrl(event.target.value)}
                placeholder="http://x.x.x.x:xxxx"
              />
            </div>
          </div>
        </section>

        <section className="playground-section">
          <h2 className="playground-section__title">Get Token Test (FinforWorx API)</h2>
          <div className="playground-api-section">
            <div className="playground-api-inputs">
              <div className="playground-api-input-group">
                <label className="playground-api-label">Username</label>
                <input
                  type="text"
                  className="playground-api-input"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter username"
                />
              </div>
              <div className="playground-api-input-group">
                <label className="playground-api-label">Password</label>
                <input
                  type="password"
                  className="playground-api-input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                />
              </div>
            </div>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', margin: '4px 0 8px' }}>
              Target: {apiBaseUrl}/FinforWorx/getToken &amp; getTokenAndUser
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="playground-api-button"
                onClick={handleGetToken}
                disabled={getTokenLoading}
                style={{ flex: 1, minWidth: '200px' }}
              >
                {getTokenLoading ? 'Requesting...' : 'GET /getToken'}
              </button>
              <button
                type="button"
                className="playground-api-button"
                onClick={handleGetTokenAndUser}
                disabled={getTokenAndUserLoading}
                style={{ flex: 1, minWidth: '200px', background: 'linear-gradient(180deg, #3a8fd5, #2d6fa8)' }}
              >
                {getTokenAndUserLoading ? 'Requesting...' : 'GET /getTokenAndUser'}
              </button>
            </div>
            {getTokenResponse ? (
              <div className={`playground-api-response ${getTokenResponse.success ? 'success' : 'error'}`}>
                <h3>getToken {getTokenResponse.success ? 'Success' : 'Failed'}</h3>
                {getTokenResponse.status ? <p>Status: {getTokenResponse.status}</p> : null}
                <pre>{JSON.stringify(getTokenResponse.data || getTokenResponse.error, null, 2)}</pre>
              </div>
            ) : null}
            {getTokenAndUserResponse ? (
              <div className={`playground-api-response ${getTokenAndUserResponse.success ? 'success' : 'error'}`}>
                <h3>getTokenAndUser {getTokenAndUserResponse.success ? 'Success' : 'Failed'}</h3>
                {getTokenAndUserResponse.status ? <p>Status: {getTokenAndUserResponse.status}</p> : null}
                <pre>{JSON.stringify(getTokenAndUserResponse.data || getTokenAndUserResponse.error, null, 2)}</pre>
              </div>
            ) : null}
          </div>
        </section>

        <section className="playground-section">
          <h2 className="playground-section__title">Login and Token</h2>
          <div className="playground-api-section">
            {!token ? (
              <>
                <div className="playground-api-inputs">
                  <div className="playground-api-input-group">
                    <label className="playground-api-label">Username</label>
                    <input
                      type="text"
                      className="playground-api-input"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="playground-api-input-group">
                    <label className="playground-api-label">Password</label>
                    <input
                      type="password"
                      className="playground-api-input"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter password"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="playground-api-button"
                  onClick={handleLogin}
                  disabled={loginLoading}
                >
                  {loginLoading ? 'Logging in...' : 'Login and Get Token'}
                </button>
                {loginResponse ? (
                  <div className={`playground-api-response ${loginResponse.success ? 'success' : 'error'}`}>
                    <h3>{loginResponse.success ? 'Login Success' : 'Login Failed'}</h3>
                    {loginResponse.status ? <p>Status: {loginResponse.status}</p> : null}
                    <pre>{JSON.stringify(loginResponse.data || loginResponse.error, null, 2)}</pre>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="playground-api-inputs">
                  <div className="playground-api-input-group">
                    <label className="playground-api-label">Current Token</label>
                    <input type="text" className="playground-api-input" value={token} readOnly />
                  </div>
                  {userInfo ? (
                    <div className="playground-api-input-group">
                      <label className="playground-api-label">Parsed User Payload</label>
                      <div className="playground-api-response">
                        <pre>{JSON.stringify(userInfo, null, 2)}</pre>
                      </div>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="playground-api-button"
                  onClick={handleLogout}
                  style={{ background: 'linear-gradient(180deg, #d53a3a, #a82d2d)' }}
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </section>

        <section className="playground-section">
          <h2 className="playground-section__title">API Request Test</h2>
          <div className="playground-api-section">
            <button
              type="button"
              className="playground-api-button"
              onClick={handleApiRequest}
              disabled={apiLoading}
            >
              {apiLoading ? 'Requesting...' : 'Send writeRealvalByLongNames'}
            </button>
            {!token ? <p style={{ color: 'rgba(255, 200, 100, 0.9)' }}>Request will be sent without token.</p> : null}
            {apiResponse ? (
              <div className={`playground-api-response ${apiResponse.success ? 'success' : 'error'}`}>
                <h3>{apiResponse.success ? 'Request Success' : 'Request Failed'}</h3>
                {apiResponse.status ? <p>Status: {apiResponse.status}</p> : null}
                <pre>{JSON.stringify(apiResponse.data || apiResponse.error, null, 2)}</pre>
              </div>
            ) : null}
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
