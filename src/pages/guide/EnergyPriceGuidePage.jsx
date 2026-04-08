import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import SystemParamsEnergyPrice from '@/components/systemParams/SystemParamsEnergyPrice'
import '@/pages/SystemParamsPage.css'
import './GuidePage.css'

function EnergyPriceGuidePage() {
  const navigate = useNavigate()
  const energyPriceRef = useRef(null)

  const handleBack = () => {
    navigate('/guide/heat-pump-layout', { state: { queryArrangeOnReturn: true, arrangeViewOnly: true } })
  }

  const handleNext = () => {
    const ok = energyPriceRef.current?.commit()
    if (ok === false) {
      return
    }
    navigate('/home')
  }

  return (
    <div className="guide-page guide-page--energy-price">
      <div className="guide-page__content">
        <div className="guide-page__header">
          <h1 className="guide-page__title">能源价格</h1>
          <p className="guide-page__subtitle">与系统参数中的能源价格模块一致，填写后用于后续能耗与费用相关计算</p>
        </div>

        <div className="guide-page__system-params-host">
          <SystemParamsEnergyPrice ref={energyPriceRef} variant="guide" onDirtyChange={() => {}} />
        </div>

        <div className="guide-page__button guide-page__button--prev">
          <button type="button" className="guide-page__btn" onClick={handleBack}>
            返回
          </button>
          <button type="button" className="guide-page__btn is-primary" onClick={handleNext}>
            下一步
          </button>
        </div>
      </div>
    </div>
  )
}

export default EnergyPriceGuidePage
