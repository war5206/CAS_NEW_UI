import { useCallback, useState } from 'react'
import AttentionModal from '../components/AttentionModal'
import LabeledSelectRow from '../components/LabeledSelectRow'
import { usePollRealvals } from '../hooks/usePollRealvals'
import { useWriteWithDelayedVerify } from '../hooks/useWriteWithDelayedVerify'
import { queryRealvalByLongNames, writeRealvalByLongNames } from '../api/modules/settings'
import { extractRealvalMap } from '../utils/realvalMap'
import './DeviceParamPage.css'

const LN_PWSJD1 = 'SewageValvePump\\SJMG\\No1\\PWSJD1'
const LN_PWSJD2 = 'SewageValvePump\\SJMG\\No1\\PWSJD2'
const LN_PWZQ = 'SewageValvePump\\SJMG\\No1\\PWZQ'
const LN_PWTime = 'SewageValvePump\\SJMG\\No1\\PWTime'
const DRAIN_VALVE_POLL = [LN_PWSJD1, LN_PWSJD2, LN_PWZQ, LN_PWTime]

function formatTwoDigits(value) {
  return String(value).padStart(2, '0')
}

function formatTimeText(hour, minute) {
  return `${formatTwoDigits(hour)}:${formatTwoDigits(minute)}`
}

function parseTimeString(text) {
  const parsed = String(text ?? '')
    .trim()
    .match(/^(\d{1,2}):(\d{1,2})$/)
  if (!parsed) {
    return [0, 0]
  }
  const hours = Number.parseInt(parsed[1], 10)
  const minutes = Number.parseInt(parsed[2], 10)
  const safeHours = Number.isFinite(hours) ? Math.min(Math.max(hours, 0), 23) : 0
  const safeMinutes = Number.isFinite(minutes) ? Math.min(Math.max(minutes, 0), 59) : 0
  return [safeHours, safeMinutes]
}

function toDisplayString(v) {
  if (v == null || v === '') return '0'
  const n = Number(v)
  if (Number.isFinite(n)) return String(n)
  return String(v)
}

function DrainValvePage() {
  const [attentionMessage, setAttentionMessage] = useState('')
  const onWriteNotify = useCallback((message) => {
    setAttentionMessage(message)
  }, [])

  const { performWrite, isMountedRef } = useWriteWithDelayedVerify({
    write: writeRealvalByLongNames,
    onNotify: onWriteNotify,
  })

  const [drainTimePoint, setDrainTimePoint] = useState('08:00')
  const [drainCycleDays, setDrainCycleDays] = useState('05')
  const [drainDurationSec, setDrainDurationSec] = useState('10')

  const applyValueMap = useCallback(
    (valueMap) => {
      if (!valueMap || !isMountedRef.current) return
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_PWSJD1) || Object.prototype.hasOwnProperty.call(valueMap, LN_PWSJD2)) {
        const h = Number(valueMap[LN_PWSJD1] ?? 0)
        const m = Number(valueMap[LN_PWSJD2] ?? 0)
        const sh = Number.isFinite(h) ? Math.min(23, Math.max(0, Math.round(h))) : 0
        const sm = Number.isFinite(m) ? Math.min(59, Math.max(0, Math.round(m))) : 0
        setDrainTimePoint(formatTimeText(sh, sm))
      }
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_PWZQ)) {
        setDrainCycleDays(toDisplayString(valueMap[LN_PWZQ]))
      }
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_PWTime)) {
        setDrainDurationSec(toDisplayString(valueMap[LN_PWTime]))
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

  usePollRealvals(DRAIN_VALVE_POLL, applyValueMap)

  const handleTimeChange = (nextTimeText) => {
    const [h, m] = parseTimeString(nextTimeText)
    performWrite(
      { [LN_PWSJD1]: h, [LN_PWSJD2]: m },
      {
        optimisticApply: () => setDrainTimePoint(formatTimeText(h, m)),
        delayedVerify: () => verifyLongNames([LN_PWSJD1, LN_PWSJD2]),
      },
    )
  }

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
            label="排污时间点"
            description="排污的时间设定"
            value={drainTimePoint}
            onChange={handleTimeChange}
            popupType="time"
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将排污时间点设置为 ${nextValue} 吗？` })}
          />
          <LabeledSelectRow
            label="排污周期（天）"
            value={drainCycleDays}
            suffix="天"
            onChange={(v) => handleWrite(LN_PWZQ, v, setDrainCycleDays)}
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将排污周期设置为 ${nextValue} 天吗？` })}
          />
          <LabeledSelectRow
            label="排污持续时间（秒）"
            value={drainDurationSec}
            suffix="秒"
            onChange={(v) => handleWrite(LN_PWTime, v, setDrainDurationSec)}
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将排污持续时间设置为 ${nextValue} 秒吗？` })}
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

export default DrainValvePage
