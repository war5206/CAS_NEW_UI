import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { queryInitState } from '@/api/modules/home'
import { acquireSystemToken } from '@/api/modules/auth'
import { getStoredToken, setStoredToken } from '@/api/client/auth'
import { markAuthGuardLockCheckComplete } from '@/components/AuthGuard'
import { useHomeRouteCacheControls } from '@/context/HomeRouteCacheContext'
import './InitEntryPage.css'

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
  const [error, setError] = useState(null)
  const [initBody, setInitBody] = useState(null)
  const [fetchVersion, setFetchVersion] = useState(0)
  const [aligned, setAligned] = useState(false)

  const initFetchedRef = useRef(0)

  useEffect(() => {
    if (initFetchedRef.current > fetchVersion) {
      return
    }
    initFetchedRef.current = fetchVersion + 1

    async function fetchInit() {
      setError(null)
      setInitBody(null)
      setAligned(false)
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
        setInitBody(res.data)
      } catch (e) {
        console.error('System initialization failed:', e)
        setError(e)
      }
    }

    fetchInit()
  }, [fetchVersion])

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

  const ready = error == null && initBody != null && aligned

  useEffect(() => {
    setHomeCacheAllowed(ready)
  }, [ready, setHomeCacheAllowed])

  if (error) {
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
      <div className="init-entry-page" aria-busy="true">
        <div className="init-entry-page__spinner" aria-hidden />
        <p className="init-entry-page__hint">正在进入系统…</p>
      </div>
    )
  }

  markAuthGuardLockCheckComplete()
  return <Outlet />
}

export default InitEntryLayout
