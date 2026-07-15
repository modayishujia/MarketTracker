import { ipcMain, BrowserWindow } from 'electron'
import { generateBriefingReport } from '../services/llm'
import { getSetting } from '../db/settings'
import { getDatabase } from '../db/database'
import { addBriefing, getBriefings, getBriefingById, deleteBriefing } from '../db/briefings'
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
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))
  ])
}

function notifyRenderer(channel: string, data: any) {
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) win.webContents.send(channel, data)
  })
}

export function registerBriefingHandlers() {
  ipcMain.handle('briefings:generate', async () => {
    try {
      const config = getLLMConfig()
      if (!config.baseUrl || !config.apiKey || !config.model) {
        return { error: '请先配置 AI 模型' }
      }

      notifyRenderer('briefing:progress', { stage: 'collecting' })

      const db = getDatabase()

      // Collect local sentiment data
      const rows = db.prepare(`
        SELECT result, created_at FROM analyses
        WHERE analysis_type IN ('insight', 'sentiment')
        ORDER BY created_at DESC LIMIT 300
      `).all() as { result: string; created_at: string }[]

      let total = 0, bullish = 0, bearish = 0, neutral = 0
      const assetMap = new Map<string, { b: number; be: number; n: number; count: number }>()

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
              const e = assetMap.get(k) || { b: 0, be: 0, n: 0, count: 0 }
              e.count++
              if (p.sentiment === 'bullish') e.b++
              else if (p.sentiment === 'bearish') e.be++
              else e.n++
              assetMap.set(k, e)
            }
          }
        } catch {}
      }

      const assets = Array.from(assetMap.entries())
        .map(([name, d]) => ({ asset: name, ...d }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15)

      // Signals
      const signals = db.prepare(`
        SELECT c.name as company, c.ticker, s.grade, s.score, s.reasoning
        FROM signals s JOIN companies c ON s.company_id = c.id
        WHERE s.status = 'active' ORDER BY s.score DESC LIMIT 10
      `).all() as any[]

      // Recent articles
      const recentArticles = db.prepare(`
        SELECT ar.title, ar.title_zh, ar.published_at,
          json_extract(a.result, '$.sentiment') as sentiment,
          json_extract(a.result, '$.summary') as summary
        FROM articles ar JOIN analyses a ON ar.id = a.article_id
        WHERE a.analysis_type IN ('insight', 'sentiment')
        ORDER BY ar.published_at DESC LIMIT 20
      `).all() as any[]

      notifyRenderer('briefing:progress', { stage: 'searching' })

      // Fetch web data
      let webData: { topic: string; items: string[] }[] = []
      try {
        const { fetchMarketHeadlines } = await import('./websearch')
        webData = await fetchMarketHeadlines()
      } catch {}

      notifyRenderer('briefing:progress', { stage: 'generating' })

      const result = await withTimeout(
        generateBriefingReport(config, { total, bullish, bearish, neutral, assets, signals, recentArticles, webData }),
        120000
      )

      notifyRenderer('briefing:progress', { stage: 'saving' })

      // Save to DB
      const saved = addBriefing(
        result.title,
        'daily',
        result.html,
        result.summary,
        total
      )

      notifyRenderer('briefing:progress', { stage: 'done' })

      return { id: saved.id, title: saved.title, summary: saved.summary }
    } catch (err: any) {
      return { error: err.message || '生成失败' }
    }
  })

  ipcMain.handle('briefings:list', async (_event, limit?: number) => {
    return getBriefings(limit)
  })

  ipcMain.handle('briefings:get', async (_event, id: number) => {
    return getBriefingById(id)
  })

  ipcMain.handle('briefings:delete', async (_event, id: number) => {
    deleteBriefing(id)
    return { ok: true }
  })
}
