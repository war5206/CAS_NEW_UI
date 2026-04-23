import { useCallback, useState } from 'react'
import AttentionModal from '../components/AttentionModal'
import LabeledSelectRow from '../components/LabeledSelectRow'
import { usePollRealvals } from '../hooks/usePollRealvals'
import { useWriteWithDelayedVerify } from '../hooks/useWriteWithDelayedVerify'
import { queryRealvalByLongNames, writeRealvalByLongNames } from '../api/modules/settings'
import { extractRealvalMap } from '../utils/realvalMap'
import './DeviceParamPage.css'

const LN_YLSet1 = 'Sys\\FinforWorx\\YLSet1'
const LN_YLSet2 = 'Sys\\FinforWorx\\YLSet2'
const CONSTANT_PRESSURE_POLL = [LN_YLSet1, LN_YLSet2]

function toDisplayString(v) {
  if (v == null || v === '') return '0'
  const n = Number(v)
  if (Number.isFinite(n)) return String(n)
  return String(v)
}

function ConstantPressurePumpPage() {
  const [attentionMessage, setAttentionMessage] = useState('')
  const onWriteNotify = useCallback((message) => {
    setAttentionMessage(message)
  }, [])

  const { performWrite, isMountedRef } = useWriteWithDelayedVerify({
    write: writeRealvalByLongNames,
    onNotify: onWriteNotify,
  })

  const [startPressure, setStartPressure] = useState('10')
  const [stopPressure, setStopPressure] = useState('20')

  const applyValueMap = useCallback(
    (valueMap) => {
      if (!valueMap || !isMountedRef.current) return
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_YLSet1)) {
        setStartPressure(toDisplayString(valueMap[LN_YLSet1]))
      }
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_YLSet2)) {
        setStopPressure(toDisplayString(valueMap[LN_YLSet2]))
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

  usePollRealvals(CONSTANT_PRESSURE_POLL, applyValueMap)

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
            label="定压补水启动压力设置（kPa）"
            value={startPressure}
            suffix="kPa"
            onChange={(v) => handleWrite(LN_YLSet1, v, setStartPressure)}
            confirmConfig={({ nextValue }) => ({ message: `确认将启动压力设置为 ${nextValue} kPa 吗？` })}
          />
          <LabeledSelectRow
            label="定压补水停止压力设置（kPa）"
            value={stopPressure}
            suffix="kPa"
            onChange={(v) => handleWrite(LN_YLSet2, v, setStopPressure)}
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

export default ConstantPressurePumpPage
