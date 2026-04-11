import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { queryInitState } from '@/api/modules/home'
import { acquireSystemToken } from '@/api/modules/auth'
import { getStoredToken, setStoredToken } from '@/api/client/auth'
import './InitEntryPage.css'

function normalizePathname(pathname) {
  if (pathname === '/') {
    return '/'
  }
  const trimmed = pathname.replace(/\/$/, '')
  return trimmed || '/'
}

export function resolveInitRoute(body, requestedPathname = '/') {
  if (!body?.success || body.code !== 200 || body.data == null) {
    return null
  }

  const lockStatus = String(body.data.lockStatus ?? '')
  if (lockStatus === '1') {
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

function getTargetFromInitBody(initBody, pathname) {
  const route = resolveInitRoute(initBody, pathname)
  return {
    path: route?.path ?? '/auth/set-password',
    state: route?.state,
  }
}

function InitEntryLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState(null)
  const [initBody, setInitBody] = useState(null)
  const [fetchVersion, setFetchVersion] = useState(0)
  const [aligned, setAligned] = useState(false)

  useEffect(() => {
    let cancelled = false

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
        if (!cancelled) {
          setInitBody(res.data)
        }
      } catch (e) {
        console.error('System initialization failed:', e)
        if (!cancelled) {
          setError(e)
        }
      }
    }

    fetchInit()
    return () => {
      cancelled = true
    }
  }, [fetchVersion])

  useEffect(() => {
    if (error != null || initBody == null) {
      return
    }
    if (aligned) {
      return
    }

    const { path: targetPath, state: navState } = getTargetFromInitBody(initBody, location.pathname)
    const here = normalizePathname(location.pathname)
    const target = normalizePathname(targetPath)

    if (here === target) {
      setAligned(true)
      return
    }
    navigate(targetPath, { replace: true, state: navState })
  }, [error, initBody, navigate, location.pathname, aligned])

  const retry = useCallback(() => {
    setFetchVersion((v) => v + 1)
  }, [])

  const ready = error == null && initBody != null && aligned

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

  return <Outlet />
}

export default InitEntryLayout
