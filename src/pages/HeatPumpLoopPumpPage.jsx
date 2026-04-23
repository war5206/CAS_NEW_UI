import { useCallback, useState } from 'react'
import AttentionModal from '../components/AttentionModal'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import { usePollRealvals } from '../hooks/usePollRealvals'
import { useWriteWithDelayedVerify } from '../hooks/useWriteWithDelayedVerify'
import { queryRealvalByLongNames, writeRealvalByLongNames } from '../api/modules/settings'
import { extractRealvalMap, isOnValue } from '../utils/realvalMap'
import waterPumpIcon from '../assets/water-pump.svg'
import './HeatPumpLoopPumpPage.css'

const LN_HPXHB1 = 'Sys\\FinforWorx\\HPXHB1'
const LN_HPXHB2 = 'Sys\\FinforWorx\\HPXHB2'
const LN_HPXHB3 = 'Sys\\FinforWorx\\HPXHB3'
const LN_HPXHB4 = 'Sys\\FinforWorx\\HPXHB4'
const HP_LOOP_PUMP_POLL = [LN_HPXHB1, LN_HPXHB2, LN_HPXHB3, LN_HPXHB4]

function toDisplayString(v) {
  if (v == null || v === '') return '0'
  const n = Number(v)
  if (Number.isFinite(n)) return String(n)
  return String(v)
}

function HeatPumpLoopPumpPage() {
  const [attentionMessage, setAttentionMessage] = useState('')
  const onWriteNotify = useCallback((message) => {
    setAttentionMessage(message)
  }, [])

  const { performWrite, isMountedRef } = useWriteWithDelayedVerify({
    write: writeRealvalByLongNames,
    onNotify: onWriteNotify,
  })

  const [isIntervalSavingEnabled, setIsIntervalSavingEnabled] = useState(false)
  const [startMinutes, setStartMinutes] = useState('10')
  const [stopMinutes, setStopMinutes] = useState('10')
  const [rotationDays, setRotationDays] = useState('72')

  const applyValueMap = useCallback(
    (valueMap) => {
      if (!valueMap || !isMountedRef.current) return
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_HPXHB1)) {
        setIsIntervalSavingEnabled(isOnValue(valueMap[LN_HPXHB1]))
      }
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_HPXHB2)) {
        setStartMinutes(toDisplayString(valueMap[LN_HPXHB2]))
      }
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_HPXHB3)) {
        setStopMinutes(toDisplayString(valueMap[LN_HPXHB3]))
      }
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_HPXHB4)) {
        setRotationDays(toDisplayString(valueMap[LN_HPXHB4]))
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

  usePollRealvals(HP_LOOP_PUMP_POLL, applyValueMap)

  const handleWrite = (longName, valueStr, setLocal) => {
    const n = Number(valueStr)
    const payload = Number.isFinite(n) ? { [longName]: n } : { [longName]: valueStr }
    performWrite(payload, {
      optimisticApply: () => setLocal(valueStr),
      delayedVerify: () => verifyLongNames([longName]),
    })
  }

  const handleToggle = () => {
    const next = !isIntervalSavingEnabled
    performWrite(
      { [LN_HPXHB1]: next ? 1 : 0 },
      {
        optimisticApply: () => setIsIntervalSavingEnabled(next),
        delayedVerify: () => verifyLongNames([LN_HPXHB1]),
      },
    )
  }

  return (
    <main className="hp-loop-pump-page">
      <FeatureInfoCard
        icon={waterPumpIcon}
        iconAlt="水泵"
        title="水泵间隔循环节能功能"
        description="开启时，水泵按间隔启停的节能方式运行"
        selected={isIntervalSavingEnabled}
        onClick={handleToggle}
        confirmConfig={({ nextSelected }) => ({
          message: `确认${nextSelected ? '开启' : '关闭'}水泵间隔循环节能功能吗？`,
        })}
      />

      <section className={`hp-loop-pump-page__rows${!isIntervalSavingEnabled ? ' is-disabled' : ''}`}>
        <h3 className="hp-loop-pump-page__section-title">循环设置</h3>
        <div className="hp-loop-pump-page__row-list">
          <LabeledSelectRow
            label="循环泵间隔启动时间（分钟）"
            description="节能功能开启后，所有机组停机后循环泵持续运行时间"
            value={startMinutes}
            suffix="分钟"
            onChange={(v) => handleWrite(LN_HPXHB2, v, setStartMinutes)}
            disabled={!isIntervalSavingEnabled}
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将循环泵间隔启动时间设置为 ${nextValue} 分钟吗？` })}
          />
          <LabeledSelectRow
            label="循环泵间隔停止时间（分钟）"
            description="节能功能开启后，循环泵持续停止时间"
            value={stopMinutes}
            suffix="分钟"
            onChange={(v) => handleWrite(LN_HPXHB3, v, setStopMinutes)}
            disabled={!isIntervalSavingEnabled}
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将循环泵间隔停止时间设置为 ${nextValue} 分钟吗？` })}
          />
          <LabeledSelectRow
            label="热泵循环轮值时间（天）"
            description="循环泵主备相互切换的时间"
            value={rotationDays}
            suffix="天"
            onChange={(v) => handleWrite(LN_HPXHB4, v, setRotationDays)}
            disabled={!isIntervalSavingEnabled}
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将热泵循环轮值时间设置为 ${nextValue} 天吗？` })}
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

export default HeatPumpLoopPumpPage
