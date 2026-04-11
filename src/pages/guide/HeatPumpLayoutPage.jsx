import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import SystemParamsUnitLayout from '@/components/systemParams/SystemParamsUnitLayout'
import { useGuideStore } from '@/features/guide/hooks/useGuideStore'
import '@/pages/SystemParamsPage.css'
import './GuidePage.css'

function HeatPumpLayoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { heatPump, systemTypeId } = useGuideStore()
  const [numberingDone, setNumberingDone] = useState(false)
  const queryArrangeOnReturn = Boolean(location.state?.queryArrangeOnReturn)
  const arrangeViewOnlyFromState = Boolean(location.state?.arrangeViewOnly)
  const [arrangeViewOnly, setArrangeViewOnly] = useState(arrangeViewOnlyFromState)

  useEffect(() => {
    if (queryArrangeOnReturn) {
      setArrangeViewOnly(arrangeViewOnlyFromState)
    }
  }, [queryArrangeOnReturn, arrangeViewOnlyFromState])

  const handleExitArrangeViewOnly = useCallback(() => {
    setArrangeViewOnly(false)
    navigate('/guide/heat-pump-layout', { replace: true, state: {} })
  }, [navigate])

  const handleBack = () => {
    if (systemTypeId === '2') {
      navigate('/guide/terminal-loop-pump')
    } else {
      navigate('/guide/heat-pump-loop-pump')
    }
  }

  const handleNext = () => {
    if (!numberingDone) {
      return
    }
    navigate('/guide/energy-price')
  }

  return (
    <div className="guide-page guide-page--heat-pump-layout">
      <div className="guide-page__content">
        <div className="guide-page__header">
          <h1 className="guide-page__title">热泵布局</h1>
        </div>

        <div className="guide-page__system-params-host">
          <SystemParamsUnitLayout
            variant="guide"
            heatPumpCount={heatPump ?? '7'}
            queryArrangeOnMount={queryArrangeOnReturn}
            arrangeViewOnly={arrangeViewOnly}
            onArrangeViewOnlyExit={handleExitArrangeViewOnly}
            onLayoutStatusChange={({ numberingDone: done }) => setNumberingDone(done)}
            onUnitLayoutCommitted={() => {}}
          />
        </div>

        <div className="guide-page__button guide-page__button--prev">
          <button type="button" className="guide-page__btn" onClick={handleBack}>
            返回
          </button>
          <button type="button" className="guide-page__btn is-primary" onClick={handleNext} disabled={!numberingDone}>
            下一步
          </button>
        </div>
      </div>
    </div>
  )
}

export default HeatPumpLayoutPage
