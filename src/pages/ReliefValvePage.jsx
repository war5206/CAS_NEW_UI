import { useCallback, useState } from 'react'
import AttentionModal from '../components/AttentionModal'
import LabeledSelectRow from '../components/LabeledSelectRow'
import { usePollRealvals } from '../hooks/usePollRealvals'
import { useWriteWithDelayedVerify } from '../hooks/useWriteWithDelayedVerify'
import { queryRealvalByLongNames, writeRealvalByLongNames } from '../api/modules/settings'
import { extractRealvalMap } from '../utils/realvalMap'
import './DeviceParamPage.css'

const LN_YL1 = 'PressureReliefValvePump\\SJMG\\No1\\YL1'
const LN_YL2 = 'PressureReliefValvePump\\SJMG\\No1\\YL2'
const RELIEF_VALVE_POLL = [LN_YL1, LN_YL2]

function toDisplayString(v) {
  if (v == null || v === '') return '0'
  const n = Number(v)
  if (Number.isFinite(n)) return String(n)
  return String(v)
}

function ReliefValvePage() {
  const [attentionMessage, setAttentionMessage] = useState('')
  const onWriteNotify = useCallback((message) => {
    setAttentionMessage(message)
  }, [])

  const { performWrite, isMountedRef } = useWriteWithDelayedVerify({
    write: writeRealvalByLongNames,
    onNotify: onWriteNotify,
  })

  const [startPressure, setStartPressure] = useState('10')
  const [stopPressure, setStopPressure] = useState('10')

  const applyValueMap = useCallback(
    (valueMap) => {
      if (!valueMap || !isMountedRef.current) return
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_YL1)) {
        setStartPressure(toDisplayString(valueMap[LN_YL1]))
      }
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_YL2)) {
        setStopPressure(toDisplayString(valueMap[LN_YL2]))
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

  usePollRealvals(RELIEF_VALVE_POLL, applyValueMap)

  const handleWrite = (longName, valueStr, setLocal) => {
    const n = Number(valueStr)
    const payload = Number.isFinite(n) ? { [longName]: n } : { [longName]: valueStr }
    performWrite(payload, {
      optimisticApply: () => setLocal(valueStr),
      delayedVerify: () => verifyLongNames([longName]),
    })
  }

  return (
    <main className="device-param-page">
      <section className="device-param-page__section">
        <h3 className="device-param-page__title">参数设置</h3>
        <div className="device-param-page__rows">
          <LabeledSelectRow
            label="泄压补水启动压力设定（kPa）"
            value={startPressure}
            suffix="kPa"
            onChange={(v) => handleWrite(LN_YL1, v, setStartPressure)}
            confirmConfig={({ nextValue }) => ({ message: `确认将启动压力设置为 ${nextValue} kPa 吗？` })}
          />
          <LabeledSelectRow
            label="泄压补水停止压力设定（kPa）"
            value={stopPressure}
            suffix="kPa"
            onChange={(v) => handleWrite(LN_YL2, v, setStopPressure)}
            confirmConfig={({ nextValue }) => ({ message: `确认将停止压力设置为 ${nextValue} kPa 吗？` })}
          />
        </div>
      </section>
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

export default ReliefValvePage
