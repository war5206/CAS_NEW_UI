import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './ConfirmPasswordPage.css'
import PasswordKeypad from '@/components/auth/PasswordKeypad'
import { useAuthStore, clearTempPassword } from '@/features/auth/store/authStore'

function ConfirmPasswordPage() {
  const navigate = useNavigate()
  const authStore = useAuthStore()
  const [error, setError] = useState('')
  const [errorKey, setErrorKey] = useState(0)

  const handleNext = (password) => {
    if (password === authStore.tempPassword) {
      navigate('/auth/login')
    } else {
      setErrorKey((k) => k + 1)
      setError('密码错误')
    }
  }

  const handlePrev = () => {
    clearTempPassword()
    navigate('/auth/set-password')
  }

  const bottomButtons = [
    {
      label: '上一步',
      onClick: handlePrev,
    },
    {
      label: '确认',
      className: 'is-primary',
      requiresPassword: true,
    },
  ]

  return (
    <div className="confirm-password-page">
      <div className="confirm-password-page__content">
        <PasswordKeypad
          title={error ? '密码错误' : '确认密码'}
          subtitle={error ? '' : '再次输入密码，请保持和前一次所输入的完全一致'}
          error={error}
          errorKey={errorKey}
          bottomButtons={bottomButtons}
          onComplete={handleNext}
          triggerCompleteOnFill={false}
        />
      </div>
    </div>
  )
}

export default ConfirmPasswordPage
