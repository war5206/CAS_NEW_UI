import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { scanSystemDevice, setInitState } from '@/api/modules/home'
import systemTypeIcon from '@/assets/basic-setting-system-type.svg'
import heatPumpGroupIcon from '@/assets/heat-pump/heat-pump-group-control.svg'
import waterPumpIcon from '@/assets/water-pump.svg'
import gearIcon from '@/assets/gear-setting.svg'
import './GuidePage.css'

const ANIM_DURATION = 4000
const RING_RADIUS = 130
const RING_STROKE = 14
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const TAG_ICON_MAP = {
  xtjcx: systemTypeIcon,
  rb: heatPumpGroupIcon,
  sb: waterPumpIcon,
}

function getCategoryIcon(tag) {
  return TAG_ICON_MAP[tag] || gearIcon
}

function StatusIcon({ pass, size = 22 }) {
  if (pass) {
    return (
      <svg className="system-detect__status-icon is-pass" width={size} height={size} viewBox="0 0 22 22" fill="none">
        <path d="M4.5 11.5L9 16L17.5 6" stroke="#52C41A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg className="system-detect__status-icon is-fail" width={size} height={size} viewBox="0 0 22 22" fill="none">
      <path d="M5.5 5.5L16.5 16.5M16.5 5.5L5.5 16.5" stroke="#FF4D4F" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function SystemDetectGuidePage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [scanResult, setScanResult] = useState(null)
  const [visibleCount, setVisibleCount] = useState(0)
  const [expandedTag, setExpandedTag] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const rafRef = useRef(null)
  const animDoneRef = useRef(false)
  const revealDoneRef = useRef(false)
  const revealTimersRef = useRef([])
  const t0Ref = useRef(0)
  const aliveRef = useRef(true)
  const sessionRef = useRef(0)

  const cancelRunning = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    revealTimersRef.current.forEach(clearTimeout)
    revealTimersRef.current = []
  }, [])

  const startDetection = useCallback(() => {
    cancelRunning()
    const session = ++sessionRef.current

    setPhase('detecting')
    setProgress(0)
    setScanResult(null)
    setVisibleCount(0)
    setExpandedTag(null)
    animDoneRef.current = false
    revealDoneRef.current = false
    t0Ref.current = performance.now()

    const isStale = () => !aliveRef.current || sessionRef.current !== session

    const checkDone = () => {
      if (isStale()) return
      if (animDoneRef.current && revealDoneRef.current) {
        setProgress(100)
        setPhase('completed')
      }
    }

    const tick = (now) => {
      if (isStale()) return
      const elapsed = now - t0Ref.current
      setProgress(Math.min(100, Math.round((elapsed / ANIM_DURATION) * 100)))
      if (elapsed < ANIM_DURATION) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        animDoneRef.current = true
        setProgress(100)
        checkDone()
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    scanSystemDevice()
      .then((res) => {
        if (isStale()) return
        const data = res?.data?.data?.scanResult ?? res?.data?.scanResult ?? []
        setScanResult(data)

        if (data.length === 0) {
          revealDoneRef.current = true
          checkDone()
          return
        }

        const elapsed = performance.now() - t0Ref.current
        const remaining = Math.max(0, ANIM_DURATION - elapsed)
        const interval = Math.max(400, Math.floor(remaining / data.length))

        data.forEach((_, idx) => {
          const timer = setTimeout(() => {
            if (isStale()) return
            setVisibleCount(idx + 1)
            if (idx === data.length - 1) {
              revealDoneRef.current = true
              checkDone()
            }
          }, idx * interval)
          revealTimersRef.current.push(timer)
        })
      })
      .catch(() => {
        if (isStale()) return
        setScanResult([])
        revealDoneRef.current = true
        checkDone()
      })
  }, [cancelRunning])

  useEffect(() => {
    aliveRef.current = true
    const delay = setTimeout(() => startDetection(), 600)
    return () => {
      aliveRef.current = false
      clearTimeout(delay)
      cancelRunning()
    }
  }, [startDetection, cancelRunning])

  const handleStop = () => {
    cancelRunning()
    sessionRef.current++
    setPhase('stopped')
  }

  const handleResume = () => {
    cancelRunning()
    const session = ++sessionRef.current
    const frozenProgress = progress

    setPhase('detecting')
    animDoneRef.current = false
    revealDoneRef.current = false
    t0Ref.current = performance.now() - (ANIM_DURATION * frozenProgress / 100)

    const isStale = () => !aliveRef.current || sessionRef.current !== session

    const checkDone = () => {
      if (isStale()) return
      if (animDoneRef.current && revealDoneRef.current) {
        setProgress(100)
        setPhase('completed')
      }
    }

    const tick = (now) => {
      if (isStale()) return
      const elapsed = now - t0Ref.current
      setProgress(Math.min(100, Math.round((elapsed / ANIM_DURATION) * 100)))
      if (elapsed < ANIM_DURATION) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        animDoneRef.current = true
        setProgress(100)
        checkDone()
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    const cachedResult = scanResult
    const alreadyVisible = visibleCount

    if (cachedResult && cachedResult.length > 0) {
      const total = cachedResult.length
      if (alreadyVisible >= total) {
        revealDoneRef.current = true
        checkDone()
      } else {
        const remainingDuration = ANIM_DURATION * (1 - frozenProgress / 100)
        const remainingItems = total - alreadyVisible
        const interval = Math.max(400, Math.floor(remainingDuration / remainingItems))

        for (let i = alreadyVisible; i < total; i++) {
          const timer = setTimeout(() => {
            if (isStale()) return
            setVisibleCount(i + 1)
            if (i === total - 1) {
              revealDoneRef.current = true
              checkDone()
            }
          }, (i - alreadyVisible) * interval)
          revealTimersRef.current.push(timer)
        }
      }
    } else {
      scanSystemDevice()
        .then((res) => {
          if (isStale()) return
          const data = res?.data?.data?.scanResult ?? res?.data?.scanResult ?? []
          setScanResult(data)

          if (data.length === 0) {
            revealDoneRef.current = true
            checkDone()
            return
          }

          const elapsed = performance.now() - t0Ref.current
          const remaining = Math.max(0, ANIM_DURATION - elapsed)
          const interval = Math.max(400, Math.floor(remaining / data.length))

          data.forEach((_, idx) => {
            const timer = setTimeout(() => {
              if (isStale()) return
              setVisibleCount(idx + 1)
              if (idx === data.length - 1) {
                revealDoneRef.current = true
                checkDone()
              }
            }, idx * interval)
            revealTimersRef.current.push(timer)
          })
        })
        .catch(() => {
          if (isStale()) return
          setScanResult([])
          revealDoneRef.current = true
          checkDone()
        })
    }
  }

  const handleComplete = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await setInitState()
      const success = res?.data?.success ?? res?.data?.data?.success
      if (success) {
        navigate('/home')
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false)
    }
  }

  const handleCategoryClick = (tag) => {
    setExpandedTag((prev) => (prev === tag ? null : tag))
  }

  const dashOffset = RING_CIRCUMFERENCE * (1 - progress / 100)
  const visibleCategories = scanResult ? scanResult.slice(0, visibleCount) : []
  const expandedCategory = scanResult?.find((c) => c.tag === expandedTag) ?? null

  return (
    <div className="guide-page guide-page--system-detect">
      <div className="system-detect">
        <h1 className="system-detect__title">
          {phase === 'completed' ? '检测完成' : '系统检测'}
        </h1>

        <div className="system-detect__progress">
          <svg className="system-detect__ring" viewBox="0 0 300 300">
            <circle
              cx="150" cy="150" r={RING_RADIUS}
              fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={RING_STROKE}
            />
            {progress > 0 && (
              <circle
                className="system-detect__ring-fill"
                cx="150" cy="150" r={RING_RADIUS}
                fill="none" stroke="#197CDF" strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 150 150)"
              />
            )}
          </svg>
          <div className="system-detect__value">
            <span className="system-detect__number">{progress}</span>
            <span className="system-detect__percent">%</span>
          </div>
        </div>

        {visibleCategories.length > 0 && (
          <div className="system-detect__result">
            <div className="system-detect__categories">
              {visibleCategories.map((cat) => {
                const allPass = cat.state === 'true'
                const isSelected = expandedTag === cat.tag
                return (
                  <button
                    key={cat.tag}
                    type="button"
                    className={`system-detect__category${isSelected ? ' is-selected' : ''}`}
                    onClick={() => handleCategoryClick(cat.tag)}
                  >
                    <div className="system-detect__category-left">
                      <img className="system-detect__category-icon" src={getCategoryIcon(cat.tag)} alt="" />
                      <span className="system-detect__category-name">{cat.name}</span>
                    </div>
                    <StatusIcon pass={allPass} />
                  </button>
                )
              })}
            </div>

            {expandedCategory && (
              <div className="system-detect__detail" key={expandedCategory.tag}>
                <div className="system-detect__detail-grid">
                  {expandedCategory.pointState.map((point, idx) => {
                    const pass = point.state === 'true'
                    return (
                      <div key={point.longName || idx} className="system-detect__detail-item">
                        <div className="system-detect__detail-left">
                          <span className={`system-detect__detail-dot${pass ? ' is-pass' : ' is-fail'}`} />
                          <span className="system-detect__detail-name">{point.name}</span>
                        </div>
                        <StatusIcon pass={pass} size={18} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="system-detect__footer">
          {phase === 'completed' ? (
            <div className="system-detect__footer-end">
              <button type="button" className="guide-page__btn" onClick={() => navigate('/guide/energy-price')}>
                返回
              </button>
              <button type="button" className="guide-page__btn is-primary" disabled={submitting} onClick={handleComplete}>
                {submitting ? <span className="guide-loading-inline"><span className="guide-loading-spinner" aria-hidden="true" />提交中</span> : '完成'}
              </button>
            </div>
          ) : phase === 'stopped' ? (
            <button type="button" className="system-detect__stop-btn" onClick={handleResume}>
              开始扫描
            </button>
          ) : (
            <button type="button" className="system-detect__stop-btn" onClick={handleStop}>
              停止检测
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SystemDetectGuidePage
