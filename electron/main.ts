import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { registerFeedHandlers } from './ipc/feeds'
import { registerArticleHandlers } from './ipc/articles'
import { registerAnalysisHandlers } from './ipc/analyses'
import { registerNoteHandlers } from './ipc/notes'
import { registerSettingsHandlers } from './ipc/settings'
import { registerLLMHandlers } from './ipc/llm'
import { registerBatchAnalysisHandlers } from './services/batchAnalysis'
import { startScheduler, restartScheduler, fetchAllFeeds } from './services/scheduler'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerFeedHandlers()
  registerArticleHandlers()
  registerAnalysisHandlers()
  registerNoteHandlers()
  registerSettingsHandlers()
  registerLLMHandlers()
  registerBatchAnalysisHandlers()

  createWindow()
  startScheduler()
})

ipcMain.on('scheduler:restart', () => {
  restartScheduler()
})

ipcMain.handle('feeds:syncAll', async () => {
  return fetchAllFeeds()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
