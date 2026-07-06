import { getDatabase } from './database'
import type { Feed } from '../../src/types'

export function getAllFeeds(): Feed[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM feeds ORDER BY title').all() as Feed[]
}

export function getFeedById(id: number): Feed | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM feeds WHERE id = ?').get(id) as Feed | undefined
}

export function addFeed(title: string, url: string, sourceType: 'rss' | 'dxtools' = 'rss'): Feed {
  const db = getDatabase()
  const result = db.prepare(
    'INSERT INTO feeds (title, url, source_type) VALUES (?, ?, ?)'
  ).run(title, url, sourceType)
  return getFeedById(result.lastInsertRowid as number)!
}

export function updateFeed(id: number, title: string, url: string, sourceType: 'rss' | 'dxtools'): Feed | undefined {
  const db = getDatabase()
  db.prepare(
    'UPDATE feeds SET title = ?, url = ?, source_type = ? WHERE id = ?'
  ).run(title, url, sourceType, id)
  return getFeedById(id)
}

export function deleteFeed(id: number): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM feeds WHERE id = ?').run(id)
  return result.changes > 0
}

export function updateFeedLastFetched(id: number): void {
  const db = getDatabase()
  db.prepare(
    "UPDATE feeds SET last_fetched_at = datetime('now') WHERE id = ?"
  ).run(id)
}

export function getActiveFeeds(): Feed[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM feeds WHERE is_active = 1 ORDER BY title').all() as Feed[]
}
