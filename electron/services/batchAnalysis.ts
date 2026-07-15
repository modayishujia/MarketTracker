import { ipcMain, BrowserWindow } from 'electron'
import { analyzeArticle } from './llm'
import { getSetting } from '../db/settings'
import { getArticlesWithoutAnalysis } from '../db/articles'
import { addAnalysis } from '../db/analyses'
import { runSignalScan } from './signal-engine'
import type { LLMConfig } from '../../src/types'

let isAnalyzing = false
let analysisQueue: number[] = []

function getLLMConfig(): LLMConfig {
  const baseUrl = getSetting('llm_baseUrl') || ''
  const apiKey = getSetting('llm_apiKey') || ''
  const model = getSetting('llm_model') || ''
  return { baseUrl, apiKey, model }
}

function notifyRenderer(channel: string, data: any) {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data)
    }
  })
}

async function processArticle(articleId: number, title: string, content: string): Promise<boolean> {
  const config = getLLMConfig()
  if (!config.baseUrl || !config.apiKey || !config.model) {
    return false
  }

  try {
    const result = await analyzeArticle(config, title, content)
    if (result && !result.error) {
      try {
        addAnalysis(articleId, 'insight', JSON.stringify(result), config.model)
      } catch (e) {
        // Ignore duplicate
      }
      return true
    }
  } catch (err: any) {
    console.error(`Analysis failed for article ${articleId}:`, err.message)
  }
  return false
}

async function runBatchAnalysis() {
  if (isAnalyzing) return
  if (analysisQueue.length === 0) return

  const config = getLLMConfig()
  if (!config.baseUrl || !config.apiKey || !config.model) {
    analysisQueue = []
    return
  }

  isAnalyzing = true
  notifyRenderer('analysis:started', { count: analysisQueue.length })

  let processed = 0
  let success = 0

  while (analysisQueue.length > 0) {
    const articleId = analysisQueue.shift()!
    
    try {
      const { getArticleById } = require('../db/articles')
      const article = getArticleById(articleId)
      
      if (article) {
        const ok = await processArticle(article.id, article.title, article.content || '')
        if (ok) success++
      }
    } catch (err: any) {
      console.error(`Batch analysis error for ${articleId}:`, err.message)
    }

    processed++
    notifyRenderer('analysis:progress', { processed, total: processed + analysisQueue.length, success })

    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  isAnalyzing = false
  notifyRenderer('analysis:completed', { processed, success })

  // Auto-trigger signal scan after batch analysis
  try {
    const scanResult = runSignalScan()
    if (scanResult.signals > 0) {
      console.log(`[SignalEngine] Auto-scan: ${scanResult.signals} new signals from ${scanResult.scanned} articles`)
      notifyRenderer('signals:generated', { count: scanResult.signals })
    }
  } catch (err: any) {
    console.error('[SignalEngine] Auto-scan error:', err.message)
  }
}

export function startBatchAnalysis(articleIds: number[]) {
  // Add new IDs to queue (avoid duplicates)
  const existing = new Set(analysisQueue)
  const newIds = articleIds.filter(id => !existing.has(id))
  analysisQueue.push(...newIds)

  // Start processing if not already running
  if (!isAnalyzing) {
    runBatchAnalysis().catch(err => {
      console.error('Batch analysis fatal error:', err.message)
      isAnalyzing = false
    })
  }
}

export function startAutoAnalysis() {
  // Check if auto-analyze is enabled
  const autoAnalyze = getSetting('autoAnalyze')
  if (autoAnalyze !== 'true') return

  // Get articles without analysis
  try {
    const articles = getArticlesWithoutAnalysis()
    if (articles.length > 0) {
      const ids = articles.map(a => a.id)
      startBatchAnalysis(ids)
    }
  } catch (err: any) {
    console.error('Auto analysis error:', err.message)
  }
}

export function getAnalysisStatus() {
  return {
    isAnalyzing,
    queueLength: analysisQueue.length
  }
}

export function registerBatchAnalysisHandlers() {
  ipcMain.handle('analysis:startBatch', async (_event, articleIds: number[]) => {
    startBatchAnalysis(articleIds)
    return { ok: true, queued: articleIds.length }
  })

  ipcMain.handle('analysis:status', async () => {
    return getAnalysisStatus()
  })
}
