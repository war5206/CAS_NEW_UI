import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './SetOperationPasswordPage.css'
import PasswordKeypad from '@/components/auth/PasswordKeypad'
import { setOperationPassword } from '@/api/modules/home'
import { setTempPassword, clearTempPassword } from '@/features/auth/store/authStore'

function SetOperationPasswordPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const handleConfirm = async (password) => {
    try {
      const response = await setOperationPassword(password, '1234')
      if (response.data.state === 'success') {
        setTempPassword(password)
        navigate('/auth/confirm-password')
      }
    } catch (error) {
      console.error('Failed to set password:', error)
      setError('设置密码失败，请重试')
    }
  }

  const handleSkip = async () => {
    try {
      const response = await setOperationPassword('1357', '1234')
      if (response.data.state === 'success') {
        clearTempPassword()
        navigate('/auth/login')
      }
    } catch (error) {
      console.error('Failed to set password:', error)
    }
  }

  const bottomButtons = [
    {
      label: '跳过',
      onClick: handleSkip,
    },
    {
      label: '确认',
      className: 'is-primary',
      requiresPassword: true,
    },
  ]

  return (
    <div className="set-operation-password-page">
      <div className="set-operation-password-page__content">
        <PasswordKeypad
          title="锁屏密码设置"
          subtitle="密码为4位数字，此密码为本设备待机后进入系统的凭证，如不需要设置锁屏密码，可以跳过"
          error={error}
          bottomButtons={bottomButtons}
          onComplete={handleConfirm}
        />
      </div>
    </div>
  )
}

export default SetOperationPasswordPage
