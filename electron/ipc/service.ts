import { ipcMain } from 'electron'
import { callService, isServiceReady, updateServiceConfig } from '../services/service-manager'

export function registerServiceHandlers() {
  ipcMain.handle('service:isReady', async () => {
    return isServiceReady()
  })

  ipcMain.handle('service:fetchFeed', async (_event, url: string) => {
    try {
      return await callService('fetchFeed', { url })
    } catch (err: any) {
      return { error: err.message }
    }
  })

  ipcMain.handle('service:analyzeArticle', async (_event, title: string, content: string) => {
    try {
      return await callService('analyzeArticle', { title, content })
    } catch (err: any) {
      return { error: err.message }
    }
  })

  ipcMain.handle('service:batchAnalyze', async (_event, articles: { title: string; content: string }[]) => {
    try {
      return await callService('batchAnalyze', { articles })
    } catch (err: any) {
      return { error: err.message }
    }
  })

  ipcMain.handle('service:updateConfig', async () => {
    try {
      updateServiceConfig()
      return { ok: true }
    } catch (err: any) {
      return { error: err.message }
    }
  })
}
