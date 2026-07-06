import { ipcMain } from 'electron'
import { getAnalysesByArticle, getRecentAnalyses, getAnalysesByType, getAnalysisCount, getPulseData } from '../db/analyses'
import { getArticlesWithoutAnalysis } from '../db/articles'

export function registerAnalysisHandlers() {
  ipcMain.handle('analyses:getByArticle', (_event, articleId: number) => {
    return getAnalysesByArticle(articleId)
  })

  ipcMain.handle('analyses:getRecent', (_event, limit?: number) => {
    return getRecentAnalyses(limit)
  })

  ipcMain.handle('analyses:getByType', (_event, analysisType: 'insight' | 'sentiment' | 'report', limit?: number) => {
    return getAnalysesByType(analysisType, limit)
  })

  ipcMain.handle('analyses:getCount', (_event, options?: { articleId?: number; analysisType?: string }) => {
    return getAnalysisCount(options)
  })

  ipcMain.handle('analyses:getPulseData', () => {
    return getPulseData()
  })

  ipcMain.handle('analyses:getUnanalyzed', (_event, limit?: number) => {
    return getArticlesWithoutAnalysis(limit || 200)
  })
}
