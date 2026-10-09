import { useCallback, useState } from 'react'
import AttentionModal from '../components/AttentionModal'
import FeatureInfoCard from '../components/FeatureInfoCard'
import LabeledSelectRow from '../components/LabeledSelectRow'
import { usePollRealvals } from '../hooks/usePollRealvals'
import { useWriteWithDelayedVerify } from '../hooks/useWriteWithDelayedVerify'
import { queryRealvalByLongNames, writeRealvalByLongNames } from '../api/modules/settings'
import { extractRealvalMap, isOnValue } from '../utils/realvalMap'
import waterPumpIcon from '../assets/water-pump.svg'
import './DeviceParamPage.css'

const LN_MDXHB1 = 'Sys\\FinforWorx\\MDXHB1'
const LN_MDXHB2 = 'Sys\\FinforWorx\\MDXHB2'
const LN_MDXHB3 = 'Sys\\FinforWorx\\MDXHB3'
const LN_MDXHB4 = 'Sys\\FinforWorx\\MDXHB4'
const LN_GHSWCSD = 'Sys\\FinforWorx\\GHSWCSD'
const TERMINAL_LOOP_PUMP_POLL = [LN_MDXHB1, LN_MDXHB2, LN_MDXHB3, LN_MDXHB4, LN_GHSWCSD]

function toDisplayString(v) {
  if (v == null || v === '') return '0'
  const n = Number(v)
  if (Number.isFinite(n)) return String(n)
  return String(v)
}

function TerminalLoopPumpPage() {
  const [attentionMessage, setAttentionMessage] = useState('')
  const onWriteNotify = useCallback((message) => {
    setAttentionMessage(message)
  }, [])

  const { performWrite, isMountedRef } = useWriteWithDelayedVerify({
    write: writeRealvalByLongNames,
    onNotify: onWriteNotify,
  })

  const [isIntervalSavingEnabled, setIsIntervalSavingEnabled] = useState(false)
  const [pressureDiff, setPressureDiff] = useState('10')
  const [startMinutes, setStartMinutes] = useState('10')
  const [stopMinutes, setStopMinutes] = useState('10')
  const [rotationDays, setRotationDays] = useState('10')

  const applyValueMap = useCallback(
    (valueMap) => {
      if (!valueMap || !isMountedRef.current) return
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_MDXHB1)) {
        setIsIntervalSavingEnabled(isOnValue(valueMap[LN_MDXHB1]))
      }
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_MDXHB2)) {
        setStartMinutes(toDisplayString(valueMap[LN_MDXHB2]))
      }
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_MDXHB3)) {
        setStopMinutes(toDisplayString(valueMap[LN_MDXHB3]))
      }
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_MDXHB4)) {
        setRotationDays(toDisplayString(valueMap[LN_MDXHB4]))
      }
      if (Object.prototype.hasOwnProperty.call(valueMap, LN_GHSWCSD)) {
        setPressureDiff(toDisplayString(valueMap[LN_GHSWCSD]))
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

  const { isInitialAttemptDone } = usePollRealvals(TERMINAL_LOOP_PUMP_POLL, applyValueMap)

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
      { [LN_MDXHB1]: next ? 1 : 0 },
      {
        optimisticApply: () => setIsIntervalSavingEnabled(next),
        delayedVerify: () => verifyLongNames([LN_MDXHB1]),
      },
    )
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
      <FeatureInfoCard
        icon={waterPumpIcon}
        iconAlt="水泵"
        title="水泵间隔循环节能功能"
        description="开启时，水泵按照间隔启停的节能方式运行"
        selected={isIntervalSavingEnabled}
        onClick={handleToggle}
        confirmConfig={({ nextSelected }) => ({
          message: `确认${nextSelected ? '开启' : '关闭'}水泵间隔循环节能功能吗？`,
        })}
      />

      <section className="device-param-page__section">
        <div className="device-param-page__rows">
          <LabeledSelectRow
            label="循环泵间隔启动时间（分钟）"
            description="节能功能开启，所有机组停机后循环泵持续运行时间"
            value={startMinutes}
            suffix="分钟"
            onChange={(v) => handleWrite(LN_MDXHB2, v, setStartMinutes)}
            disabled={!isIntervalSavingEnabled}
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将循环泵间隔启动时间设置为 ${nextValue} 分钟吗？` })}
          />
          <LabeledSelectRow
            label="循环泵间隔停止时间（分钟）"
            description="节能功能开启，循环泵持续停止时间"
            value={stopMinutes}
            suffix="分钟"
            onChange={(v) => handleWrite(LN_MDXHB3, v, setStopMinutes)}
            disabled={!isIntervalSavingEnabled}
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将循环泵间隔停止时间设置为 ${nextValue} 分钟吗？` })}
          />
          <LabeledSelectRow
            label="末端循环泵轮值时间（小时）"
            description="循环泵主备相互切换的时间"
            value={rotationDays}
            suffix="小时"
            onChange={(v) => handleWrite(LN_MDXHB4, v, setRotationDays)}
            disabled={!isIntervalSavingEnabled}
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将轮值时间设置为 ${nextValue} 小时吗？` })}
          />
          <LabeledSelectRow
            label="压差设定（kPa）"
            description="变频供水泵下通过调节频率维持此压差"
            value={pressureDiff}
            suffix="kPa"
            onChange={(v) => handleWrite(LN_GHSWCSD, v, setPressureDiff)}
            disabled={!isIntervalSavingEnabled}
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将压差设定为 ${nextValue} kPa 吗？` })}
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

export default TerminalLoopPumpPage
