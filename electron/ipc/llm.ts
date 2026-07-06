import { ipcMain } from 'electron'
import { analyzeArticle, analyzeSentiment, generateReport, testLLMConnection } from '../services/llm'
import { getSetting } from '../db/settings'
import { getArticleById } from '../db/articles'
import { addAnalysis } from '../db/analyses'
import type { LLMConfig } from '../../src/types'

function getLLMConfig(): LLMConfig {
  const baseUrl = getSetting('llm_baseUrl') || ''
  const apiKey = getSetting('llm_apiKey') || ''
  const model = getSetting('llm_model') || ''
  return { baseUrl, apiKey, model }
}

export function registerLLMHandlers() {
  ipcMain.handle('llm:analyzeArticle', async (_event, articleId: number) => {
    const config = getLLMConfig()
    const article = getArticleById(articleId)
    if (!article) {
      throw new Error('Article not found')
    }
    const result = await analyzeArticle(config, article.title, article.content || '')
    addAnalysis(articleId, 'insight', JSON.stringify(result), config.model)
    return result
  })

  ipcMain.handle('llm:analyzeSentiment', async (_event, articleId: number) => {
    const config = getLLMConfig()
    const article = getArticleById(articleId)
    if (!article) {
      throw new Error('Article not found')
    }
    const result = await analyzeSentiment(config, article.title, article.content || '')
    addAnalysis(articleId, 'sentiment', JSON.stringify(result), config.model)
    return result
  })

  ipcMain.handle('llm:generateReport', async (_event, articles: { title: string; content: string }[]) => {
    const config = getLLMConfig()
    return generateReport(config, articles)
  })

  ipcMain.handle('llm:testConnection', async () => {
    const config = getLLMConfig()
    return testLLMConnection(config)
  })
}
