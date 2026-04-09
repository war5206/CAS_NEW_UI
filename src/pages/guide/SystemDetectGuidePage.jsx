import { useNavigate } from 'react-router-dom'
import './GuidePage.css'

function SystemDetectGuidePage() {
  const navigate = useNavigate()

  return (
    <div className="guide-page">
      <div className="guide-page__content">
        <div className="guide-page__header">
          <h1 className="guide-page__title">系统检测</h1>
          <p className="guide-page__subtitle">页面占位：后续接入系统检测流程。</p>
        </div>

        <div className="guide-page__button guide-page__button--prev">
          <button type="button" className="guide-page__btn" onClick={() => navigate('/guide/energy-price')}>
            返回
          </button>
        </div>
      </div>
    </div>
  )
}

export default SystemDetectGuidePage
