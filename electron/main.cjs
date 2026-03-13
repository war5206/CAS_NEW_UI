const { app, BrowserWindow, ipcMain, shell } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')
const crypto = require('node:crypto')
const { pathToFileURL } = require('node:url')

const isDev = !app.isPackaged
const ARCHIVE_DIR_NAME = 'archives'
const ARCHIVE_META_FILE = 'archives.json'
const MANUAL_DIR_NAME = 'manuals'
const MANUAL_META_FILE = 'system-manual.json'

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

function getArchiveCategory(fileName) {
  const extension = String(fileName ?? '')
    .toLowerCase()
    .split('.')
    .pop()

  const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg']
  if (imageExtensions.includes(extension)) {
    return { category: 'image', typeLabel: '图片' }
  }

  return { category: 'document', typeLabel: '文档' }
}

function sanitizeFileName(fileName) {
  return String(fileName ?? '未命名文件').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
}

function getArchivePaths() {
  const baseDir = path.join(app.getPath('userData'), ARCHIVE_DIR_NAME)
  return {
    baseDir,
    metaFile: path.join(baseDir, ARCHIVE_META_FILE),
  }
}

function getManualPaths() {
  const baseDir = path.join(app.getPath('userData'), MANUAL_DIR_NAME)
  return {
    baseDir,
    metaFile: path.join(baseDir, MANUAL_META_FILE),
  }
}

async function ensureArchiveStore() {
  const { baseDir, metaFile } = getArchivePaths()
  await fs.mkdir(baseDir, { recursive: true })
  try {
    await fs.access(metaFile)
  } catch {
    await fs.writeFile(metaFile, '[]', 'utf8')
  }
}

async function ensureManualStore() {
  const { baseDir, metaFile } = getManualPaths()
  await fs.mkdir(baseDir, { recursive: true })
  try {
    await fs.access(metaFile)
  } catch {
    await fs.writeFile(metaFile, '{}', 'utf8')
  }
}

async function readArchiveMeta() {
  const { metaFile } = getArchivePaths()
  await ensureArchiveStore()
  try {
    const content = await fs.readFile(metaFile, 'utf8')
    const parsed = JSON.parse(content)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeArchiveMeta(records) {
  const { metaFile } = getArchivePaths()
  await ensureArchiveStore()
  await fs.writeFile(metaFile, JSON.stringify(records, null, 2), 'utf8')
}

async function readManualMeta() {
  const { metaFile } = getManualPaths()
  await ensureManualStore()
  try {
    const content = await fs.readFile(metaFile, 'utf8')
    const parsed = JSON.parse(content)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

async function writeManualMeta(record) {
  const { metaFile } = getManualPaths()
  await ensureManualStore()
  await fs.writeFile(metaFile, JSON.stringify(record, null, 2), 'utf8')
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    show: false,
    backgroundColor: '#0e0e14',
    autoHideMenuBar: true,
    fullscreen: true,
    width: 1920,
    height: 1080,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.setFullScreen(true)
    mainWindow.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    return
  }

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

ipcMain.handle('archives:list', async () => {
  const records = await readArchiveMeta()
  return records.filter((item) => Boolean(item?.filePath))
})

ipcMain.handle('archives:save', async (_event, files) => {
  if (!Array.isArray(files) || files.length === 0) {
    return []
  }

  const { baseDir } = getArchivePaths()
  await ensureArchiveStore()
  const existing = await readArchiveMeta()

  const savedRecords = []
  for (const file of files) {
    const fileName = sanitizeFileName(file?.name)
    const buffer = Buffer.from(file?.buffer ?? [])
    const id = crypto.randomUUID()
    const savedName = `${id}-${fileName}`
    const filePath = path.join(baseDir, savedName)
    const { category, typeLabel } = getArchiveCategory(fileName)

    await fs.writeFile(filePath, buffer)

    savedRecords.push({
      id,
      name: fileName,
      sizeLabel: formatFileSize(buffer.byteLength),
      typeLabel,
      category,
      filePath,
      createdAt: Date.now(),
    })
  }

  const nextRecords = [...savedRecords, ...existing]
  await writeArchiveMeta(nextRecords)
  return savedRecords
})

ipcMain.handle('archives:open', async (_event, filePath) => {
  if (!filePath) {
    return { ok: false, message: '文件路径为空' }
  }

  const result = await shell.openPath(filePath)
  return result ? { ok: false, message: result } : { ok: true }
})

ipcMain.handle('archives:delete', async (_event, archiveId) => {
  if (!archiveId) {
    return { ok: false, message: '档案标识为空' }
  }

  const records = await readArchiveMeta()
  const targetRecord = records.find((item) => item?.id === archiveId)

  if (!targetRecord) {
    return { ok: false, message: '未找到对应档案' }
  }

  if (targetRecord.filePath) {
    try {
      await fs.unlink(targetRecord.filePath)
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        return { ok: false, message: '删除本地文件失败' }
      }
    }
  }

  const nextRecords = records.filter((item) => item?.id !== archiveId)
  await writeArchiveMeta(nextRecords)

  return { ok: true }
})

ipcMain.handle('manual:get', async () => {
  const record = await readManualMeta()
  if (!record?.filePath) {
    return null
  }

  return {
    ...record,
    fileUrl: pathToFileURL(record.filePath).href,
  }
})

ipcMain.handle('manual:replace', async (_event, file) => {
  const fileName = sanitizeFileName(file?.name)
  const buffer = Buffer.from(file?.buffer ?? [])

  if (!fileName.toLowerCase().endsWith('.pdf')) {
    return { ok: false, message: '仅支持上传 PDF 文件。' }
  }

  const { baseDir } = getManualPaths()
  await ensureManualStore()
  const id = crypto.randomUUID()
  const savedName = `${id}-${fileName}`
  const filePath = path.join(baseDir, savedName)

  await fs.writeFile(filePath, buffer)

  const record = {
    id,
    name: fileName,
    sizeLabel: formatFileSize(buffer.byteLength),
    filePath,
    updatedAt: Date.now(),
  }

  await writeManualMeta(record)

  return {
    ok: true,
    ...record,
    fileUrl: pathToFileURL(filePath).href,
  }
})

app.whenReady().then(() => {
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
