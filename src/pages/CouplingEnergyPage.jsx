import { useCallback, useState } from 'react'
import AttentionModal from '../components/AttentionModal'
import FeatureInfoCard from '../components/FeatureInfoCard'
import { usePollRealvals } from '../hooks/usePollRealvals'
import { useWriteWithDelayedVerify } from '../hooks/useWriteWithDelayedVerify'
import { queryRealvalByLongNames, writeRealvalByLongNames } from '../api/modules/settings'
import { extractRealvalMap, isOnValue } from '../utils/realvalMap'
import couplingEnergyIcon from '../assets/icons/couple-energy.svg'
import './CouplingEnergyPage.css'

const LN_OHNY = 'Sys\\FinforWorx\\OHNY'
const COUPLING_POLL = [LN_OHNY]

function CouplingEnergyIcon() {
  return <img src={couplingEnergyIcon} alt="" aria-hidden="true" />
}

function CouplingEnergyPage() {
  const [isCouplingEnabled, setIsCouplingEnabled] = useState(true)
  const [attentionMessage, setAttentionMessage] = useState('')
  const onWriteNotify = useCallback((message) => {
    setAttentionMessage(message)
  }, [])

  const { performWrite, isMountedRef } = useWriteWithDelayedVerify({
    write: writeRealvalByLongNames,
    onNotify: onWriteNotify,
  })

  const applyValueMap = useCallback(
    (valueMap) => {
      if (!valueMap || !isMountedRef.current) return
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_OHNY)) {
        setIsCouplingEnabled(isOnValue(valueMap[LN_OHNY]))
      }
    },
    [isMountedRef],
  )

  const verifyLongNames = useCallback(
    async (longNames) => {
      try {
        const response = await queryRealvalByLongNames(longNames)
        const m = extractRealvalMap(response)
        if (m) applyValueMap(m)
      } catch {
        // ignore
      }
    },
    [applyValueMap],
  )

  usePollRealvals(COUPLING_POLL, applyValueMap)

  const handleToggle = () => {
    const next = !isCouplingEnabled
    performWrite(
      { [LN_OHNY]: next ? 1 : 0 },
      {
        optimisticApply: () => setIsCouplingEnabled(next),
        delayedVerify: () => verifyLongNames([LN_OHNY]),
      },
    )
  }

  return (
    <main className="coupling-energy-page">
      <FeatureInfoCard
        icon={<CouplingEnergyIcon />}
        title="耦合能源"
        description="开启时，耦合能源参与系统的运行"
        selected={isCouplingEnabled}
        onClick={handleToggle}
        className="coupling-energy-page__card"
        confirmConfig={({ nextSelected }) => ({
          message: `确认${nextSelected ? '开启' : '关闭'}耦合能源吗？`,
        })}
      />
      <AttentionModal
        isOpen={Boolean(attentionMessage)}
        title="提示"
        message={attentionMessage}
        confirmText="确认"
        showCancel={false}
        onClose={() => setAttentionMessage('')}
        onConfirm={() => setAttentionMessage('')}
        zIndex={300}
      />
    </main>
  )
}

export default CouplingEnergyPage
