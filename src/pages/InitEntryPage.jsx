import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { queryInitState } from '@/api/modules/home'
import './InitEntryPage.css'

function resolveInitPath(body) {
  if (!body?.success || body.code !== 200 || body.data == null) {
    return null
  }
  const initState = String(body.data.initState ?? '')
  if (initState === '1') {
    return '/home'
  }
  if (initState === '0') {
    return '/auth/set-password'
  }
  return null
}

function InitEntryPage() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  const run = useCallback(async () => {
    setError(null)
    try {
      const res = await queryInitState()
      const body = res.data
      const path = resolveInitPath(body)
      if (path) {
        navigate(path, { replace: true })
        return
      }
      navigate('/auth/set-password', { replace: true })
    } catch (e) {
      console.error('queryInitState failed:', e)
      setError(e)
    }
  }, [navigate])

  useEffect(() => {
    run()
  }, [run])

  if (error) {
    return (
      <div className="init-entry-page">
        <p className="init-entry-page__message">无法连接服务，请检查网络后重试</p>
        <button type="button" className="init-entry-page__retry" onClick={run}>
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="init-entry-page" aria-busy="true">
      <div className="init-entry-page__spinner" aria-hidden />
      <p className="init-entry-page__hint">正在进入系统…</p>
    </div>
  )
}

export default InitEntryPage
