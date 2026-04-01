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

  const handleLoginSuccess = async (password) => {
    try {
      const response = await loginVerification(password)

      if (response.data.result.state === 'success') {
        resetLoginFailCount()
        setUserRole(response.data.result.message)
        navigate('/auth/system-select')
      } else {
        incrementLoginFailCount()
        setError('登录失败，请重新输入')
      }
    } catch (err) {
      incrementLoginFailCount()
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
          subtitle="密码为4位数字，输入3次错误后将进行锁定"
          error={error}
          extraBottomButtons={extraBottomButtons}
          onComplete={handleLoginSuccess}
          layoutMode="login"
        />
      </div>
    </div>
  )
}

export default LoginPage
