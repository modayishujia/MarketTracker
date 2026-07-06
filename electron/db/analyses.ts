import { getDatabase } from './database'
import type { Analysis } from '../../src/types'

export function getAnalysesByArticle(articleId: number): Analysis[] {
  const db = getDatabase()
  return db.prepare(
    'SELECT * FROM analyses WHERE article_id = ? ORDER BY created_at DESC'
  ).all(articleId) as Analysis[]
}

export function getAnalysisById(id: number): Analysis | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM analyses WHERE id = ?').get(id) as Analysis | undefined
}

export function addAnalysis(
  articleId: number,
  analysisType: 'insight' | 'sentiment' | 'report',
  result: string,
  model: string
): Analysis {
  const db = getDatabase()
  const insertResult = db.prepare(
    'INSERT INTO analyses (article_id, analysis_type, result, model) VALUES (?, ?, ?, ?)'
  ).run(articleId, analysisType, result, model)
  return getAnalysisById(insertResult.lastInsertRowid as number)!
}

export function getRecentAnalyses(limit: number = 10): Analysis[] {
  const db = getDatabase()
  return db.prepare(
    'SELECT * FROM analyses ORDER BY created_at DESC LIMIT ?'
  ).all(limit) as Analysis[]
}

export function getAnalysesByType(analysisType: 'insight' | 'sentiment' | 'report', limit: number = 10): Analysis[] {
  const db = getDatabase()
  return db.prepare(
    'SELECT * FROM analyses WHERE analysis_type = ? ORDER BY created_at DESC LIMIT ?'
  ).all(analysisType, limit) as Analysis[]
}

export function getAnalysisCount(options: { articleId?: number; analysisType?: string } = {}): number {
  const db = getDatabase()
  const conditions: string[] = []
  const params: unknown[] = []

  if (options.articleId !== undefined) {
    conditions.push('article_id = ?')
    params.push(options.articleId)
  }
  if (options.analysisType !== undefined) {
    conditions.push('analysis_type = ?')
    params.push(options.analysisType)
  }

  let sql = 'SELECT COUNT(*) as count FROM analyses'
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }

  const result = db.prepare(sql).get(...params) as { count: number }
  return result.count
}

export interface PulseAsset {
  asset: string
  count: number
  bullish: number
  bearish: number
  neutral: number
  avgConfidence: number
  sentiment: 'bullish' | 'bearish' | 'neutral'
}

export interface PulseData {
  total: number
  bullish: number
  bearish: number
  neutral: number
  avgConfidence: number
  overallSentiment: 'bullish' | 'bearish' | 'neutral'
  assets: PulseAsset[]
  recentTrend: { date: string; bullish: number; bearish: number; neutral: number }[]
}

export function getPulseData(): PulseData {
  const db = getDatabase()

  const rows = db.prepare(`
    SELECT a.result, a.created_at
    FROM analyses a
    WHERE a.analysis_type IN ('insight', 'sentiment')
    ORDER BY a.created_at DESC
    LIMIT 500
  `).all() as { result: string; created_at: string }[]

  let total = 0, bullish = 0, bearish = 0, neutral = 0, confidenceSum = 0
  const assetMap = new Map<string, { bullish: number; bearish: number; neutral: number; confidenceSum: number; count: number }>()
  const trendMap = new Map<string, { bullish: number; bearish: number; neutral: number }>()

  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.result)
      if (!parsed.sentiment) continue

      total++
      const s = parsed.sentiment as string
      if (s === 'bullish') bullish++
      else if (s === 'bearish') bearish++
      else neutral++

      const conf = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5
      confidenceSum += conf

      // Asset aggregation
      if (Array.isArray(parsed.assets)) {
        for (const asset of parsed.assets) {
          if (!asset || typeof asset !== 'string') continue
          const key = asset.trim().toLowerCase()
          if (!key) continue
          const existing = assetMap.get(key) || { bullish: 0, bearish: 0, neutral: 0, confidenceSum: 0, count: 0 }
          existing.count++
          existing.confidenceSum += conf
          if (s === 'bullish') existing.bullish++
          else if (s === 'bearish') existing.bearish++
          else existing.neutral++
          assetMap.set(key, existing)
        }
      }

      // Trend by date
      const date = row.created_at.substring(0, 10)
      const trend = trendMap.get(date) || { bullish: 0, bearish: 0, neutral: 0 }
      if (s === 'bullish') trend.bullish++
      else if (s === 'bearish') trend.bearish++
      else trend.neutral++
      trendMap.set(date, trend)
    } catch {
      // skip invalid JSON
    }
  }

  // Build asset list
  const assets: PulseAsset[] = []
  for (const [key, val] of assetMap) {
    const dominant = val.bullish >= val.bearish && val.bullish >= val.neutral ? 'bullish'
      : val.bearish >= val.bullish && val.bearish >= val.neutral ? 'bearish' : 'neutral'
    assets.push({
      asset: key.charAt(0).toUpperCase() + key.slice(1),
      count: val.count,
      bullish: val.bullish,
      bearish: val.bearish,
      neutral: val.neutral,
      avgConfidence: val.confidenceSum / val.count,
      sentiment: dominant
    })
  }
  assets.sort((a, b) => b.count - a.count)

  // Build trend (last 14 days)
  const trendArr: PulseData['recentTrend'] = []
  const now = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().substring(0, 10)
    const t = trendMap.get(key) || { bullish: 0, bearish: 0, neutral: 0 }
    trendArr.push({ date: key, ...t })
  }

  const overallSentiment = bullish > bearish && bullish > neutral ? 'bullish'
    : bearish > bullish && bearish > neutral ? 'bearish' : 'neutral'

  return {
    total,
    bullish,
    bearish,
    neutral,
    avgConfidence: total > 0 ? confidenceSum / total : 0,
    overallSentiment,
    assets: assets.slice(0, 20),
    recentTrend: trendArr
  }
}
