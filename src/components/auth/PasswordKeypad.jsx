import { useEffect, useState } from 'react'
import './PasswordKeypad.css'
import deleteIcon from '@/assets/common/delete.svg'

const KEYPAD_KEYS = [
  { key: '1', position: '1' },
  { key: '2', position: '2' },
  { key: '3', position: '3' },
  { key: '4', position: '4' },
  { key: '5', position: '5' },
  { key: '6', position: '6' },
  { key: '7', position: '7' },
  { key: '8', position: '8' },
  { key: '9', position: '9' },
  { position: 'empty', decorativeDot: true },
  { key: '0', position: '0' },
  { key: 'delete', position: 'delete' },
]

function PasswordKeypad({
  title,
  subtitle,
  subtitleClassName,
  passwordLength = 4,
  bottomButtons = [],
  extraBottomButtons = [],
  onComplete,
  error,
  layoutMode = 'default', // 'default' | 'login'
  triggerCompleteOnFill = true,
  errorKey = 0,
}) {
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (errorKey > 0) {
      setPassword('')
    }
  }, [errorKey])

  const handleKeyPress = (key) => {
    if (key === 'delete') {
      setPassword((prev) => prev.slice(0, -1))
      return
    }

    if (key === '') {
      return
    }

    if (password.length < passwordLength) {
      const newPassword = password + key
      setPassword(newPassword)

      if (triggerCompleteOnFill && newPassword.length === passwordLength && onComplete) {
        onComplete(newPassword)
      }
    }
  }

  const handleButtonClick = (button) => {
    if (button.requiresPassword && password.length < passwordLength) {
      return
    }
    if (button.onClick) {
      button.onClick(password)
    } else if (button.requiresPassword && onComplete) {
      onComplete(password)
    }
  }

  const getButtonPositionClass = (label) => {
    if (label === '跳过') return 'password-keypad__button--skip'
    if (label === '确认') return 'password-keypad__button--confirm'
    if (label === '上一步') return 'password-keypad__button--prev'
    if (label === '下一步') return 'password-keypad__button--next'
    return ''
  }

  const getExtraButtonPositionClass = (label) => {
    if (label === '忘记密码') return 'password-keypad__extra-button--forgot'
    if (label === '返回') return 'password-keypad__extra-button--back'
    return ''
  }

  return (
    <div className={`password-keypad password-keypad--${layoutMode}`}>
      <div className="password-keypad__header">
        <h2 className={`password-keypad__title${error ? ' is-error' : ''}`}>
          {error || title}
        </h2>
        {subtitle ? (
          <p className={`password-keypad__subtitle${subtitleClassName ? ` ${subtitleClassName}` : ''}`}>{subtitle}</p>
        ) : null}
      </div>

      <div className="password-keypad__dots">
        {Array.from({ length: passwordLength }).map((_, index) => (
          <div
            key={index}
            className={`password-keypad__dot${index < password.length ? ' is-filled' : ''}`}
          />
        ))}
      </div>

      <div className="password-keypad__grid">
        {KEYPAD_KEYS.map((item) => {
          const { key, position, decorativeDot } = item
          if (decorativeDot) {
            return (
              <div
                key={position}
                className={`password-keypad__key password-keypad__key--${position} password-keypad__key--decorative-dot`}
                aria-hidden="true"
              >
                .
              </div>
            )
          }

          const isDelete = key === 'delete'

          return (
            <button
              key={position}
              type="button"
              className={`password-keypad__key password-keypad__key--${position}${isDelete ? ' is-delete' : ''}`}
              onClick={() => handleKeyPress(key)}
            >
              {isDelete ? (
                <img src={deleteIcon} alt="删除" className="password-keypad__key-icon" />
              ) : (
                key
              )}
            </button>
          )
        })}
      </div>

      {bottomButtons.length > 0 || extraBottomButtons.length > 0 ? (
        <div className="password-keypad__bottom-buttons">
          {extraBottomButtons.length > 0 ? (
            <div className="password-keypad__extra-buttons">
              {extraBottomButtons.map((button, index) => (
                <button
                  key={`extra-${index}`}
                  type="button"
                  className={`password-keypad__extra-button ${getExtraButtonPositionClass(button.label)} ${button.className || ''}`}
                  onClick={() => button.onClick?.(password)}
                >
                  {button.label}
                </button>
              ))}
            </div>
          ) : null}
          {bottomButtons.length > 0 ? (
            <div className="password-keypad__buttons">
              {bottomButtons.map((button, index) => (
                <button
                  key={index}
                  type="button"
                  className={`password-keypad__button ${getButtonPositionClass(button.label)} ${button.className || ''}${
                    button.requiresPassword && password.length < passwordLength ? ' is-disabled' : ''
                  }`}
                  onClick={() => handleButtonClick(button)}
                  disabled={button.requiresPassword && password.length < passwordLength}
                >
                  {button.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default PasswordKeypad
