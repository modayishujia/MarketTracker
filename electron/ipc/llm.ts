import { ipcMain } from 'electron'
import { analyzeArticle, analyzeSentiment, generateReport, testLLMConnection, fetchArticleContent, summarizeContent, customAnalysis, generatePulseReport, generateMarketIntelligence } from '../services/llm'
import { getSetting } from '../db/settings'
import { getArticleById } from '../db/articles'
import { addAnalysis, getAnalysesByType } from '../db/analyses'
import { processArticleForSignals, runSignalScan } from '../services/signal-engine'
import type { LLMConfig } from '../../src/types'

function getLLMConfig(): LLMConfig {
  const baseUrl = getSetting('llm_baseUrl') || ''
  const apiKey = getSetting('llm_apiKey') || ''
  const model = getSetting('llm_model') || ''
  return { baseUrl, apiKey, model }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Request timed out')), ms)
    )
  ])
}

export function registerLLMHandlers() {
  ipcMain.handle('llm:analyzeArticle', async (_event, articleId: number) => {
    try {
      const config = getLLMConfig()
      if (!config.baseUrl || !config.apiKey || !config.model) {
        return { error: '请先配置 AI 模型（设置 → AI 模型）' }
      }
      
      const article = getArticleById(articleId)
      if (!article) {
        return { error: '文章未找到' }
      }
      
      const result = await withTimeout(
        analyzeArticle(config, article.title, article.content || ''),
        60000
      )
      
      try {
        addAnalysis(articleId, 'insight', JSON.stringify(result), config.model)
      } catch (e) {
        // Ignore save errors
      }

      // Trigger signal detection
      try {
        processArticleForSignals(articleId, article.title, article.content || '', JSON.stringify(result))
      } catch {}

      return result
    } catch (err: any) {
      console.error('LLM analyze error:', err.message)
      return { error: err.message || '分析失败' }
    }
  })

  ipcMain.handle('llm:analyzeSentiment', async (_event, articleId: number) => {
    try {
      const config = getLLMConfig()
      if (!config.baseUrl || !config.apiKey || !config.model) {
        return { error: '请先配置 AI 模型（设置 → AI 模型）' }
      }
      
      const article = getArticleById(articleId)
      if (!article) {
        return { error: '文章未找到' }
      }
      
      const result = await withTimeout(
        analyzeSentiment(config, article.title, article.content || ''),
        60000
      )
      
      try {
        addAnalysis(articleId, 'sentiment', JSON.stringify(result), config.model)
      } catch (e) {
        // Ignore save errors
      }
      
      return result
    } catch (err: any) {
      console.error('LLM sentiment error:', err.message)
      return { error: err.message || '情绪分析失败' }
    }
  })

  ipcMain.handle('llm:generateReport', async (_event, articles: { title: string; content: string }[]) => {
    try {
      const config = getLLMConfig()
      if (!config.baseUrl || !config.apiKey || !config.model) {
        return { error: '请先配置 AI 模型（设置 → AI 模型）' }
      }
      
      const result = await withTimeout(
        generateReport(config, articles),
        90000
      )
      return result
    } catch (err: any) {
      console.error('LLM report error:', err.message)
      return { error: err.message || '生成报告失败' }
    }
  })

  ipcMain.handle('llm:testConnection', async () => {
    try {
      const config = getLLMConfig()
      if (!config.baseUrl || !config.apiKey) {
        return { ok: false, error: '请先填写 API 地址和密钥' }
      }
      return await testLLMConnection(config)
    } catch (err: any) {
      return { ok: false, error: err.message || '连接失败' }
    }
  })

  ipcMain.handle('llm:fetchContent', async (_event, url: string) => {
    try {
      return await withTimeout(fetchArticleContent(url), 20000)
    } catch (err: any) {
      return { title: '', content: '', error: err.message || '抓取失败' }
    }
  })

  ipcMain.handle('llm:summarize', async (_event, title: string, content: string) => {
    try {
      const config = getLLMConfig()
      if (!config.baseUrl || !config.apiKey || !config.model) {
        return { error: '请先配置 AI 模型' }
      }
      return await withTimeout(summarizeContent(config, title, content), 60000)
    } catch (err: any) {
      return { error: err.message || '摘要生成失败' }
    }
  })

  ipcMain.handle('llm:customAnalyze', async (_event, articleId: number, prompt: string) => {
    try {
      const config = getLLMConfig()
      if (!config.baseUrl || !config.apiKey || !config.model) {
        return { error: '请先配置 AI 模型' }
      }
      const article = getArticleById(articleId)
      if (!article) return { error: '文章未找到' }

      const result = await withTimeout(
        customAnalysis(config, article.title, article.content || '', prompt),
        60000
      )
      try {
        addAnalysis(articleId, 'custom', JSON.stringify({ ...result, prompt }), config.model)
      } catch {}
      return result
    } catch (err: any) {
      return { error: err.message || '自定义分析失败' }
    }
  })

  ipcMain.handle('llm:generatePulseReport', async (_event, limit?: number) => {
    try {
      const config = getLLMConfig()
      if (!config.baseUrl || !config.apiKey || !config.model) {
        return { error: '请先配置 AI 模型' }
      }

      // Collect recent analyses with sentiment data
      const analyses = getAnalysesByType('insight', limit || 80)
      const articles: { title: string; sentiment?: string; confidence?: number; assets?: string[]; summary?: string }[] = []

      for (const a of analyses) {
        try {
          const parsed = JSON.parse(a.result)
          const article = getArticleById(a.article_id)
          articles.push({
            title: article?.title || 'Unknown',
            sentiment: parsed.sentiment,
            confidence: parsed.confidence,
            assets: parsed.assets,
            summary: parsed.summary
          })
        } catch {}
      }

      if (articles.length === 0) {
        return { error: '没有可用的分析数据，请先分析文章' }
      }

      const html = await withTimeout(generatePulseReport(config, articles), 120000)
      return { html }
    } catch (err: any) {
      return { error: err.message || '报告生成失败' }
    }
  })

  ipcMain.handle('signals:scan', async () => {
    try {
      const result = runSignalScan()
      return { ok: true, ...result }
    } catch (err: any) {
      return { error: err.message || '扫描失败' }
    }
  })

  ipcMain.handle('llm:marketIntelligence', async (_event, webData: { topic: string; items: string[] }[]) => {
    try {
      const config = getLLMConfig()
      if (!config.baseUrl || !config.apiKey || !config.model) {
        return { error: '请先配置 AI 模型' }
      }

      // Gather local data
      const { getDatabase } = require('../db/database')
      const db = getDatabase()

      // Pulse data
      const rows = db.prepare(`
        SELECT result, created_at FROM analyses
        WHERE analysis_type IN ('insight', 'sentiment')
        ORDER BY created_at DESC LIMIT 300
      `).all() as { result: string; created_at: string }[]

      let total = 0, bullish = 0, bearish = 0, neutral = 0
      const assetMap = new Map<string, { b: number; be: number; n: number; confSum: number; count: number }>()
      const recentArticles: { title: string; sentiment: string | null; summary: string | null }[] = []

      for (const row of rows) {
        try {
          const p = JSON.parse(row.result)
          if (!p.sentiment) continue
          total++
          if (p.sentiment === 'bullish') bullish++
          else if (p.sentiment === 'bearish') bearish++
          else neutral++

          if (Array.isArray(p.assets)) {
            for (const asset of p.assets) {
              if (!asset || typeof asset !== 'string') continue
              const k = asset.trim().toLowerCase()
              const e = assetMap.get(k) || { b: 0, be: 0, n: 0, confSum: 0, count: 0 }
              e.count++
              e.confSum += p.confidence || 0.5
              if (p.sentiment === 'bullish') e.b++
              else if (p.sentiment === 'bearish') e.be++
              else e.n++
              assetMap.set(k, e)
            }
          }
        } catch {}
      }

      // Recent articles
      const articles = db.prepare(`
        SELECT ar.title, json_extract(a.result, '$.sentiment') as sentiment, json_extract(a.result, '$.summary') as summary
        FROM articles ar JOIN analyses a ON ar.id = a.article_id
        WHERE a.analysis_type IN ('insight', 'sentiment')
        ORDER BY ar.published_at DESC LIMIT 15
      `).all() as any[]

      const assets = Array.from(assetMap.entries())
        .map(([name, d]) => ({ asset: name, bullish: d.b, bearish: d.be, neutral: d.n, avgConfidence: d.confSum / d.count }))
        .sort((a, b) => (b.bullish + b.bearish + b.neutral) - (a.bullish + a.bearish + a.neutral))
        .slice(0, 10)

      // Active signals
      const signals = db.prepare(`
        SELECT c.name as company, c.ticker, s.grade, s.score, s.reasoning
        FROM signals s JOIN companies c ON s.company_id = c.id
        WHERE s.status = 'active' ORDER BY s.score DESC LIMIT 10
      `).all() as any[]

      const localData = { total, bullish, bearish, neutral, assets, signals, recentArticles: articles }

      const result = await withTimeout(
        generateMarketIntelligence(config, localData, webData),
        120000
      )
      return { data: JSON.parse(result) }
    } catch (err: any) {
      return { error: err.message || '分析失败' }
    }
  })
}
