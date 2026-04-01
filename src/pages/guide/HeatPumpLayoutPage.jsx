import { useNavigate } from 'react-router-dom'
import './GuidePage.css'

function HeatPumpLayoutPage() {
  const navigate = useNavigate()

  const handleBack = () => {
    navigate('/guide/terminal-loop-pump')
  }

  return (
    <div className="guide-page">
      <div className="guide-page__content">
        <div className="guide-page__header">
          <h1 className="guide-page__title">热泵布局</h1>
          <p className="guide-page__subtitle">
            热泵布局配置页面开发中...
          </p>
        </div>

        <div style={{
          gridColumn: '1 / -1',
          gridRow: '3 / 14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            color: 'var(--灰-灰, #909da2)',
            fontFamily: '"Alibaba PuHuiTi 2.0", sans-serif',
            fontSize: '24px',
            textAlign: 'center',
          }}>
            热泵布局页面开发中，敬请期待...
          </div>
        </div>

        {/* 底部按钮 - 返回和下一步 */}
        <div className="guide-page__button guide-page__button--prev">
          <button
            type="button"
            className="guide-page__btn"
            onClick={handleBack}
          >
            返回
          </button>
          <button
            type="button"
            className="guide-page__btn is-primary"
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
            disabled
          >
            下一步
          </button>
        </div>
      </div>
    </div>
  )
}

export default HeatPumpLayoutPage
