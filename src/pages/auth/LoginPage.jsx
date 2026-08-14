import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './LoginPage.css'
import PasswordKeypad from '@/components/auth/PasswordKeypad'
import { loginVerification, deviceUnlock, writeLockStatus, setInitState } from '@/api/modules/home'
import {
  incrementLoginFailCount,
  resetLoginFailCount,
  setUserRole,
  clearAllAuthState,
} from '@/features/auth/store/authStore'

const MAX_SCREEN_PROTECT_ATTEMPTS = 3
const LOGIN_INTENT_KEY = 'cas.loginIntent'
const DEVICE_LOCKED_KEY = 'cas.deviceLocked'
const FACTORY_RESET_KEY = 'cas.factoryReset'

function readPersistedLoginIntent() {
  if (typeof window === 'undefined') {
    return null
  }
  return window.sessionStorage.getItem(LOGIN_INTENT_KEY) || null
}

function clearPersistedLoginIntent() {
  if (typeof window === 'undefined') {
    return
  }
  window.sessionStorage.removeItem(LOGIN_INTENT_KEY)
}

function readPersistedDeviceLocked() {
  if (typeof window === 'undefined') {
    return false
  }
  return window.localStorage.getItem(DEVICE_LOCKED_KEY) === '1'
}

function clearPersistedDeviceLocked() {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(DEVICE_LOCKED_KEY)
}

function clearPersistedFactoryReset() {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(FACTORY_RESET_KEY)
}

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const [errorKey, setErrorKey] = useState(0)

  const persistedIntent = useMemo(() => readPersistedLoginIntent(), [])
  const fromScreenProtect = location.state?.fromScreenProtect === true || persistedIntent === 'screen-protect'
  const fromLayoutAvatar = location.state?.fromLayoutAvatar === true || persistedIntent === 'layout-avatar'
  const initiallyLocked = location.state?.deviceLocked === true || readPersistedDeviceLocked()
  const [screenProtectFailCount, setScreenProtectFailCount] = useState(
    initiallyLocked ? MAX_SCREEN_PROTECT_ATTEMPTS : 0
  )
  const isDeviceLocked = (fromScreenProtect || initiallyLocked) && screenProtectFailCount >= MAX_SCREEN_PROTECT_ATTEMPTS

  useEffect(() => {
    if (fromScreenProtect || fromLayoutAvatar) {
      clearPersistedLoginIntent()
    }
  }, [fromScreenProtect, fromLayoutAvatar])

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
        clearPersistedLoginIntent()
        clearPersistedDeviceLocked()
        clearPersistedFactoryReset()
        if (fromScreenProtect || fromLayoutAvatar) {
          navigate('/home')
        } else {
          try {
            await setInitState()
          } catch {
            // initState 写入失败由 InitEntry 兜底，仍尝试进入引导流程
          }
          navigate('/guide/system-config')
        }
      } else {
        incrementLoginFailCount()
        setErrorKey((k) => k + 1)
        if (fromScreenProtect) {
          handleScreenProtectFail()
        } else {
          setError('登录失败，请重新输入')
        }
      }
    } catch {
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
        clearPersistedLoginIntent()
        clearPersistedDeviceLocked()
        navigate('/home', { state: { deviceUnlockSucceeded: true } })
      } else {
        setErrorKey((k) => k + 1)
        setError('密码错误，请联系超级管理员')
      }
    } catch {
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

  const extraBottomButtons = fromScreenProtect || fromLayoutAvatar || initiallyLocked
    ? []
    : [
        { label: '忘记密码', onClick: handleForgotPassword },
        { label: '返回', onClick: handleBack },
      ]

  const subtitle = isDeviceLocked
    ? '当前系统已锁定，请输入超管密码解锁系统'
    : fromScreenProtect
      ? '密码为4位数字，输入3次错误后将进行锁定。'
      : fromLayoutAvatar
        ? '请输入密码以更新权限并进入首页'
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
