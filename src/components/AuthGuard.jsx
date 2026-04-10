import { Navigate } from 'react-router-dom'
import { getStoredToken } from '@/api/client/auth'

function AuthGuard({ children }) {
  if (!getStoredToken()) {
    return <Navigate to="/" replace />
  }

  return children
}

export default AuthGuard
