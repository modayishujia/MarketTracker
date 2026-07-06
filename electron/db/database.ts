import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (db) {
    return db
  }

  const dbPath = path.join(app.getPath('userData'), 'money-analysis.db')
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initializeDatabase(db)

  return db
}

function initializeDatabase(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT UNIQUE NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'rss',
      last_fetched_at DATETIME,
      is_active BOOLEAN DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feed_id INTEGER NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      url TEXT UNIQUE NOT NULL,
      content TEXT,
      published_at DATETIME,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_read BOOLEAN DEFAULT 0,
      is_favorite BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      analysis_type TEXT NOT NULL,
      result TEXT NOT NULL,
      model TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
    CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
    CREATE INDEX IF NOT EXISTS idx_articles_is_favorite ON articles(is_favorite);
    CREATE INDEX IF NOT EXISTS idx_analyses_article_id ON analyses(article_id);
    CREATE INDEX IF NOT EXISTS idx_analyses_analysis_type ON analyses(analysis_type);
    CREATE INDEX IF NOT EXISTS idx_notes_article_id ON notes(article_id);
  `)
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
