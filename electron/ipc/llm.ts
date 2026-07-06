import { ipcMain } from 'electron'
import { analyzeArticle, analyzeSentiment, generateReport, testLLMConnection, fetchArticleContent, summarizeContent, customAnalysis, generatePulseReport } from '../services/llm'
import { getSetting } from '../db/settings'
import { getArticleById } from '../db/articles'
import { addAnalysis, getAnalysesByType } from '../db/analyses'
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
}
