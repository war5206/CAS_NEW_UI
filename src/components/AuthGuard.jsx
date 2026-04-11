import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getStoredToken } from '@/api/client/auth'
import { queryInitState } from '@/api/modules/home'

let lockCheckDone = false

export function resetLockCheck() {
  lockCheckDone = false
}

/** Call when init flow has already validated lock state (e.g. InitEntryLayout ready) so the first protected route does not render null. */
export function markAuthGuardLockCheckComplete() {
  lockCheckDone = true
}

function AuthGuard({ children, skipInitLockCheck = false }) {
  const navigate = useNavigate()
  const hasToken = Boolean(getStoredToken())
  const [checking, setChecking] = useState(
    () => !skipInitLockCheck && !lockCheckDone && Boolean(getStoredToken()),
  )

  useEffect(() => {
    if (skipInitLockCheck || lockCheckDone || !hasToken) return

    let cancelled = false

    queryInitState()
      .then((res) => {
        if (cancelled) return
        const lockStatus = String(res.data?.data?.lockStatus ?? '')
        if (lockStatus === '1') {
          navigate('/auth/login', { replace: true, state: { deviceLocked: true } })
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          lockCheckDone = true
          setChecking(false)
        }
      })

    return () => { cancelled = true }
  }, [navigate, hasToken, skipInitLockCheck])

  if (!hasToken) {
    return <Navigate to="/" replace />
  }

  if (checking) {
    return null
  }

  return children
}

export default AuthGuard
