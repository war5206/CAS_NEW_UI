import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './LoginPage.css'
import PasswordKeypad from '@/components/auth/PasswordKeypad'
import { loginVerification, deviceUnlock, writeLockStatus } from '@/api/modules/home'
import {
  useAuthStore,
  incrementLoginFailCount,
  resetLoginFailCount,
  setUserRole,
  clearAllAuthState,
} from '@/features/auth/store/authStore'

const MAX_SCREEN_PROTECT_ATTEMPTS = 3

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const authStore = useAuthStore()
  const [error, setError] = useState('')
  const [errorKey, setErrorKey] = useState(0)

  const fromScreenProtect = location.state?.fromScreenProtect === true
  const initiallyLocked = location.state?.deviceLocked === true
  const [screenProtectFailCount, setScreenProtectFailCount] = useState(
    initiallyLocked ? MAX_SCREEN_PROTECT_ATTEMPTS : 0
  )
  const isDeviceLocked = (fromScreenProtect || initiallyLocked) && screenProtectFailCount >= MAX_SCREEN_PROTECT_ATTEMPTS

  const handleScreenProtectFail = () => {
    const newCount = screenProtectFailCount + 1
    setScreenProtectFailCount(newCount)
    if (newCount >= MAX_SCREEN_PROTECT_ATTEMPTS) {
      setError('')
      writeLockStatus('1').catch(() => {})
    } else {
      setError('密码错误，请重新输入')
    }
  }

  const handleLoginSuccess = async (password) => {
    try {
      const response = await loginVerification(password)

      if (response.data.result.state === 'success') {
        resetLoginFailCount()
        setUserRole(response.data.result.message)
        navigate(fromScreenProtect ? '/home' : '/guide/system-config')
      } else {
        incrementLoginFailCount()
        setErrorKey((k) => k + 1)
        if (fromScreenProtect) {
          handleScreenProtectFail()
        } else {
          setError('登录失败，请重新输入')
        }
      }
    } catch (err) {
      incrementLoginFailCount()
      setErrorKey((k) => k + 1)
      if (fromScreenProtect) {
        handleScreenProtectFail()
      } else {
        setError('登录失败，请重新输入')
      }
    }
  }

  const handleDeviceUnlock = async (password) => {
    try {
      const response = await deviceUnlock(password)
      const result = response.data?.data?.result
      if (result?.state === 'success' && result?.message === '超管') {
        resetLoginFailCount()
        navigate('/home')
      } else {
        setErrorKey((k) => k + 1)
        setError('密码错误，请联系超级管理员')
      }
    } catch (err) {
      setErrorKey((k) => k + 1)
      setError('密码错误，请联系超级管理员')
    }
  }

  const handleForgotPassword = () => {
    clearAllAuthState()
    navigate('/auth/set-password')
  }

  const handleBack = () => {
    navigate('/auth/set-password')
  }

  const extraBottomButtons = (fromScreenProtect || initiallyLocked)
    ? []
    : [
        { label: '忘记密码', onClick: handleForgotPassword },
        { label: '返回', onClick: handleBack },
      ]

  const subtitle = isDeviceLocked
    ? '当前系统已锁定，请输入超管密码解锁系统'
    : fromScreenProtect
      ? '密码为4位数字，输入3次错误后将进行锁定。'
      : '请输入刚才设置的四位密码'

  return (
    <div className="login-page">
      <div className="login-page__content">
        <PasswordKeypad
          title="登录"
          subtitle={subtitle}
          subtitleClassName={isDeviceLocked ? 'is-locked' : undefined}
          error={error}
          errorKey={errorKey}
          extraBottomButtons={extraBottomButtons}
          onComplete={isDeviceLocked ? handleDeviceUnlock : handleLoginSuccess}
          layoutMode="login"
        />
      </div>
    </div>
  )
}

export default LoginPage
