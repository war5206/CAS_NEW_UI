import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AttentionModal from '../components/AttentionModal'
import LabeledSelectRow from '../components/LabeledSelectRow'
import { useActionConfirm } from '../hooks/useActionConfirm'
import { usePollRealvals } from '../hooks/usePollRealvals'
import { useWriteWithDelayedVerify } from '../hooks/useWriteWithDelayedVerify'
import { queryRealvalByLongNames, writeRealvalByLongNames } from '../api/modules/settings'
import { extractRealvalMap } from '../utils/realvalMap'
import './SmartStartStopPage.css'

const SLIDER_MIN = 30
const SLIDER_MAX = 120
const SLIDER_THUMB_WIDTH = 56

const LN_JJZWC = 'Sys\\FinforWorx\\JJZWC'
const LN_JZZQ1 = 'Sys\\FinforWorx\\JZZQ1'
const LN_JZZQ2 = 'Sys\\FinforWorx\\JZZQ2'
const LN_ZDPL = 'Sys\\FinforWorx\\ZDPL'
const LN_ZGPL = 'Sys\\FinforWorx\\ZGPL'
const SMART_START_POLL = [LN_JJZWC, LN_JZZQ1, LN_JZZQ2, LN_ZDPL, LN_ZGPL]

function valueFromTrackClick(event, min, max) {
  const rect = event.currentTarget.getBoundingClientRect()
  const pointerX = event.clientX - rect.left
  const axisStart = SLIDER_THUMB_WIDTH / 2
  const axisEnd = rect.width - SLIDER_THUMB_WIDTH / 2
  const clampedX = Math.min(Math.max(pointerX, axisStart), axisEnd)
  const ratio = axisEnd === axisStart ? 0 : (clampedX - axisStart) / (axisEnd - axisStart)
  const rawValue = min + ratio * (max - min)
  return Math.round(rawValue)
}

function toDisplayString(v, fallback) {
  if (v == null || v === '') return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  return String(n)
}

function parseFreq(n) {
  const x = Math.round(Number(n))
  if (!Number.isFinite(x)) return null
  return Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, x))
}

function applyFreqPairFromMap(valueMap, setMinFreq, setMaxFreq) {
  const ra = valueMap[LN_ZDPL]
  const rb = valueMap[LN_ZGPL]
  if (ra == null && rb == null) return
  let nextMin = parseFreq(ra)
  let nextMax = parseFreq(rb)
  if (nextMin == null && nextMax == null) return
  if (nextMin == null) nextMin = SLIDER_MIN
  if (nextMax == null) nextMax = SLIDER_MAX
  if (nextMax <= nextMin) {
    if (nextMax < SLIDER_MAX) nextMax = nextMin + 1
    else nextMin = nextMax - 1
  }
  if (nextMin < SLIDER_MIN) nextMin = SLIDER_MIN
  if (nextMax > SLIDER_MAX) nextMax = SLIDER_MAX
  if (nextMax <= nextMin) {
    nextMax = Math.min(SLIDER_MAX, nextMin + 1)
  }
  setMinFreq(nextMin)
  setMaxFreq(nextMax)
}

function SmartStartStopPage() {
  const { requestConfirm, confirmModal } = useActionConfirm()
  const [attentionMessage, setAttentionMessage] = useState('')
  const onWriteNotify = useCallback((message) => {
    setAttentionMessage(message)
  }, [])

  const { performWrite, isMountedRef } = useWriteWithDelayedVerify({
    write: writeRealvalByLongNames,
    onNotify: onWriteNotify,
  })

  const [tempDiff, setTempDiff] = useState('10')
  const [loadCycle, setLoadCycle] = useState('10')
  const [unloadCycle, setUnloadCycle] = useState('10')
  const [minFreq, setMinFreq] = useState(55)
  const [maxFreq, setMaxFreq] = useState(120)
  const freqRangeStartRef = useRef({ minFreq: 55, maxFreq: 120 })
  const freqRangeValueRef = useRef({ minFreq: 55, maxFreq: 120 })
  const isFreqRangeDraggingRef = useRef(false)

  const applyValueMap = useCallback((valueMap) => {
    if (!valueMap || !isMountedRef.current) return
    if (Object.prototype.hasOwnProperty.call(valueMap, LN_JJZWC)) {
      setTempDiff(toDisplayString(valueMap[LN_JJZWC], '10'))
    }
    if (Object.prototype.hasOwnProperty.call(valueMap, LN_JZZQ1)) {
      setLoadCycle(toDisplayString(valueMap[LN_JZZQ1], '10'))
    }
    if (Object.prototype.hasOwnProperty.call(valueMap, LN_JZZQ2)) {
      setUnloadCycle(toDisplayString(valueMap[LN_JZZQ2], '10'))
    }
    applyFreqPairFromMap(valueMap, setMinFreq, setMaxFreq)
  }, [isMountedRef])

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

  const handleValueWrite = (longName, nextStr, setLocal) => {
    const n = Number(nextStr)
    const payload = Number.isFinite(n) ? { [longName]: n } : { [longName]: nextStr }
    performWrite(payload, {
      optimisticApply: () => setLocal(nextStr),
      delayedVerify: () => verifyLongNames([longName]),
    })
  }

  const { isInitialAttemptDone } = usePollRealvals(SMART_START_POLL, applyValueMap)

  const rangeText = useMemo(() => `${minFreq}  -  ${maxFreq}`, [minFreq, maxFreq])
  const sliderTrackStyle = useMemo(
    () => ({
      '--min-percent': ((minFreq - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100,
      '--max-percent': ((maxFreq - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100,
    }),
    [maxFreq, minFreq],
  )

  const requestFreqRangeConfirm = (nextMinFreq, nextMaxFreq, previousRange) => {
    requestConfirm(
      { message: `确认将频率区间设定为 ${nextMinFreq} - ${nextMaxFreq} Hz 吗？` },
      () => {
        performWrite(
          { [LN_ZDPL]: nextMinFreq, [LN_ZGPL]: nextMaxFreq },
          { delayedVerify: () => verifyLongNames([LN_ZDPL, LN_ZGPL]) },
        )
      },
      () => {
        setMinFreq(previousRange.minFreq)
        setMaxFreq(previousRange.maxFreq)
      },
    )
  }

  useEffect(() => {
    freqRangeValueRef.current = { minFreq, maxFreq }
  }, [maxFreq, minFreq])

  const handleSliderWrapPointerDown = (event) => {
    if (event.target.closest('.smart-start-stop-page__slider')) {
      return
    }

    const previousRange = { minFreq, maxFreq }
    const nextValue = valueFromTrackClick(event, SLIDER_MIN, SLIDER_MAX)
    let nextMinFreq = minFreq
    let nextMaxFreq = maxFreq
    const minDistance = Math.abs(nextValue - minFreq)
    const maxDistance = Math.abs(nextValue - maxFreq)

    if (minDistance <= maxDistance) {
      nextMinFreq = Math.min(nextValue, maxFreq - 1)
    } else {
      nextMaxFreq = Math.max(nextValue, minFreq + 1)
    }

    setMinFreq(nextMinFreq)
    setMaxFreq(nextMaxFreq)

    if (previousRange.minFreq === nextMinFreq && previousRange.maxFreq === nextMaxFreq) {
      return
    }

    isFreqRangeDraggingRef.current = true
    freqRangeStartRef.current = previousRange
  }

  const handleFreqSliderPointerDown = (event) => {
    event.stopPropagation()
    isFreqRangeDraggingRef.current = true
    freqRangeStartRef.current = freqRangeValueRef.current
  }

  const handleFreqSliderPointerEnd = (event) => {
    event?.stopPropagation?.()

    if (!isFreqRangeDraggingRef.current) {
      return
    }

    isFreqRangeDraggingRef.current = false
    const previousRange = freqRangeStartRef.current
    const nextRange = freqRangeValueRef.current

    if (previousRange.minFreq === nextRange.minFreq && previousRange.maxFreq === nextRange.maxFreq) {
      return
    }

    requestFreqRangeConfirm(nextRange.minFreq, nextRange.maxFreq, previousRange)
  }

  useEffect(() => {
    const handlePointerRelease = () => {
      handleFreqSliderPointerEnd()
    }

    window.addEventListener('pointerup', handlePointerRelease)
    window.addEventListener('pointercancel', handlePointerRelease)

    return () => {
      window.removeEventListener('pointerup', handlePointerRelease)
      window.removeEventListener('pointercancel', handlePointerRelease)
    }
  }, [requestConfirm, minFreq, maxFreq])

  if (!isInitialAttemptDone) {
    return (
      <main className="smart-start-stop-page page-initial-loading" aria-busy="true">
        <div className="page-initial-loading__spinner" aria-hidden />
        <p className="page-initial-loading__text">正在同步页面数据...</p>
      </main>
    )
  }

  return (
    <main className="smart-start-stop-page">
      <section className="smart-start-stop-page__rows">
        <h3 className="smart-start-stop-page__section-title">参数设置</h3>
        <div className="smart-start-stop-page__row-list">
          <LabeledSelectRow
            label="加减载温差（℃）"
            description="维持系统温度在目标温度的偏差范围"
            value={tempDiff}
            suffix="℃"
            onChange={(v) => handleValueWrite(LN_JJZWC, v, setTempDiff)}
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将加减载温差设置为 ${nextValue} ℃吗？` })}
          />

          <LabeledSelectRow
            label="加载周期（分钟）"
            description="用于评估和执行热泵启动操作时间间隔"
            value={loadCycle}
            suffix="分钟"
            onChange={(v) => handleValueWrite(LN_JZZQ1, v, setLoadCycle)}
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将加载周期设置为 ${nextValue} 分钟吗？` })}
          />

          <LabeledSelectRow
            label="卸载周期（分钟）"
            description="用于评估和执行热泵停止操作时间间隔"
            value={unloadCycle}
            suffix="分钟"
            onChange={(v) => handleValueWrite(LN_JZZQ2, v, setUnloadCycle)}
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将卸载周期设置为 ${nextValue} 分钟吗？` })}
          />

          <div className="smart-start-stop-page__freq-row">
            <div className="smart-start-stop-page__freq-header">
              <div>
                <div className="smart-start-stop-page__freq-title">频率区间设定（Hz）</div>
                <p className="smart-start-stop-page__freq-desc">变频机组运行的最低频率 — 最高频率</p>
              </div>
              <div className="smart-start-stop-page__freq-range">{rangeText}</div>
            </div>

            <div
              className="smart-start-stop-page__slider-wrap"
              style={sliderTrackStyle}
              onPointerDown={handleSliderWrapPointerDown}
            >
              <div className="smart-start-stop-page__slider-track" aria-hidden="true" />
              <div className="smart-start-stop-page__slider-range" aria-hidden="true" />
              <input
                type="range"
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                value={minFreq}
                onChange={(event) => setMinFreq(Math.min(Number(event.target.value), maxFreq - 1))}
                onPointerDown={handleFreqSliderPointerDown}
                onPointerUp={handleFreqSliderPointerEnd}
                onPointerCancel={handleFreqSliderPointerEnd}
                className="smart-start-stop-page__slider smart-start-stop-page__slider--min"
                aria-label="最小频率"
              />
              <input
                type="range"
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                value={maxFreq}
                onChange={(event) => setMaxFreq(Math.max(Number(event.target.value), minFreq + 1))}
                onPointerDown={handleFreqSliderPointerDown}
                onPointerUp={handleFreqSliderPointerEnd}
                onPointerCancel={handleFreqSliderPointerEnd}
                className="smart-start-stop-page__slider smart-start-stop-page__slider--max"
                aria-label="最大频率"
              />
            </div>
          </div>
        </div>
      </section>
      {confirmModal}
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

export default SmartStartStopPage
