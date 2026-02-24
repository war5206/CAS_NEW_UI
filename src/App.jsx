import { useEffect, useMemo, useState } from 'react'
import './App.css'
import deleteIcon from './assets/icons/delete.svg'

function App() {
  const maxPinLength = 4
  const title = '\u9501\u5c4f\u5bc6\u7801\u8bbe\u7f6e'
  const subtitle =
    '\u5bc6\u7801\u4e3a4\u4f4d\u6570\u5b57\uff0c\u6b64\u5bc6\u7801\u4e3a\u672c\u8bbe\u5907\u5f85\u673a\u540e\u8fdb\u5165\u7cfb\u7edf\u7684\u51ed\u8bc1\uff0c\u5982\u4e0d\u9700\u8981\u8bbe\u7f6e\u9501\u5c4f\u5bc6\u7801\uff0c\u53ef\u4ee5\u8df3\u8fc7'
  const [pin, setPin] = useState('')
  const keypadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'delete'],
  ]
  const canConfirm = useMemo(() => pin.length === maxPinLength, [pin.length])

  const handleDigitInput = (digit) => {
    setPin((prev) => {
      if (prev.length >= maxPinLength) {
        return prev
      }
      return `${prev}${digit}`
    })
  }

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1))
  }

  const handleSkip = () => {
    setPin('')
  }

  const handleConfirm = () => {
    if (!canConfirm) {
      return
    }
    // TODO: wire this to the real submit flow.
    console.log('confirm pin:', pin)
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      const { key } = event

      if (/^\d$/.test(key)) {
        handleDigitInput(key)
        return
      }

      if (key === 'Backspace' || key === 'Delete') {
        handleDelete()
        return
      }

      if (key === 'Enter') {
        handleConfirm()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canConfirm, pin])

  return (
    <main className="lock-screen-page">
      <section className="lock-screen-card">
        <h1 className="title">{title}</h1>
        <p className="subtitle">{subtitle}</p>

        <div className="password-dots" aria-label="\u5bc6\u7801\u8f93\u5165\u72b6\u6001">
          {[0, 1, 2, 3].map((dotIndex) => (
            <span key={dotIndex} className={`dot${dotIndex < pin.length ? ' dot-filled' : ''}`} />
          ))}
        </div>

        <div className="keypad" aria-label="\u6570\u5b57\u952e\u76d8">
          {keypadRows.map((row, rowIndex) => (
            <div className="key-row" key={`row-${rowIndex}`}>
              {row.map((key) => {
                if (key === 'delete') {
                  return (
                    <button
                      type="button"
                      className="key"
                      key={key}
                      aria-label="\u5220\u9664"
                      onClick={handleDelete}
                      disabled={pin.length === 0}
                    >
                      <img src={deleteIcon} className="delete-icon" alt="" aria-hidden="true" />
                    </button>
                  )
                }

                return (
                  <button
                    type="button"
                    className={`key${key === '.' ? ' key-placeholder' : ''}`}
                    key={key}
                    aria-label={key === '.' ? '\u5360\u4f4d\u952e' : `\u6570\u5b57 ${key}`}
                    onClick={key === '.' ? undefined : () => handleDigitInput(key)}
                    disabled={key === '.'}
                  >
                    {key}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="action-row">
          <button type="button" className="action-btn action-skip" onClick={handleSkip}>
            {'\u8df3\u8fc7'}
          </button>
          <button
            type="button"
            className={`action-btn action-confirm${canConfirm ? ' action-confirm-enabled' : ''}`}
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {'\u786e\u8ba4'}
          </button>
        </div>
      </section>
    </main>
  )
}

export default App
