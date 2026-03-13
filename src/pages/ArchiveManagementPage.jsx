import { useEffect, useMemo, useRef, useState } from 'react'
import addIcon from '../assets/icons/add.svg'
import closeIcon from '../assets/icons/close.svg'
import './ArchiveManagementPage.css'

function formatUploadTime(timestamp) {
  if (!timestamp) {
    return '--'
  }

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return '--'
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) {
    return '0B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  const unitIndex = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  const value = size / 1024 ** unitIndex
  const fixedValue = value >= 100 ? value.toFixed(0) : value >= 10 ? value.toFixed(1) : value.toFixed(2)
  return `${fixedValue.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')}${units[unitIndex]}`
}

function getArchiveCategory(file) {
  const type = String(file?.type ?? '').toLowerCase()
  const name = String(file?.name ?? '').toLowerCase()
  const extension = name.split('.').pop() ?? ''

  const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg']
  if (type.startsWith('image/') || imageExtensions.includes(extension)) {
    return { category: 'image', typeLabel: '图片' }
  }

  return { category: 'document', typeLabel: '文档' }
}

function ArchiveTypeIcon({ category }) {
  if (category === 'image') {
    return (
      <svg viewBox="0 0 24 24" className="archive-page__file-icon" aria-hidden="true">
        <path d="M5 4.5h14v15H5z" />
        <path d="M8 15.5l2.8-3 2.3 2.3 1.7-1.8 2.2 2.5" />
        <circle cx="9.5" cy="9.5" r="1.5" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="archive-page__file-icon" aria-hidden="true">
      <path d="M7 3.5h7l4 4v13H7z" />
      <path d="M14 3.5v4h4" />
      <path d="M9.5 12.5h5M9.5 16h5" />
    </svg>
  )
}

function UploadModal({ isOpen, pendingFiles, uploadTarget, onPickFiles, onRemoveFile, onConfirm, onClose }) {
  if (!isOpen) {
    return null
  }

  const modalTitle = uploadTarget === 'image' ? '上传图片' : '上传文档'
  const modalDescription = uploadTarget === 'image' ? '支持上传图片文件' : '支持上传 PDF、Word、Excel 等文档'

  return (
    <div className="archive-page__modal-backdrop" onClick={onClose}>
      <div className="archive-page__modal" onClick={(event) => event.stopPropagation()}>
        <header className="archive-page__modal-header">
          <div>
            <h3>{modalTitle}</h3>
            <p>{modalDescription}</p>
          </div>
          <button type="button" className="archive-page__modal-close" aria-label="关闭" onClick={onClose}>
            <img src={closeIcon} alt="" aria-hidden="true" />
          </button>
        </header>

        <button type="button" className="archive-page__picker" onClick={onPickFiles}>
          <img src={addIcon} alt="" aria-hidden="true" />
          <span>选择文件</span>
        </button>

        <div className="archive-page__modal-list">
          {pendingFiles.length === 0 ? (
            <div className="archive-page__modal-empty">请选择要上传的{uploadTarget === 'image' ? '图片' : '文档'}</div>
          ) : (
            pendingFiles.map((file) => (
              <div key={file.id} className="archive-page__modal-row">
                <div className="archive-page__modal-file">
                  <ArchiveTypeIcon category={file.category} />
                  <div>
                    <strong>{file.name}</strong>
                    <span>{file.sizeLabel}</span>
                  </div>
                </div>
                <em>{file.typeLabel}</em>
                <button type="button" onClick={() => onRemoveFile(file.id)}>
                  删除
                </button>
              </div>
            ))
          )}
        </div>

        <footer className="archive-page__modal-footer">
          <button type="button" className="archive-page__modal-action is-ghost" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="archive-page__modal-action"
            onClick={onConfirm}
            disabled={pendingFiles.length === 0}
          >
            确认上传
          </button>
        </footer>
      </div>
    </div>
  )
}

function ArchiveManagementPage() {
  const [archives, setArchives] = useState([])
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [pendingFiles, setPendingFiles] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [uploadTarget, setUploadTarget] = useState('document')
  const imageInputRef = useRef(null)
  const documentInputRef = useRef(null)

  const archiveCountText = useMemo(() => `当前共 ${archives.length} 份档案`, [archives.length])

  useEffect(() => {
    if (!window.casArchiveApi?.list) {
      setErrorMessage('当前环境不支持本地档案存储，请在桌面应用中使用。')
      return
    }

    window.casArchiveApi
      .list()
      .then((records) => {
        setArchives(Array.isArray(records) ? records : [])
        setErrorMessage('')
      })
      .catch(() => {
        setErrorMessage('档案读取失败，请稍后重试。')
      })
  }, [])

  const handleOpenPicker = () => {
    if (uploadTarget === 'image') {
      imageInputRef.current?.click()
      return
    }

    documentInputRef.current?.click()
  }

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) {
      return
    }

    const nextFiles = files.map((file) => {
      const { category, typeLabel } = getArchiveCategory(file)
      return {
        id: `pending-${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        sizeLabel: formatFileSize(file.size),
        typeLabel,
        category,
        rawFile: file,
      }
    })

    setPendingFiles((previous) => [...previous, ...nextFiles])
    event.target.value = ''
  }

  const handleStartUpload = (target) => {
    setUploadTarget(target)
    setPendingFiles([])
    setIsUploadOpen(true)
  }

  const handleConfirmUpload = () => {
    if (!pendingFiles.length) {
      return
    }

    Promise.all(
      pendingFiles.map(async (file) => ({
        name: file.name,
        buffer: Array.from(new Uint8Array(await file.rawFile.arrayBuffer())),
      })),
    )
      .then((payload) => window.casArchiveApi?.save(payload))
      .then((savedRecords) => {
        if (!Array.isArray(savedRecords)) {
          throw new Error('save failed')
        }

        setArchives((previous) => [...savedRecords, ...previous])
        setPendingFiles([])
        setIsUploadOpen(false)
        setErrorMessage('')
      })
      .catch(() => {
        setErrorMessage('档案上传失败，请稍后重试。')
      })
  }

  const handleOpenArchive = (item) => {
    if (!item.filePath || !window.casArchiveApi?.open) {
      return
    }

    window.casArchiveApi.open(item.filePath).then((result) => {
      if (!result?.ok) {
        setErrorMessage(result?.message || '文件打开失败。')
      }
    })
  }

  const handleDeleteArchive = (archiveId) => {
    if (!window.casArchiveApi?.delete) {
      return
    }

    window.casArchiveApi.delete(archiveId).then((result) => {
      if (!result?.ok) {
        setErrorMessage(result?.message || '档案删除失败，请稍后重试。')
        return
      }

      setArchives((previous) => previous.filter((item) => item.id !== archiveId))
      setErrorMessage('')
    })
  }

  return (
    <>
      <main className="archive-page">
        <header className="archive-page__header">
          <div>
            <h2>档案管理</h2>
            <p>{archiveCountText}</p>
          </div>
          <div className="archive-page__actions">
            <button type="button" className="archive-page__upload-button is-secondary" onClick={() => handleStartUpload('image')}>
              <img src={addIcon} alt="" aria-hidden="true" />
              <span>上传图片</span>
            </button>
            <button type="button" className="archive-page__upload-button" onClick={() => handleStartUpload('document')}>
              <img src={addIcon} alt="" aria-hidden="true" />
              <span>上传文档</span>
            </button>
          </div>
        </header>

        {errorMessage ? <div className="archive-page__notice">{errorMessage}</div> : null}

        <section className="archive-page__panel">
          {archives.length === 0 ? (
            <div className="archive-page__empty">暂无档案，请先上传图片或文档</div>
          ) : (
            <div className="archive-page__list">
              {archives.map((item) => (
                <article key={item.id} className="archive-page__row">
                  <button
                    type="button"
                    className="archive-page__row-main"
                    onClick={() => handleOpenArchive(item)}
                    title={`点击查看 ${item.name}`}
                  >
                    <div className="archive-page__name">
                      <ArchiveTypeIcon category={item.category} />
                      <span>{item.name}</span>
                    </div>
                    <div className="archive-page__time">{formatUploadTime(item.createdAt)}</div>
                    <div className="archive-page__size">{item.sizeLabel}</div>
                    <div className="archive-page__type">{item.typeLabel}</div>
                  </button>
                  <button
                    type="button"
                    className="archive-page__delete"
                    onClick={() => handleDeleteArchive(item.id)}
                  >
                    删除
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <input
        ref={imageInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.gif,.bmp,.webp,.svg"
        multiple
        hidden
        onChange={handleFileChange}
      />

      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
        multiple
        hidden
        onChange={handleFileChange}
      />

      <UploadModal
        isOpen={isUploadOpen}
        pendingFiles={pendingFiles}
        uploadTarget={uploadTarget}
        onPickFiles={handleOpenPicker}
        onRemoveFile={(fileId) => setPendingFiles((previous) => previous.filter((item) => item.id !== fileId))}
        onConfirm={handleConfirmUpload}
        onClose={() => {
          setPendingFiles([])
          setIsUploadOpen(false)
        }}
      />
    </>
  )
}

export default ArchiveManagementPage
