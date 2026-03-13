import { useEffect, useRef, useState } from 'react'
import addIcon from '../assets/icons/add.svg'
import defaultManualPdf from '../assets/docs/CAS系统能源站智享款控制柜安装使用说明书.pdf'
import './SystemManualPage.css'

function SystemManualPage() {
  const [manualInfo, setManualInfo] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!window.casManualApi?.get) {
      setErrorMessage('当前环境不支持本地说明书替换，请在桌面应用中使用。')
      return
    }

    window.casManualApi
      .get()
      .then((record) => {
        setManualInfo(record)
        setErrorMessage('')
      })
      .catch(() => {
        setErrorMessage('说明书读取失败，请稍后重试。')
      })
  }, [])

  const currentManualUrl = manualInfo?.fileUrl || defaultManualPdf
  const handleReplaceFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setIsUploading(true)
    try {
      const payload = {
        name: file.name,
        buffer: Array.from(new Uint8Array(await file.arrayBuffer())),
      }
      const result = await window.casManualApi?.replace(payload)
      if (!result?.ok) {
        throw new Error(result?.message || 'replace failed')
      }

      setManualInfo(result)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error?.message || '说明书替换失败，请稍后重试。')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <main className="system-manual-page">
      <header className="system-manual-page__header">
        <button
          type="button"
          className="system-manual-page__replace"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <img src={addIcon} alt="" aria-hidden="true" />
          <span>{isUploading ? '替换中...' : '更换说明书'}</span>
        </button>
      </header>

      {errorMessage ? <div className="system-manual-page__notice">{errorMessage}</div> : null}

      <section className="system-manual-page__viewer">
        <iframe title="系统说明书" src={currentManualUrl} className="system-manual-page__frame" />
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        hidden
        onChange={handleReplaceFile}
      />
    </main>
  )
}

export default SystemManualPage
