import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoginPage.css'
import PasswordKeypad from '@/components/auth/PasswordKeypad'
import { loginVerification } from '@/api/modules/home'
import {
  useAuthStore,
  incrementLoginFailCount,
  resetLoginFailCount,
  setUserRole,
  clearAllAuthState,
} from '@/features/auth/store/authStore'

function LoginPage() {
  const navigate = useNavigate()
  const authStore = useAuthStore()
  const [error, setError] = useState('')
  const [errorKey, setErrorKey] = useState(0)

  const handleLoginSuccess = async (password) => {
    try {
      const response = await loginVerification(password)

      if (response.data.result.state === 'success') {
        resetLoginFailCount()
        setUserRole(response.data.result.message)
        navigate('/guide/system-config')
      } else {
        incrementLoginFailCount()
        setErrorKey((k) => k + 1)
        setError('登录失败，请重新输入')
      }
    } catch (err) {
      incrementLoginFailCount()
      setErrorKey((k) => k + 1)
      setError('登录失败，请重新输入')
    }
  }

  const handleForgotPassword = () => {
    clearAllAuthState()
    navigate('/auth/set-password')
  }

  const handleBack = () => {
    navigate('/auth/set-password')
  }

  const extraBottomButtons = [
    {
      label: '忘记密码',
      onClick: handleForgotPassword,
    },
    {
      label: '返回',
      onClick: handleBack,
    },
  ]

  return (
    <div className="login-page">
      <div className="login-page__content">
        <PasswordKeypad
          title="登录"
          subtitle="请输入刚才设置的四位密码"
          error={error}
          errorKey={errorKey}
          extraBottomButtons={extraBottomButtons}
          onComplete={handleLoginSuccess}
          layoutMode="login"
        />
      </div>
    </div>
  )
}

export default LoginPage
