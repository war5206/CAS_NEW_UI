import { useState, useRef, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SystemParamsEnergyPrice from '@/components/systemParams/SystemParamsEnergyPrice'
import { queryEnergyPrice, saveEnergyPrice } from '@/api/modules/home'
import {
  buildEnergyPriceStateFromQueryResponse,
  getDefaultEnergyPriceState,
  getStoredEnergyPriceStateForGuide,
  setStoredEnergyPriceStateForGuide,
} from '@/utils/energyPriceState'
import '@/pages/SystemParamsPage.css'
import './GuidePage.css'

const ENERGY_PRICE_GUIDE_ENTERED_FLAG = 'cas_energy_price_guide_entered'

function EnergyPriceGuidePage() {
  const navigate = useNavigate()
  const energyPriceRef = useRef(null)
  const [canNext, setCanNext] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resetReady, setResetReady] = useState(false)

  useLayoutEffect(() => {
    let alive = true

    const initEnergyPriceData = async () => {
      const hasEnteredBefore = window.sessionStorage.getItem(ENERGY_PRICE_GUIDE_ENTERED_FLAG) === '1'
      if (!hasEnteredBefore) {
        setStoredEnergyPriceStateForGuide(getDefaultEnergyPriceState())
        window.sessionStorage.setItem(ENERGY_PRICE_GUIDE_ENTERED_FLAG, '1')
        if (alive) setResetReady(true)
        return
      }

      try {
        const result = await queryEnergyPrice()
        const nextState = buildEnergyPriceStateFromQueryResponse(result?.data?.data ?? result?.data)
        setStoredEnergyPriceStateForGuide(nextState)
      } catch {
        // 回查失败时保留当前向导缓存，若无缓存则兜底默认值
        const fallback = getStoredEnergyPriceStateForGuide()
        setStoredEnergyPriceStateForGuide(fallback?.waterFixed != null ? fallback : getDefaultEnergyPriceState())
      } finally {
        if (alive) setResetReady(true)
      }
    }

    void initEnergyPriceData()
    return () => {
      alive = false
    }
  }, [])

  const handleBack = () => {
    navigate('/guide/heat-pump-layout', { state: { queryArrangeOnReturn: true, arrangeViewOnly: true } })
  }

  const handleNext = async () => {
    if (!canNext || submitting) {
      return
    }
    const ok = energyPriceRef.current?.commit()
    if (ok === false) {
      return
    }
    setSubmitting(true)
    try {
      const rawState = getStoredEnergyPriceStateForGuide()
      const payload = [
        {
          energyTypeCode: 'WATER',
          fixedPrice: String(rawState?.waterFixed ?? '').trim(),
        },
        {
          energyTypeCode: 'GAS',
          fixedPrice: String(rawState?.gasFixed ?? '').trim(),
        },
      ]
      const result = await saveEnergyPrice(payload)
      if (result?.data?.state === 'success') {
        navigate('/guide/system-detect')
        return
      }
      setSubmitting(false)
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div className="guide-page guide-page--energy-price">
      <div className="guide-page__content">
        <div className="guide-page__header">
          <h1 className="guide-page__title">能源价格</h1>
          <p className="guide-page__subtitle">与系统参数中的能源价格模块一致，填写后用于后续能耗与费用相关计算</p>
        </div>

        <div className="guide-page__system-params-host">
          {resetReady ? (
            <SystemParamsEnergyPrice
              ref={energyPriceRef}
              variant="guide"
              onDirtyChange={() => {}}
              onGuideFormReadyChange={setCanNext}
            />
          ) : null}
        </div>

        <div className="guide-page__button guide-page__button--prev">
          <button type="button" className="guide-page__btn" onClick={handleBack}>
            返回
          </button>
          <button type="button" className="guide-page__btn is-primary" onClick={() => void handleNext()} disabled={!canNext || submitting}>
            {submitting ? <span className="guide-loading-inline"><span className="guide-loading-spinner" aria-hidden="true" />提交中</span> : '下一步'}
          </button>
        </div>
      </div>
      {submitting ? <div className="guide-page__blocking-mask" aria-hidden="true" /> : null}
    </div>
  )
}

export default EnergyPriceGuidePage
