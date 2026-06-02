const fs = require('node:fs')
const path = require('node:path')

const releaseDir = path.resolve(__dirname, '..', 'release')
const MAX_RETRIES = 8
const RETRY_DELAY_MS = 1500

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function removeEntry(entryPath) {
  const stat = fs.lstatSync(entryPath)
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(entryPath)) {
      removeEntry(path.join(entryPath, name))
    }
    fs.rmdirSync(entryPath)
    return
  }
  fs.unlinkSync(entryPath)
}

function tryCleanReleaseDir() {
  if (!fs.existsSync(releaseDir)) {
    return true
  }

  try {
    removeEntry(releaseDir)
    return !fs.existsSync(releaseDir)
  } catch {
    try {
      fs.rmSync(releaseDir, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 300,
      })
      return !fs.existsSync(releaseDir)
    } catch {
      return false
    }
  }
}

async function main() {
  if (!fs.existsSync(releaseDir)) {
    return
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    if (tryCleanReleaseDir()) {
      console.log(`[clean:release] removed ${releaseDir}`)
      return
    }

    if (attempt < MAX_RETRIES) {
      console.warn(`[clean:release] release 目录被占用，${RETRY_DELAY_MS}ms 后重试 (${attempt}/${MAX_RETRIES})...`)
      await sleep(RETRY_DELAY_MS)
    }
  }

  console.error('[clean:release] 无法删除 release 目录，通常是 exe 仍在运行或被杀毒软件占用。')
  console.error('[clean:release] 请先关闭「CAS智慧控制系统.exe」，或在任务管理器结束相关进程，再重新执行 npm run build:exe')
  process.exit(1)
}

main()
