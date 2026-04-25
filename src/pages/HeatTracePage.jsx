import { useCallback, useState } from 'react'
import AttentionModal from '../components/AttentionModal'
import LabeledSelectRow from '../components/LabeledSelectRow'
import { usePollRealvals } from '../hooks/usePollRealvals'
import { useWriteWithDelayedVerify } from '../hooks/useWriteWithDelayedVerify'
import { queryRealvalByLongNames, writeRealvalByLongNames } from '../api/modules/settings'
import { extractRealvalMap } from '../utils/realvalMap'
import './DeviceParamPage.css'

const LN_WDSet1 = 'TropicalPump\\SJMG\\No1\\WDSet1'
const LN_WDSet2 = 'TropicalPump\\SJMG\\No1\\WDSet2'
const LN_TSGBTime = 'Sys\\FinforWorx\\TSGBTime'
const HEAT_TRACE_POLL = [LN_WDSet1, LN_WDSet2, LN_TSGBTime]

function toDisplayString(v) {
  if (v == null || v === '') return '0'
  const n = Number(v)
  if (Number.isFinite(n)) return String(n)
  return String(v)
}

function HeatTracePage() {
  const [attentionMessage, setAttentionMessage] = useState('')
  const onWriteNotify = useCallback((message) => {
    setAttentionMessage(message)
  }, [])

  const { performWrite, isMountedRef } = useWriteWithDelayedVerify({
    write: writeRealvalByLongNames,
    onNotify: onWriteNotify,
  })

  const [startTemp, setStartTemp] = useState('10')
  const [stopTemp, setStopTemp] = useState('10')
  const [delayCloseMinutes, setDelayCloseMinutes] = useState('10')

  const applyValueMap = useCallback(
    (valueMap) => {
      if (!valueMap || !isMountedRef.current) return
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_WDSet1)) {
        setStartTemp(toDisplayString(valueMap[LN_WDSet1]))
      }
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_WDSet2)) {
        setStopTemp(toDisplayString(valueMap[LN_WDSet2]))
      }
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_TSGBTime)) {
        setDelayCloseMinutes(toDisplayString(valueMap[LN_TSGBTime]))
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

  const { isInitialAttemptDone } = usePollRealvals(HEAT_TRACE_POLL, applyValueMap)

  const handleWrite = (longName, valueStr, setLocal) => {
    const n = Number(valueStr)
    const payload = Number.isFinite(n) ? { [longName]: n } : { [longName]: valueStr }
    performWrite(payload, {
      optimisticApply: () => setLocal(valueStr),
      delayedVerify: () => verifyLongNames([longName]),
    })
  }

  if (!isInitialAttemptDone) {
    return (
      <main className="device-param-page page-initial-loading" aria-busy="true">
        <div className="page-initial-loading__spinner" aria-hidden />
        <p className="page-initial-loading__text">正在同步页面数据...</p>
      </main>
    )
  }

  return (
    <main className="device-param-page">
      <section className="device-param-page__section">
        <h3 className="device-param-page__title">参数设置</h3>
        <div className="device-param-page__rows">
          <LabeledSelectRow
            label="伴热带启动温度设置（℃）"
            description="当温度达到设定值时，伴热带启动"
            value={startTemp}
            suffix="℃"
            onChange={(v) => handleWrite(LN_WDSet1, v, setStartTemp)}
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将伴热带启动温度设置为 ${nextValue} ℃吗？` })}
          />
          <LabeledSelectRow
            label="伴热带关闭温度设置（℃）"
            description="当温度达到设定值时，伴热带关闭"
            value={stopTemp}
            suffix="℃"
            onChange={(v) => handleWrite(LN_WDSet2, v, setStopTemp)}
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将伴热带关闭温度设置为 ${nextValue} ℃吗？` })}
          />
          <LabeledSelectRow
            label="化霜后延时关闭时间（分钟）"
            description="全部化霜结束后延时关闭伴热带时间设定"
            value={delayCloseMinutes}
            suffix="分钟"
            onChange={(v) => handleWrite(LN_TSGBTime, v, setDelayCloseMinutes)}
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将延时关闭时间设置为 ${nextValue} 分钟吗？` })}
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

export default HeatTracePage
