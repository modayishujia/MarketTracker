import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import { app } from 'electron'

let updateAvailable = false
let updateInfo: any = null

export function setupAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Use GitHub releases for updates
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'modayishujia',
    repo: 'MarketTracker',
    releaseType: 'prerelease'
  })

  autoUpdater.on('checking-for-update', () => {
    notifyRenderer('update:checking', {})
  })

  autoUpdater.on('update-available', (info) => {
    updateAvailable = true
    updateInfo = info
    notifyRenderer('update:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseName: info.releaseName
    })
  })

  autoUpdater.on('update-not-available', () => {
    notifyRenderer('update:not-available', {})
  })

  autoUpdater.on('download-progress', (progress) => {
    notifyRenderer('update:progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    notifyRenderer('update:downloaded', {
      version: info.version
    })
  })

  autoUpdater.on('error', (err) => {
    notifyRenderer('update:error', { message: err.message })
  })

  // IPC handlers
  ipcMain.handle('update:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return {
        available: updateAvailable,
        version: updateInfo?.version,
        releaseDate: updateInfo?.releaseDate
      }
    } catch (err: any) {
      return { available: false, error: err.message }
    }
  })

  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  ipcMain.handle('update:version', () => {
    return app.getVersion()
  })

  // Check for updates on startup (after 10s delay)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 10000)
}

function notifyRenderer(channel: string, data: any) {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data)
    }
  })
}
