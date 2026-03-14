import { useEffect, useMemo, useRef, useState } from 'react'
import LabeledSelectRow from '../components/LabeledSelectRow'
import { useActionConfirm } from '../hooks/useActionConfirm'
import './SmartStartStopPage.css'

const SLIDER_MIN = 0
const SLIDER_MAX = 20
const SLIDER_THUMB_WIDTH = 56

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

function SmartStartStopPage() {
  const { requestConfirm, confirmModal } = useActionConfirm()
  const [tempDiff, setTempDiff] = useState('10')
  const [loadCycle, setLoadCycle] = useState('10')
  const [unloadCycle, setUnloadCycle] = useState('10')
  const [coolingDiff, setCoolingDiff] = useState('10')
  const [minFreq, setMinFreq] = useState(5)
  const [maxFreq, setMaxFreq] = useState(14)
  const freqRangeStartRef = useRef({ minFreq: 5, maxFreq: 14 })
  const freqRangeValueRef = useRef({ minFreq: 5, maxFreq: 14 })
  const isFreqRangeDraggingRef = useRef(false)

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
      () => {},
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
            onChange={setTempDiff}
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将加减载温差设置为 ${nextValue} ℃吗？` })}
          />

          <LabeledSelectRow
            label="加载周期（分钟）"
            description="用于评估和执行热泵启动操作时间间隔"
            value={loadCycle}
            suffix="分钟"
            onChange={setLoadCycle}
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将加载周期设置为 ${nextValue} 分钟吗？` })}
          />

          <LabeledSelectRow
            label="卸载周期（分钟）"
            description="用于评估和执行热泵停止操作时间间隔"
            value={unloadCycle}
            suffix="分钟"
            onChange={setUnloadCycle}
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

          <LabeledSelectRow
            label="制冷温差设定（℃）"
            value={coolingDiff}
            suffix="℃"
            onChange={setCoolingDiff}
            useModeCardControl
            confirmConfig={({ nextValue }) => ({ message: `确认将制冷温差设置为 ${nextValue} ℃吗？` })}
          />
        </div>
      </section>
      {confirmModal}
    </main>
  )
}

export default SmartStartStopPage
