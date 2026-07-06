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
