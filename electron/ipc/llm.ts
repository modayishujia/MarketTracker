import { ipcMain } from 'electron'
import { analyzeArticle, analyzeSentiment, generateReport, testLLMConnection } from '../services/llm'
import { getSetting } from '../db/settings'
import type { LLMConfig } from '../../src/types'

function getLLMConfig(): LLMConfig {
  const baseUrl = getSetting('llm.baseUrl') || ''
  const apiKey = getSetting('llm.apiKey') || ''
  const model = getSetting('llm.model') || ''
  return { baseUrl, apiKey, model }
}

export function registerLLMHandlers() {
  ipcMain.handle('llm:analyzeArticle', async (_event, title: string, content: string) => {
    const config = getLLMConfig()
    return analyzeArticle(config, title, content)
  })

  ipcMain.handle('llm:analyzeSentiment', async (_event, title: string, content: string) => {
    const config = getLLMConfig()
    return analyzeSentiment(config, title, content)
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
