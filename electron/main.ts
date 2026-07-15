import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { registerFeedHandlers } from './ipc/feeds'
import { registerArticleHandlers } from './ipc/articles'
import { registerAnalysisHandlers } from './ipc/analyses'
import { registerNoteHandlers } from './ipc/notes'
import { registerSettingsHandlers } from './ipc/settings'
import { registerLLMHandlers } from './ipc/llm'
import { registerServiceHandlers } from './ipc/service'
import { registerOpportunityHandlers } from './ipc/opportunities'
import { registerWebSearchHandlers } from './ipc/websearch'
import { registerBatchAnalysisHandlers } from './services/batchAnalysis'
import { startScheduler, restartScheduler, fetchAllFeeds } from './services/scheduler'
import { setupAutoUpdater } from './services/updater'
import { startFetchAnalysisService, stopFetchAnalysisService, startMcpServer, stopMcpServer, getMcpServerCommand } from './services/service-manager'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(__dirname, '../../build/icon.png')

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: iconPath,
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

app.whenReady().then(async () => {
  registerFeedHandlers()
  registerArticleHandlers()
  registerAnalysisHandlers()
  registerNoteHandlers()
  registerSettingsHandlers()
  registerLLMHandlers()
  registerServiceHandlers()
  registerOpportunityHandlers()
  registerWebSearchHandlers()
  registerBatchAnalysisHandlers()

  createWindow()
  startScheduler()
  setupAutoUpdater()

  // Start fetch-analysis service
  try {
    await startFetchAnalysisService()
    console.log('Fetch-analysis service started successfully')
  } catch (err) {
    console.error('Failed to start fetch-analysis service:', err)
  }

  // Start MCP server
  try {
    startMcpServer()
    console.log('MCP server started')
  } catch (err) {
    console.error('Failed to start MCP server:', err)
  }
})

ipcMain.on('scheduler:restart', () => {
  restartScheduler()
})

ipcMain.handle('feeds:syncAll', async () => {
  return fetchAllFeeds()
})

ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  await shell.openExternal(url)
})

ipcMain.handle('mcp:getCommand', async () => {
  return getMcpServerCommand()
})

app.on('window-all-closed', () => {
  stopFetchAnalysisService()
  stopMcpServer()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
