import { useEffect, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './ScreenProtectPage.css'
import ScreenInfo from '../components/ScreenInfo'
import screenProtectBg from '../assets/guide-init/screen-protect-bg.png'
import screenProtectHp from '../assets/guide-init/screen-protect-hp.png'
import screenProtectSystemModel from '../assets/guide-init/screen-protect-setting.png'
import screenProtectAlert from '../assets/guide-init/screen-protect-alert.png'
import screenProtectTemperature from '../assets/guide-init/screen-protect-temperature.png'
import { useScreenDataQuery } from '../features/screen/hooks/useScreenDataQuery'

const FADE_OUT_DURATION = 600

function ScreenProtectPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isLoaded, setIsLoaded] = useState(false)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const isScreenProtectRoute = location.pathname === '/screen-protect'
  const { data: screenData } = useScreenDataQuery({ enabled: isScreenProtectRoute })

  const handleScreenClick = useCallback(() => {
    if (isFadingOut) return
    setIsFadingOut(true)
    setTimeout(() => {
      navigate('/auth/login', { state: { fromScreenProtect: true } })
    }, FADE_OUT_DURATION)
  }, [navigate, isFadingOut])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const img = new Image()
    img.src = screenProtectBg
    img.onload = () => {
      setIsLoaded(true)
    }
    // 兜底，500ms后无论如何都显示
    const timeout = setTimeout(() => {
      setIsLoaded(true)
    }, 500)
    return () => clearTimeout(timeout)
  }, [])

  const formatDate = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    const weekday = weekdays[date.getDay()]
    return `${month}月${day}日 ${weekday}`
  }

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  return (
    <div className={`screen-protect-page ${isLoaded && !isFadingOut ? 'visible' : ''}`} onClick={handleScreenClick} role="button" tabIndex={0}>
      <div className="screen-protect-content">
        <img src={screenProtectBg} alt="" className="screen-protect-bg" />
        <div className="screen-protect-overlay">
          <div className="screen-protect-header">
            <div className="screen-protect-date">{formatDate(currentTime)}</div>
            <div className="screen-protect-time">{formatTime(currentTime)}</div>
          </div>

          <div className="screen-protect-info-grid">
            <ScreenInfo
              title="热泵运行"
              value={screenData.heatPumpCount}
              unit="台"
              icon={screenProtectHp}
              iconAlt="热泵运行"
              iconWidth={110}
              iconHeight={120}
            />
            <ScreenInfo
              title="系统模式"
              value={screenData.systemMode}
              icon={screenProtectSystemModel}
              iconAlt="系统模式"
              iconWidth={120}
              iconHeight={120}
            />
            <ScreenInfo
              title="报警预警"
              value={screenData.alertCount}
              unit="条"
              icon={screenProtectAlert}
              iconAlt="报警预警"
            />
            <ScreenInfo
              title="供水温度"
              value={screenData.supplyWaterTemp}
              unit="℃"
              icon={screenProtectTemperature}
              iconAlt="供水温度"
              iconWidth={80}
              iconHeight={120}
            />
            <ScreenInfo
              title="回水温度"
              value={screenData.returnWaterTemp}
              unit="℃"
              icon={screenProtectTemperature}
              iconAlt="回水温度"
              iconWidth={80}
              iconHeight={120}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScreenProtectPage
