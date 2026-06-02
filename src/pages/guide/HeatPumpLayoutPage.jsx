import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import SystemParamsUnitLayout from '@/components/systemParams/SystemParamsUnitLayout'
import { COUPLE_ENERGY_TYPE_NONE_ID } from '@/config/projectUnitDevices'
import { adaptCoupleEnergyFromQueryResponse, resolveCouplingEnergyTypeId } from '@/api/adapters/systemParamsProject'
import { queryCoupleEnergy } from '@/api/modules/settings'
import { useGuideStore } from '@/features/guide/hooks/useGuideStore'
import '@/pages/SystemParamsPage.css'
import './GuidePage.css'

function HeatPumpLayoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { heatPump, coupleEnergyTypeId, coupleEnergyNumber, systemTypeId } = useGuideStore()
  const [resolvedCoupleEnergyTypeId, setResolvedCoupleEnergyTypeId] = useState(coupleEnergyTypeId ?? COUPLE_ENERGY_TYPE_NONE_ID)
  const [resolvedCoupleEnergyNumber, setResolvedCoupleEnergyNumber] = useState(coupleEnergyNumber ?? '0')
  const [unitConfigReady, setUnitConfigReady] = useState(false)
  const [numberingDone, setNumberingDone] = useState(false)
  const queryArrangeOnReturn = Boolean(location.state?.queryArrangeOnReturn)
  const arrangeViewOnlyFromState = Boolean(location.state?.arrangeViewOnly)
  const [arrangeViewOnly, setArrangeViewOnly] = useState(arrangeViewOnlyFromState)

  useEffect(() => {
    if (queryArrangeOnReturn) {
      setArrangeViewOnly(arrangeViewOnlyFromState)
    }
  }, [queryArrangeOnReturn, arrangeViewOnlyFromState])

  useEffect(() => {
    let cancelled = false
    setUnitConfigReady(false)
    void (async () => {
      try {
        const response = await queryCoupleEnergy()
        const next = adaptCoupleEnergyFromQueryResponse(response)
        if (!cancelled && next) {
          setResolvedCoupleEnergyTypeId(resolveCouplingEnergyTypeId({ typeId: next.typeId, typeName: next.typeName }))
          setResolvedCoupleEnergyNumber(next.count || '0')
        } else if (!cancelled) {
          setResolvedCoupleEnergyTypeId(coupleEnergyTypeId ?? COUPLE_ENERGY_TYPE_NONE_ID)
          setResolvedCoupleEnergyNumber(coupleEnergyNumber ?? '0')
        }
      } catch {
        if (!cancelled) {
          setResolvedCoupleEnergyTypeId(coupleEnergyTypeId ?? COUPLE_ENERGY_TYPE_NONE_ID)
          setResolvedCoupleEnergyNumber(coupleEnergyNumber ?? '0')
        }
      } finally {
        if (!cancelled) {
          setUnitConfigReady(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [coupleEnergyNumber, coupleEnergyTypeId])

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
          {unitConfigReady ? (
            <SystemParamsUnitLayout
              key={`guide-unit-layout-${heatPump ?? '7'}-${resolvedCoupleEnergyTypeId}-${resolvedCoupleEnergyNumber}`}
              variant="guide"
              heatPumpCount={heatPump ?? '7'}
              coupleEnergyTypeId={resolvedCoupleEnergyTypeId}
              coupleEnergyNumber={resolvedCoupleEnergyNumber}
              queryArrangeOnMount={queryArrangeOnReturn}
              arrangeViewOnly={arrangeViewOnly}
              onArrangeViewOnlyExit={handleExitArrangeViewOnly}
              onLayoutStatusChange={({ numberingDone: done }) => setNumberingDone(done)}
              onUnitLayoutCommitted={() => {}}
            />
          ) : null}
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
