import { getDatabase } from './database'

export interface Briefing {
  id: number
  title: string
  briefing_type: string
  content_html: string
  summary: string | null
  articles_count: number
  created_at: string
}

export function addBriefing(title: string, briefingType: string, contentHtml: string, summary: string | null, articlesCount: number): Briefing {
  const db = getDatabase()
  const result = db.prepare(
    'INSERT INTO briefings (title, briefing_type, content_html, summary, articles_count) VALUES (?, ?, ?, ?, ?)'
  ).run(title, briefingType, contentHtml, summary, articlesCount)
  return db.prepare('SELECT * FROM briefings WHERE id = ?').get(result.lastInsertRowid) as Briefing
}

export function getBriefings(limit: number = 20): Briefing[] {
  const db = getDatabase()
  return db.prepare(
    'SELECT id, title, briefing_type, summary, articles_count, created_at FROM briefings ORDER BY created_at DESC LIMIT ?'
  ).all(limit) as Briefing[]
}

export function getBriefingById(id: number): Briefing | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM briefings WHERE id = ?').get(id) as Briefing | undefined
}

export function deleteBriefing(id: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM briefings WHERE id = ?').run(id)
}

export function getBriefingCount(): number {
  const db = getDatabase()
  return (db.prepare('SELECT COUNT(*) as c FROM briefings').get() as { c: number }).c
}
