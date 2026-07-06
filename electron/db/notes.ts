import { getDatabase } from './database'
import type { Note } from '../../src/types'

export function getNotesByArticle(articleId: number): Note[] {
  const db = getDatabase()
  return db.prepare(
    'SELECT * FROM notes WHERE article_id = ? ORDER BY created_at DESC'
  ).all(articleId) as Note[]
}

export function addNote(articleId: number, content: string): Note {
  const db = getDatabase()
  const result = db.prepare(
    'INSERT INTO notes (article_id, content) VALUES (?, ?)'
  ).run(articleId, content)
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid) as Note
}

export function updateNote(id: number, content: string): Note | undefined {
  const db = getDatabase()
  db.prepare('UPDATE notes SET content = ? WHERE id = ?').run(content, id)
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Note | undefined
}

export function deleteNote(id: number): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM notes WHERE id = ?').run(id)
  return result.changes > 0
}
