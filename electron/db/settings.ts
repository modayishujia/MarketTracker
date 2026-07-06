import { getDatabase } from './database'
import type { Setting } from '../../src/types'

export function getSetting(key: string): string | undefined {
  const db = getDatabase()
  const result = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return result?.value
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase()
  db.prepare(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
  ).run(key, value)
}

export function getAllSettings(): Setting[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM settings ORDER BY key').all() as Setting[]
}

export function deleteSetting(key: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM settings WHERE key = ?').run(key)
  return result.changes > 0
}
