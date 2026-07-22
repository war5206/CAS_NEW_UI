import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { isInitGateSkipped } from '@/api/client/config'
import { queryInitState } from '@/api/modules/home'
import { acquireSystemToken } from '@/api/modules/auth'
import { getStoredToken, setStoredToken } from '@/api/client/auth'
import { markAuthGuardLockCheckComplete } from '@/components/AuthGuard'
import { useHomeRouteCacheControls } from '@/context/HomeRouteCacheContext'
import welcomeImg from '@/assets/home/welcome.png'
import './InitEntryPage.css'

/** 首次请求 + 失败后重试 12 次 = 共 13 次 */
const MAX_INIT_ATTEMPTS = 1 + 12
const INIT_RETRY_INTERVAL_MS = 30 * 1000
/** 欢迎图最短展示时长 */
const MIN_WELCOME_DISPLAY_MS = 2500

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function normalizePathname(pathname) {
  if (pathname === '/') {
    return '/'
  }
  const trimmed = pathname.replace(/\/$/, '')
  return trimmed || '/'
}

/**
 * @param {{ ignoreStaleLock?: boolean }} [options] - 超管解锁成功后 navigate 带上 deviceUnlockSucceeded 时，若后端尚未刷新 lockStatus，仍按 initState 路由而不退回登录页
 */
export function resolveInitRoute(body, requestedPathname = '/', options = {}) {
  if (!body?.success || body.code !== 200 || body.data == null) {
    return null
  }

  const lockStatus = String(body.data.lockStatus ?? '')
  if (lockStatus === '1' && !options.ignoreStaleLock) {
    return {
      path: '/auth/login',
      state: { deviceLocked: true },
    }
  }

  const initState = String(body.data.initState ?? '')
  if (initState === '1') {
    const p = normalizePathname(requestedPathname ?? '/')
    if (p === '/') {
      return { path: '/home' }
    }
    return { path: p }
  }
  if (initState === '0') {
    return { path: '/auth/set-password' }
  }
  return null
}

function getTargetFromInitBody(initBody, pathname, options = {}) {
  const route = resolveInitRoute(initBody, pathname, options)
  return {
    path: route?.path ?? '/auth/set-password',
    state: route?.state,
  }
}

function InitEntryLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setHomeCacheAllowed } = useHomeRouteCacheControls()
  const skipInitGate = isInitGateSkipped()
  const [error, setError] = useState(null)
  const [initBody, setInitBody] = useState(null)
  const [fetchVersion, setFetchVersion] = useState(0)
  const [aligned, setAligned] = useState(false)
  const [welcomeMinPassed, setWelcomeMinPassed] = useState(false)

  const initFetchedRef = useRef(0)

  // 欢迎图至少展示 2.5s 后才允许进入系统
  useEffect(() => {
    const timer = setTimeout(() => setWelcomeMinPassed(true), MIN_WELCOME_DISPLAY_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!skipInitGate) {
      return
    }

    const here = normalizePathname(location.pathname)
    const targetPath = here === '/' ? '/home' : location.pathname
    const target = normalizePathname(targetPath)

    if (here !== target) {
      setAligned(false)
      navigate(targetPath, { replace: true })
      return
    }
    setAligned(true)
  }, [skipInitGate, location.pathname, navigate])

  useEffect(() => {
    if (skipInitGate) {
      return
    }
    if (initFetchedRef.current > fetchVersion) {
      return
    }
    initFetchedRef.current = fetchVersion + 1

    let cancelled = false

    async function fetchInit() {
      setError(null)
      setInitBody(null)
      setAligned(false)

      for (let attempt = 1; attempt <= MAX_INIT_ATTEMPTS; attempt += 1) {
        try {
          if (!getStoredToken()) {
            const tokenRes = await acquireSystemToken()
            if (tokenRes.data?.code === '200' && tokenRes.data?.token) {
              setStoredToken(tokenRes.data.token)
            } else {
              throw new Error('获取系统令牌失败')
            }
          }

          const res = await queryInitState()
          if (!cancelled) {
            setInitBody(res.data)
          }
          return
        } catch (e) {
          console.error(`System initialization attempt ${attempt} failed:`, e)
          if (attempt >= MAX_INIT_ATTEMPTS) {
            if (!cancelled) {
              setError(e)
            }
            return
          }
          await sleep(INIT_RETRY_INTERVAL_MS)
          if (cancelled) {
            return
          }
        }
      }
    }

    fetchInit()
    return () => {
      cancelled = true
    }
  }, [fetchVersion, skipInitGate])

  useEffect(() => {
    if (error != null || initBody == null) {
      return
    }
    if (aligned) {
      return
    }

    const ignoreStaleLock = location.state?.deviceUnlockSucceeded === true
    const { path: targetPath, state: navState } = getTargetFromInitBody(initBody, location.pathname, {
      ignoreStaleLock,
    })
    const here = normalizePathname(location.pathname)
    const target = normalizePathname(targetPath)

    if (here === target) {
      setAligned(true)
      return
    }
    navigate(targetPath, { replace: true, state: navState })
  }, [error, initBody, navigate, location.pathname, aligned, location.state])

  const retry = useCallback(() => {
    setFetchVersion((v) => v + 1)
  }, [])

  const ready = welcomeMinPassed && (skipInitGate ? aligned : error == null && initBody != null && aligned)

  useEffect(() => {
    setHomeCacheAllowed(ready)
  }, [ready, setHomeCacheAllowed])

  if (!skipInitGate && error) {
    return (
      <div className="init-entry-page">
        <p className="init-entry-page__message">无法连接服务，请检查网络后重试</p>
        <button type="button" className="init-entry-page__retry" onClick={retry}>
          重试
        </button>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="init-entry-page init-entry-page--welcome" aria-busy="true">
        <img className="init-entry-page__welcome" src={welcomeImg} alt="欢迎进入系统" />
        <div className="init-entry-page__spinner" aria-hidden />
      </div>
    )
  }

  markAuthGuardLockCheckComplete()
  return <Outlet />
}

export default InitEntryLayout
