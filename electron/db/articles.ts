import { getDatabase } from './database'
import type { Article } from '../../src/types'

interface GetArticlesOptions {
  feedId?: number
  isFavorite?: boolean
  isRead?: boolean
  limit?: number
  offset?: number
}

export function getArticles(options: GetArticlesOptions = {}): Article[] {
  const db = getDatabase()
  const conditions: string[] = []
  const params: unknown[] = []

  if (options.feedId !== undefined) {
    conditions.push('feed_id = ?')
    params.push(options.feedId)
  }
  if (options.isFavorite !== undefined) {
    conditions.push('is_favorite = ?')
    params.push(options.isFavorite ? 1 : 0)
  }
  if (options.isRead !== undefined) {
    conditions.push('is_read = ?')
    params.push(options.isRead ? 1 : 0)
  }

  let sql = 'SELECT * FROM articles'
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }
  sql += ' ORDER BY published_at DESC'

  if (options.limit !== undefined) {
    sql += ' LIMIT ?'
    params.push(options.limit)
  }
  if (options.offset !== undefined) {
    sql += ' OFFSET ?'
    params.push(options.offset)
  }

  return db.prepare(sql).all(...params) as Article[]
}

export function getArticleById(id: number): Article | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as Article | undefined
}

export function addArticle(
  feedId: number,
  title: string,
  url: string,
  content?: string,
  publishedAt?: string,
  titleZh?: string
): Article | null {
  const db = getDatabase()
  try {
    const result = db.prepare(
      'INSERT INTO articles (feed_id, title, title_zh, url, content, published_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(feedId, title, titleZh || null, url, content || null, publishedAt || null)
    return getArticleById(result.lastInsertRowid as number)!
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return null
    }
    throw error
  }
}

export function markArticleRead(id: number, isRead: boolean = true): void {
  const db = getDatabase()
  db.prepare('UPDATE articles SET is_read = ? WHERE id = ?').run(isRead ? 1 : 0, id)
}

export function toggleArticleFavorite(id: number): Article | undefined {
  const db = getDatabase()
  db.prepare('UPDATE articles SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id)
  return getArticleById(id)
}

export function getArticleCount(options: { feedId?: number; isFavorite?: boolean } = {}): number {
  const db = getDatabase()
  const conditions: string[] = []
  const params: unknown[] = []

  if (options.feedId !== undefined) {
    conditions.push('feed_id = ?')
    params.push(options.feedId)
  }
  if (options.isFavorite !== undefined) {
    conditions.push('is_favorite = ?')
    params.push(options.isFavorite ? 1 : 0)
  }

  let sql = 'SELECT COUNT(*) as count FROM articles'
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }

  const result = db.prepare(sql).get(...params) as { count: number }
  return result.count
}

export function getArticlesWithoutAnalysis(limit: number = 50): Article[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT a.* FROM articles a
    LEFT JOIN analyses ON a.id = analyses.article_id
    WHERE analyses.id IS NULL
    ORDER BY a.published_at DESC
    LIMIT ?
  `).all(limit) as Article[]
}

export function getNewArticleIds(since: Date): number[] {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT id FROM articles 
    WHERE fetched_at >= ? 
    ORDER BY published_at DESC
  `).all(since.toISOString()) as { id: number }[]
  return rows.map(r => r.id)
}
