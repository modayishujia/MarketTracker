# Financial RSS Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Electron desktop app that aggregates financial RSS feeds, fetches articles, and uses an OpenAI-compatible LLM to extract insights, sentiment, and generate reports.

**Architecture:** Electron main process handles RSS fetching, SQLite storage, and LLM calls. React renderer displays a three-column UI with feed management, article browsing, and analysis panels. IPC bridge connects them securely.

**Tech Stack:** Electron, React, TypeScript, electron-vite, SQLite (better-sqlite3), Tailwind CSS, Zustand, Recharts, react-i18next

---

## File Structure

```
MoneyAalysis/
├── electron/
│   ├── main.ts                    # Electron main process entry
│   ├── preload.ts                 # IPC bridge (contextBridge)
│   ├── db/
│   │   ├── database.ts            # SQLite connection & init
│   │   ├── feeds.ts               # Feed CRUD operations
│   │   ├── articles.ts            # Article CRUD operations
│   │   ├── analyses.ts            # Analysis CRUD operations
│   │   ├── notes.ts               # Notes CRUD operations
│   │   └── settings.ts            # Settings KV operations
│   ├── services/
│   │   ├── rss.ts                 # RSS fetching & parsing
│   │   ├── dxtools.ts             # dxtools aggregated source handler
│   │   ├── llm.ts                 # OpenAI-compatible LLM client
│   │   └── scheduler.ts           # Periodic fetch scheduler
│   └── ipc/
│       ├── feeds.ts               # Feed-related IPC handlers
│       ├── articles.ts            # Article-related IPC handlers
│       ├── analyses.ts            # Analysis-related IPC handlers
│       ├── notes.ts               # Notes-related IPC handlers
│       ├── settings.ts            # Settings-related IPC handlers
│       └── llm.ts                 # LLM-related IPC handlers
├── src/
│   ├── main.tsx                   # React entry point
│   ├── App.tsx                    # Root component with layout
│   ├── i18n/
│   │   ├── index.ts               # i18next setup
│   │   ├── zh.json                # Chinese translations
│   │   └── en.json                # English translations
│   ├── stores/
│   │   ├── feedStore.ts           # Feed state management
│   │   ├── articleStore.ts        # Article state management
│   │   ├── analysisStore.ts       # Analysis state management
│   │   └── settingsStore.ts       # Settings state management
│   ├── pages/
│   │   ├── FeedPage.tsx           # Feed management page
│   │   ├── ArticleListPage.tsx    # Article list page
│   │   ├── ArticleDetailPage.tsx  # Article detail with analysis panel
│   │   ├── DashboardPage.tsx      # Analysis dashboard
│   │   └── SettingsPage.tsx       # Settings page
│   ├── components/
│   │   ├── Layout.tsx             # Three-column layout
│   │   ├── Sidebar.tsx            # Left sidebar navigation
│   │   ├── FeedForm.tsx           # Add/edit feed form
│   │   ├── ArticleCard.tsx        # Article list item
│   │   ├── InsightPanel.tsx       # Key insights display
│   │   ├── SentimentPanel.tsx     # Sentiment analysis display
│   │   ├── NotesPanel.tsx         # Notes editor
│   │   ├── ReportPanel.tsx        # Comprehensive report display
│   │   ├── SentimentChart.tsx     # Sentiment trend line chart
│   │   ├── AssetFrequencyChart.tsx # Asset mention bar chart
│   │   ├── SentimentPieChart.tsx  # Sentiment distribution pie chart
│   │   └── LanguageSwitch.tsx     # Language toggle
│   ├── hooks/
│   │   └── useIPC.ts              # IPC communication hook
│   └── types/
│       └── index.ts               # Shared TypeScript types
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── electron-builder.json
├── electron.vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── vite.config.ts
```

---

## Task 1: Project Scaffolding

**Covers:** S1

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `electron.vite.config.ts`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `electron/main.ts`, `electron/preload.ts`, `src/main.tsx`, `src/App.tsx`, `src/index.css`

- [ ] **Step 1: Initialize npm project and install dependencies**

```bash
cd /Users/igaves/Files/MoneyAalysis
npm init -y
```

- [ ] **Step 2: Install production dependencies**

```bash
npm install electron better-sqlite3 react react-dom react-router-dom zustand recharts react-i18next i18next rss-parser node-fetch@2
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D typescript @types/react @types/react-dom @types/better-sqlite3 @types/node-fetch electron-vite vite @vitejs/plugin-react tailwindcss postcss autoprefixer eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "outDir": "./dist",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*", "electron/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist-electron"
  },
  "include": ["electron/**/*"]
}
```

- [ ] **Step 6: Create electron.vite.config.ts**

```typescript
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src'),
    build: {
      outDir: resolve(__dirname, 'dist/renderer'),
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html')
        }
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    }
  }
})
```

- [ ] **Step 7: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}', './index.html'],
  theme: {
    extend: {}
  },
  plugins: []
}
```

- [ ] **Step 8: Create postcss.config.js**

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

- [ ] **Step 9: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Financial RSS Analyzer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 10: Create src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #1a1a2e;
  color: #e0e0e0;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #1a1a2e;
}

::-webkit-scrollbar-thumb {
  background: #4a4a6a;
  border-radius: 3px;
}
```

- [ ] **Step 11: Create src/main.tsx**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 12: Create src/App.tsx (placeholder)**

```typescript
function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <h1 className="text-3xl font-bold">Financial RSS Analyzer</h1>
    </div>
  )
}

export default App
```

- [ ] **Step 13: Create electron/main.ts (minimal)**

```typescript
import { app, BrowserWindow } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
```

- [ ] **Step 14: Create electron/preload.ts (minimal)**

```typescript
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform
})
```

- [ ] **Step 15: Update package.json scripts**

```json
{
  "main": "dist-electron/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "lint": "eslint src electron --ext .ts,.tsx"
  }
}
```

- [ ] **Step 16: Test the scaffold**

```bash
npm run dev
```

Expected: Electron window opens showing "Financial RSS Analyzer" text on dark background.

- [ ] **Step 17: Commit**

```bash
git init
git add -A
git commit -m "chore: initial project scaffolding with Electron + React + TypeScript"
```

---

## Task 2: Database Layer

**Covers:** S2

**Files:**
- Create: `electron/db/database.ts`, `electron/db/feeds.ts`, `electron/db/articles.ts`, `electron/db/analyses.ts`, `electron/db/notes.ts`, `electron/db/settings.ts`, `src/types/index.ts`

- [ ] **Step 1: Create src/types/index.ts**

```typescript
export interface Feed {
  id: number
  title: string
  url: string
  source_type: 'rss' | 'dxtools'
  last_fetched_at: string | null
  is_active: number
}

export interface Article {
  id: number
  feed_id: number
  title: string
  url: string
  content: string | null
  published_at: string | null
  fetched_at: string
  is_read: number
  is_favorite: number
}

export interface Analysis {
  id: number
  article_id: number
  analysis_type: 'insight' | 'sentiment' | 'report'
  result: string
  model: string
  created_at: string
}

export interface Note {
  id: number
  article_id: number
  content: string
  created_at: string
}

export interface Setting {
  key: string
  value: string
}

export interface LLMConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export interface AnalysisResult {
  summary: string
  keyPoints: string[]
  sentiment: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  reasoning: string
  assets: string[]
}

export interface ReportResult {
  title: string
  summary: string
  keyThemes: string[]
  marketOutlook: string
  articlesAnalyzed: number
}
```

- [ ] **Step 2: Create electron/db/database.ts**

```typescript
import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (db) return db

  const dbPath = path.join(app.getPath('userData'), 'money-analysis.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initSchema(db)
  return db
}

function initSchema(db: Database.Database) {
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
    CREATE INDEX IF NOT EXISTS idx_analyses_article_id ON analyses(article_id);
    CREATE INDEX IF NOT EXISTS idx_notes_article_id ON notes(article_id);
  `)
}

export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}
```

- [ ] **Step 3: Create electron/db/feeds.ts**

```typescript
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

export function addFeed(title: string, url: string, sourceType: 'rss' | 'dxtools'): Feed {
  const db = getDatabase()
  const result = db.prepare(
    'INSERT INTO feeds (title, url, source_type) VALUES (?, ?, ?)'
  ).run(title, url, sourceType)
  return getFeedById(result.lastInsertRowid as number)!
}

export function updateFeed(id: number, title: string, url: string, isActive: boolean): Feed | undefined {
  const db = getDatabase()
  db.prepare(
    'UPDATE feeds SET title = ?, url = ?, is_active = ? WHERE id = ?'
  ).run(title, url, isActive ? 1 : 0, id)
  return getFeedById(id)
}

export function deleteFeed(id: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM feeds WHERE id = ?').run(id)
}

export function updateFeedLastFetched(id: number): void {
  const db = getDatabase()
  db.prepare(
    'UPDATE feeds SET last_fetched_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(id)
}

export function getActiveFeeds(): Feed[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM feeds WHERE is_active = 1').all() as Feed[]
}
```

- [ ] **Step 4: Create electron/db/articles.ts**

```typescript
import { getDatabase } from './database'
import type { Article } from '../../src/types'

export function getArticles(options?: {
  feedId?: number
  isFavorite?: boolean
  isRead?: boolean
  limit?: number
  offset?: number
}): Article[] {
  const db = getDatabase()
  let sql = 'SELECT * FROM articles WHERE 1=1'
  const params: any[] = []

  if (options?.feedId !== undefined) {
    sql += ' AND feed_id = ?'
    params.push(options.feedId)
  }
  if (options?.isFavorite !== undefined) {
    sql += ' AND is_favorite = ?'
    params.push(options.isFavorite ? 1 : 0)
  }
  if (options?.isRead !== undefined) {
    sql += ' AND is_read = ?'
    params.push(options.isRead ? 1 : 0)
  }

  sql += ' ORDER BY published_at DESC'

  if (options?.limit) {
    sql += ' LIMIT ?'
    params.push(options.limit)
  }
  if (options?.offset) {
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
  feedId: number, title: string, url: string, content: string | null, publishedAt: string | null
): Article | null {
  const db = getDatabase()
  try {
    const result = db.prepare(
      'INSERT INTO articles (feed_id, title, url, content, published_at) VALUES (?, ?, ?, ?, ?)'
    ).run(feedId, title, url, content, publishedAt)
    return getArticleById(result.lastInsertRowid as number)!
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint')) return null
    throw e
  }
}

export function markArticleRead(id: number): void {
  const db = getDatabase()
  db.prepare('UPDATE articles SET is_read = 1 WHERE id = ?').run(id)
}

export function toggleArticleFavorite(id: number): Article | undefined {
  const db = getDatabase()
  db.prepare('UPDATE articles SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id)
  return getArticleById(id)
}

export function getArticleCount(feedId?: number): number {
  const db = getDatabase()
  if (feedId) {
    return (db.prepare('SELECT COUNT(*) as count FROM articles WHERE feed_id = ?').get(feedId) as any).count
  }
  return (db.prepare('SELECT COUNT(*) as count FROM articles').get() as any).count
}
```

- [ ] **Step 5: Create electron/db/analyses.ts**

```typescript
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
  articleId: number, analysisType: string, result: string, model: string
): Analysis {
  const db = getDatabase()
  const res = db.prepare(
    'INSERT INTO analyses (article_id, analysis_type, result, model) VALUES (?, ?, ?, ?)'
  ).run(articleId, analysisType, result, model)
  return getAnalysisById(res.lastInsertRowid as number)!
}

export function getRecentAnalyses(limit: number = 50): Analysis[] {
  const db = getDatabase()
  return db.prepare(
    'SELECT * FROM analyses ORDER BY created_at DESC LIMIT ?'
  ).all(limit) as Analysis[]
}

export function getAnalysesByType(analysisType: string, limit: number = 50): Analysis[] {
  const db = getDatabase()
  return db.prepare(
    'SELECT * FROM analyses WHERE analysis_type = ? ORDER BY created_at DESC LIMIT ?'
  ).all(analysisType, limit) as Analysis[]
}

export function getAnalysisCount(): number {
  const db = getDatabase()
  return (db.prepare('SELECT COUNT(*) as count FROM analyses').get() as any).count
}
```

- [ ] **Step 6: Create electron/db/notes.ts**

```typescript
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

export function updateNote(id: number, content: string): void {
  const db = getDatabase()
  db.prepare('UPDATE notes SET content = ? WHERE id = ?').run(content, id)
}

export function deleteNote(id: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM notes WHERE id = ?').run(id)
}
```

- [ ] **Step 7: Create electron/db/settings.ts**

```typescript
import { getDatabase } from './database'

export function getSetting(key: string): string | undefined {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase()
  db.prepare(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
  ).run(key, value)
}

export function getAllSettings(): Record<string, string> {
  const db = getDatabase()
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

export function deleteSetting(key: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM settings WHERE key = ?').run(key)
}
```

- [ ] **Step 8: Test database initialization**

```bash
npm run dev
```

Expected: App launches without errors. Check that the SQLite database file is created in the app's userData directory.

- [ ] **Step 9: Commit**

```bash
git add electron/db src/types
git commit -m "feat: add SQLite database layer with CRUD operations"
```

---

## Task 3: RSS Fetching Service

**Covers:** S3

**Files:**
- Create: `electron/services/rss.ts`, `electron/services/dxtools.ts`

- [ ] **Step 1: Create electron/services/rss.ts**

```typescript
import Parser from 'rss-parser'
import { addArticle, addFeed } from '../db/feeds'
import { updateFeedLastFetched } from '../db/feeds'

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'FinancialRSSAnalyzer/1.0'
  }
})

export interface FetchedArticle {
  title: string
  url: string
  content: string | null
  publishedAt: string | null
}

export async function fetchFeed(feedUrl: string): Promise<FetchedArticle[]> {
  try {
    const feed = await parser.parseURL(feedUrl)
    const articles: FetchedArticle[] = []

    for (const item of feed.items || []) {
      if (!item.title || !item.link) continue

      articles.push({
        title: item.title,
        url: item.link,
        content: item.content || item.contentSnippet || null,
        publishedAt: item.isoDate || item.pubDate || null
      })
    }

    return articles
  } catch (error) {
    console.error(`Failed to fetch feed ${feedUrl}:`, error)
    throw error
  }
}

export async function fetchAndStoreFeed(feedId: number, feedUrl: string, sourceType: 'rss' | 'dxtools'): Promise<number> {
  const articles = await fetchFeed(feedUrl)
  let newCount = 0

  for (const article of articles) {
    const result = addArticle(
      feedId,
      article.title,
      article.url,
      article.content,
      article.publishedAt
    )
    if (result) newCount++
  }

  updateFeedLastFetched(feedId)
  return newCount
}

export function extractFeedTitle(feedUrl: string): Promise<string> {
  return parser.parseURL(feedUrl).then(feed => feed.title || feedUrl)
}
```

- [ ] **Step 2: Create electron/services/dxtools.ts**

```typescript
import { fetchFeed, FetchedArticle } from './rss'

const DXTOOLS_BASE = 'https://rss.dxtools.top'

interface DxToolsSource {
  name: string
  url: string
}

export async function fetchDxToolsSources(): Promise<DxToolsSource[]> {
  try {
    const response = await fetch(`${DXTOOLS_BASE}/api/feeds`)
    if (!response.ok) {
      throw new Error(`dxtools API error: ${response.status}`)
    }
    const data = await response.json()
    return Array.isArray(data) ? data : data.feeds || []
  } catch (error) {
    console.error('Failed to fetch dxtools sources:', error)
    return []
  }
}

export async function fetchDxToolsFeed(feedUrl: string): Promise<FetchedArticle[]> {
  let url = feedUrl
  if (!url.startsWith('http')) {
    url = `${DXTOOLS_BASE}/${url}`
  }
  return fetchFeed(url)
}

export async function fetchAllDxToolsFeeds(): Promise<Map<string, FetchedArticle[]>> {
  const sources = await fetchDxToolsSources()
  const results = new Map<string, FetchedArticle[]>()

  for (const source of sources) {
    try {
      const articles = await fetchDxToolsFeed(source.url)
      results.set(source.name, articles)
    } catch (error) {
      console.error(`Failed to fetch dxtools feed ${source.name}:`, error)
    }
  }

  return results
}
```

- [ ] **Step 3: Test RSS fetching**

Add a test RSS feed in the app and verify articles are stored in the database.

- [ ] **Step 4: Commit**

```bash
git add electron/services/rss.ts electron/services/dxtools.ts
git commit -m "feat: add RSS fetching service with dxtools support"
```

---

## Task 4: LLM Service

**Covers:** S3

**Files:**
- Create: `electron/services/llm.ts`

- [ ] **Step 1: Create electron/services/llm.ts**

```typescript
import type { LLMConfig, AnalysisResult, ReportResult } from '../../src/types'

const INSIGHT_SYSTEM_PROMPT = `You are a financial analyst. Analyze the given article and extract key insights.
Respond in JSON format:
{
  "summary": "Brief 1-2 sentence summary",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "sentiment": "bullish" | "bearish" | "neutral",
  "confidence": 0.0-1.0,
  "reasoning": "Why this sentiment",
  "assets": ["BTC", "ETH", "AAPL", etc]
}`

const SENTIMENT_SYSTEM_PROMPT = `You are a market sentiment analyst. Analyze the given article for market sentiment.
Respond in JSON format:
{
  "summary": "Brief summary",
  "keyPoints": ["key point 1", "key point 2"],
  "sentiment": "bullish" | "bearish" | "neutral",
  "confidence": 0.0-1.0,
  "reasoning": "Detailed reasoning for sentiment classification",
  "assets": ["relevant", "assets", "mentioned"]
}`

const REPORT_SYSTEM_PROMPT = `You are a senior financial analyst. Given multiple article summaries, create a comprehensive market report.
Respond in JSON format:
{
  "title": "Report title",
  "summary": "Executive summary",
  "keyThemes": ["theme 1", "theme 2"],
  "marketOutlook": "Overall market outlook paragraph",
  "articlesAnalyzed": number
}`

export async function callLLM(
  config: LLMConfig,
  systemPrompt: string,
  userContent: string
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`LLM API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

export async function analyzeArticle(
  config: LLMConfig,
  title: string,
  content: string
): Promise<AnalysisResult> {
  const articleText = `Title: ${title}\n\nContent: ${content}`
  const result = await callLLM(config, INSIGHT_SYSTEM_PROMPT, articleText)
  return JSON.parse(result) as AnalysisResult
}

export async function analyzeSentiment(
  config: LLMConfig,
  title: string,
  content: string
): Promise<AnalysisResult> {
  const articleText = `Title: ${title}\n\nContent: ${content}`
  const result = await callLLM(config, SENTIMENT_SYSTEM_PROMPT, articleText)
  return JSON.parse(result) as AnalysisResult
}

export async function generateReport(
  config: LLMConfig,
  articles: { title: string; summary: string }[]
): Promise<ReportResult> {
  const articlesText = articles
    .map((a, i) => `${i + 1}. ${a.title}\nSummary: ${a.summary}`)
    .join('\n\n')

  const result = await callLLM(config, REPORT_SYSTEM_PROMPT, articlesText)
  return JSON.parse(result) as ReportResult
}

export async function testLLMConnection(config: LLMConfig): Promise<boolean> {
  try {
    const response = await fetch(`${config.baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${config.apiKey}` }
    })
    return response.ok
  } catch {
    return false
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/services/llm.ts
git commit -m "feat: add OpenAI-compatible LLM service for article analysis"
```

---

## Task 5: IPC Layer

**Covers:** S1

**Files:**
- Create: `electron/ipc/feeds.ts`, `electron/ipc/articles.ts`, `electron/ipc/analyses.ts`, `electron/ipc/notes.ts`, `electron/ipc/settings.ts`, `electron/ipc/llm.ts`
- Modify: `electron/preload.ts`, `electron/main.ts`

- [ ] **Step 1: Create electron/ipc/feeds.ts**

```typescript
import { ipcMain } from 'electron'
import * as feedDb from '../db/feeds'
import { fetchAndStoreFeed } from '../services/rss'
import { fetchDxToolsFeed } from '../services/dxtools'
import { extractFeedTitle } from '../services/rss'

export function registerFeedHandlers() {
  ipcMain.handle('feeds:getAll', () => {
    return feedDb.getAllFeeds()
  })

  ipcMain.handle('feeds:add', async (_, url: string, sourceType: 'rss' | 'dxtools') => {
    const title = await extractFeedTitle(url)
    return feedDb.addFeed(title, url, sourceType)
  })

  ipcMain.handle('feeds:update', (_, id: number, title: string, url: string, isActive: boolean) => {
    return feedDb.updateFeed(id, title, url, isActive)
  })

  ipcMain.handle('feeds:delete', (_, id: number) => {
    feedDb.deleteFeed(id)
  })

  ipcMain.handle('feeds:fetch', async (_, feedId: number) => {
    const feed = feedDb.getFeedById(feedId)
    if (!feed) throw new Error('Feed not found')

    if (feed.source_type === 'dxtools') {
      const articles = await fetchDxToolsFeed(feed.url)
      let newCount = 0
      for (const article of articles) {
        const { addArticle } = require('../db/articles')
        const result = addArticle(feedId, article.title, article.url, article.content, article.publishedAt)
        if (result) newCount++
      }
      feedDb.updateFeedLastFetched(feedId)
      return newCount
    }

    return fetchAndStoreFeed(feedId, feed.url, feed.source_type)
  })

  ipcMain.handle('feeds:fetchActive', async () => {
    const feeds = feedDb.getActiveFeeds()
    let totalNew = 0
    for (const feed of feeds) {
      try {
        const newCount = await fetchAndStoreFeed(feed.id, feed.url, feed.source_type)
        totalNew += newCount
      } catch (error) {
        console.error(`Failed to fetch feed ${feed.title}:`, error)
      }
    }
    return totalNew
  })
}
```

- [ ] **Step 2: Create electron/ipc/articles.ts**

```typescript
import { ipcMain } from 'electron'
import * as articleDb from '../db/articles'

export function registerArticleHandlers() {
  ipcMain.handle('articles:getAll', (_, options?: {
    feedId?: number
    isFavorite?: boolean
    isRead?: boolean
    limit?: number
    offset?: number
  }) => {
    return articleDb.getArticles(options)
  })

  ipcMain.handle('articles:getById', (_, id: number) => {
    return articleDb.getArticleById(id)
  })

  ipcMain.handle('articles:markRead', (_, id: number) => {
    articleDb.markArticleRead(id)
  })

  ipcMain.handle('articles:toggleFavorite', (_, id: number) => {
    return articleDb.toggleArticleFavorite(id)
  })

  ipcMain.handle('articles:getCount', (_, feedId?: number) => {
    return articleDb.getArticleCount(feedId)
  })
}
```

- [ ] **Step 3: Create electron/ipc/analyses.ts**

```typescript
import { ipcMain } from 'electron'
import * as analysisDb from '../db/analyses'

export function registerAnalysisHandlers() {
  ipcMain.handle('analyses:getByArticle', (_, articleId: number) => {
    return analysisDb.getAnalysesByArticle(articleId)
  })

  ipcMain.handle('analyses:getRecent', (_, limit?: number) => {
    return analysisDb.getRecentAnalyses(limit)
  })

  ipcMain.handle('analyses:getByType', (_, type: string, limit?: number) => {
    return analysisDb.getAnalysesByType(type, limit)
  })

  ipcMain.handle('analyses:getCount', () => {
    return analysisDb.getAnalysisCount()
  })
}
```

- [ ] **Step 4: Create electron/ipc/notes.ts**

```typescript
import { ipcMain } from 'electron'
import * as noteDb from '../db/notes'

export function registerNoteHandlers() {
  ipcMain.handle('notes:getByArticle', (_, articleId: number) => {
    return noteDb.getNotesByArticle(articleId)
  })

  ipcMain.handle('notes:add', (_, articleId: number, content: string) => {
    return noteDb.addNote(articleId, content)
  })

  ipcMain.handle('notes:update', (_, id: number, content: string) => {
    noteDb.updateNote(id, content)
  })

  ipcMain.handle('notes:delete', (_, id: number) => {
    noteDb.deleteNote(id)
  })
}
```

- [ ] **Step 5: Create electron/ipc/settings.ts**

```typescript
import { ipcMain } from 'electron'
import * as settingsDb from '../db/settings'

export function registerSettingsHandlers() {
  ipcMain.handle('settings:get', (_, key: string) => {
    return settingsDb.getSetting(key)
  })

  ipcMain.handle('settings:set', (_, key: string, value: string) => {
    settingsDb.setSetting(key, value)
  })

  ipcMain.handle('settings:getAll', () => {
    return settingsDb.getAllSettings()
  })

  ipcMain.handle('settings:delete', (_, key: string) => {
    settingsDb.deleteSetting(key)
  })
}
```

- [ ] **Step 6: Create electron/ipc/llm.ts**

```typescript
import { ipcMain } from 'electron'
import { analyzeArticle, analyzeSentiment, generateReport, testLLMConnection } from '../services/llm'
import { addAnalysis } from '../db/analyses'
import { getArticleById } from '../db/articles'
import { getSetting } from '../db/settings'
import type { LLMConfig } from '../../src/types'

function getLLMConfig(): LLMConfig {
  return {
    baseUrl: getSetting('llm_baseUrl') || '',
    apiKey: getSetting('llm_apiKey') || '',
    model: getSetting('llm_model') || ''
  }
}

export function registerLLMHandlers() {
  ipcMain.handle('llm:analyzeArticle', async (_, articleId: number) => {
    const config = getLLMConfig()
    if (!config.apiKey) throw new Error('LLM API key not configured')

    const article = getArticleById(articleId)
    if (!article) throw new Error('Article not found')

    const result = await analyzeArticle(config, article.title, article.content || '')
    addAnalysis(articleId, 'insight', JSON.stringify(result), config.model)
    return result
  })

  ipcMain.handle('llm:analyzeSentiment', async (_, articleId: number) => {
    const config = getLLMConfig()
    if (!config.apiKey) throw new Error('LLM API key not configured')

    const article = getArticleById(articleId)
    if (!article) throw new Error('Article not found')

    const result = await analyzeSentiment(config, article.title, article.content || '')
    addAnalysis(articleId, 'sentiment', JSON.stringify(result), config.model)
    return result
  })

  ipcMain.handle('llm:generateReport', async (_, articleIds: number[]) => {
    const config = getLLMConfig()
    if (!config.apiKey) throw new Error('LLM API key not configured')

    const articles = articleIds
      .map(id => getArticleById(id))
      .filter((a): a is NonNullable<typeof a> => a !== undefined)
      .map(a => ({ title: a.title, summary: a.content?.substring(0, 500) || '' }))

    return generateReport(config, articles)
  })

  ipcMain.handle('llm:testConnection', async () => {
    const config = getLLMConfig()
    return testLLMConnection(config)
  })
}
```

- [ ] **Step 7: Update electron/preload.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  feeds: {
    getAll: () => ipcRenderer.invoke('feeds:getAll'),
    add: (url: string, sourceType: 'rss' | 'dxtools') => ipcRenderer.invoke('feeds:add', url, sourceType),
    update: (id: number, title: string, url: string, isActive: boolean) => ipcRenderer.invoke('feeds:update', id, title, url, isActive),
    delete: (id: number) => ipcRenderer.invoke('feeds:delete', id),
    fetch: (feedId: number) => ipcRenderer.invoke('feeds:fetch', feedId),
    fetchActive: () => ipcRenderer.invoke('feeds:fetchActive')
  },

  articles: {
    getAll: (options?: any) => ipcRenderer.invoke('articles:getAll', options),
    getById: (id: number) => ipcRenderer.invoke('articles:getById', id),
    markRead: (id: number) => ipcRenderer.invoke('articles:markRead', id),
    toggleFavorite: (id: number) => ipcRenderer.invoke('articles:toggleFavorite', id),
    getCount: (feedId?: number) => ipcRenderer.invoke('articles:getCount', feedId)
  },

  analyses: {
    getByArticle: (articleId: number) => ipcRenderer.invoke('analyses:getByArticle', articleId),
    getRecent: (limit?: number) => ipcRenderer.invoke('analyses:getRecent', limit),
    getByType: (type: string, limit?: number) => ipcRenderer.invoke('analyses:getByType', type, limit),
    getCount: () => ipcRenderer.invoke('analyses:getCount')
  },

  notes: {
    getByArticle: (articleId: number) => ipcRenderer.invoke('notes:getByArticle', articleId),
    add: (articleId: number, content: string) => ipcRenderer.invoke('notes:add', articleId, content),
    update: (id: number, content: string) => ipcRenderer.invoke('notes:update', id, content),
    delete: (id: number) => ipcRenderer.invoke('notes:delete', id)
  },

  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    delete: (key: string) => ipcRenderer.invoke('settings:delete', key)
  },

  llm: {
    analyzeArticle: (articleId: number) => ipcRenderer.invoke('llm:analyzeArticle', articleId),
    analyzeSentiment: (articleId: number) => ipcRenderer.invoke('llm:analyzeSentiment', articleId),
    generateReport: (articleIds: number[]) => ipcRenderer.invoke('llm:generateReport', articleIds),
    testConnection: () => ipcRenderer.invoke('llm:testConnection')
  }
})
```

- [ ] **Step 8: Update electron/main.ts**

```typescript
import { app, BrowserWindow } from 'electron'
import path from 'path'
import { getDatabase, closeDatabase } from './db/database'
import { registerFeedHandlers } from './ipc/feeds'
import { registerArticleHandlers } from './ipc/articles'
import { registerAnalysisHandlers } from './ipc/analyses'
import { registerNoteHandlers } from './ipc/notes'
import { registerSettingsHandlers } from './ipc/settings'
import { registerLLMHandlers } from './ipc/llm'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'))
  }
}

app.whenReady().then(() => {
  getDatabase()
  registerFeedHandlers()
  registerArticleHandlers()
  registerAnalysisHandlers()
  registerNoteHandlers()
  registerSettingsHandlers()
  registerLLMHandlers()
  createWindow()
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
```

- [ ] **Step 9: Test IPC communication**

```bash
npm run dev
```

Expected: App launches without errors. Open DevTools and verify the preload bridge is available.

- [ ] **Step 10: Commit**

```bash
git add electron/ipc electron/preload.ts electron/main.ts
git commit -m "feat: add IPC handlers for all database and LLM operations"
```

---

## Task 6: i18n Setup

**Covers:** S4

**Files:**
- Create: `src/i18n/index.ts`, `src/i18n/zh.json`, `src/i18n/en.json`

- [ ] **Step 1: Create src/i18n/zh.json**

```json
{
  "app": {
    "title": "金融 RSS 分析器"
  },
  "nav": {
    "feeds": "订阅源",
    "articles": "文章",
    "favorites": "收藏",
    "analysis": "分析",
    "settings": "设置"
  },
  "feeds": {
    "title": "订阅源管理",
    "add": "添加订阅源",
    "url": "RSS 地址",
    "type": "类型",
    "typeRss": "普通 RSS",
    "typeDxtools": "dxtools 聚合源",
    "status": "状态",
    "active": "已启用",
    "inactive": "已禁用",
    "lastFetched": "上次抓取",
    "fetchNow": "立即抓取",
    "delete": "删除",
    "edit": "编辑",
    "save": "保存",
    "cancel": "取消"
  },
  "articles": {
    "title": "文章列表",
    "all": "全部",
    "unread": "未读",
    "favorites": "收藏",
    "noArticles": "暂无文章",
    "readMore": "阅读原文",
    "markRead": "标记已读",
    "addFavorite": "收藏",
    "removeFavorite": "取消收藏"
  },
  "analysis": {
    "title": "分析仪表盘",
    "insights": "关键洞察",
    "sentiment": "情绪分析",
    "report": "综合报告",
    "analyze": "开始分析",
    "analyzing": "分析中...",
    "noAnalysis": "暂无分析结果",
    "generateReport": "生成报告",
    "bullish": "看涨",
    "bearish": "看跌",
    "neutral": "中性",
    "confidence": "置信度",
    "keyPoints": "关键要点",
    "assets": "涉及资产",
    "reasoning": "分析理由"
  },
  "settings": {
    "title": "设置",
    "llm": "大模型配置",
    "baseUrl": "API 地址",
    "apiKey": "API Key",
    "model": "模型名称",
    "testConnection": "测试连接",
    "connectionSuccess": "连接成功",
    "connectionFailed": "连接失败",
    "fetchInterval": "抓取间隔（分钟）",
    "autoAnalyze": "自动分析",
    "language": "语言",
    "chinese": "中文",
    "english": "English",
    "save": "保存设置",
    "saved": "已保存"
  },
  "common": {
    "loading": "加载中...",
    "error": "错误",
    "retry": "重试",
    "confirm": "确认",
    "cancel": "取消",
    "delete": "删除",
    "save": "保存",
    "edit": "编辑"
  }
}
```

- [ ] **Step 2: Create src/i18n/en.json**

```json
{
  "app": {
    "title": "Financial RSS Analyzer"
  },
  "nav": {
    "feeds": "Feeds",
    "articles": "Articles",
    "favorites": "Favorites",
    "analysis": "Analysis",
    "settings": "Settings"
  },
  "feeds": {
    "title": "Feed Management",
    "add": "Add Feed",
    "url": "RSS URL",
    "type": "Type",
    "typeRss": "Standard RSS",
    "typeDxtools": "dxtools Aggregated",
    "status": "Status",
    "active": "Active",
    "inactive": "Inactive",
    "lastFetched": "Last Fetched",
    "fetchNow": "Fetch Now",
    "delete": "Delete",
    "edit": "Edit",
    "save": "Save",
    "cancel": "Cancel"
  },
  "articles": {
    "title": "Article List",
    "all": "All",
    "unread": "Unread",
    "favorites": "Favorites",
    "noArticles": "No articles yet",
    "readMore": "Read More",
    "markRead": "Mark as Read",
    "addFavorite": "Favorite",
    "removeFavorite": "Unfavorite"
  },
  "analysis": {
    "title": "Analysis Dashboard",
    "insights": "Key Insights",
    "sentiment": "Sentiment Analysis",
    "report": "Comprehensive Report",
    "analyze": "Analyze",
    "analyzing": "Analyzing...",
    "noAnalysis": "No analysis results yet",
    "generateReport": "Generate Report",
    "bullish": "Bullish",
    "bearish": "Bearish",
    "neutral": "Neutral",
    "confidence": "Confidence",
    "keyPoints": "Key Points",
    "assets": "Assets Mentioned",
    "reasoning": "Reasoning"
  },
  "settings": {
    "title": "Settings",
    "llm": "LLM Configuration",
    "baseUrl": "API Base URL",
    "apiKey": "API Key",
    "model": "Model Name",
    "testConnection": "Test Connection",
    "connectionSuccess": "Connection successful",
    "connectionFailed": "Connection failed",
    "fetchInterval": "Fetch Interval (minutes)",
    "autoAnalyze": "Auto Analyze",
    "language": "Language",
    "chinese": "中文",
    "english": "English",
    "save": "Save Settings",
    "saved": "Saved"
  },
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "retry": "Retry",
    "confirm": "Confirm",
    "cancel": "Cancel",
    "delete": "Delete",
    "save": "Save",
    "edit": "Edit"
  }
}
```

- [ ] **Step 3: Create src/i18n/index.ts**

```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zh from './zh.json'
import en from './en.json'

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en }
  },
  lng: 'zh',
  fallbackLng: 'zh',
  interpolation: {
    escapeValue: false
  }
})

export default i18n
```

- [ ] **Step 4: Commit**

```bash
git add src/i18n
git commit -m "feat: add i18n with Chinese and English translations"
```

---

## Task 7: Frontend Stores (Zustand)

**Covers:** S1

**Files:**
- Create: `src/stores/feedStore.ts`, `src/stores/articleStore.ts`, `src/stores/analysisStore.ts`, `src/stores/settingsStore.ts`
- Create: `src/hooks/useIPC.ts`

- [ ] **Step 1: Create src/hooks/useIPC.ts**

```typescript
import { useState, useEffect, useCallback } from 'react'

export function useIPC<T>(channel: string, ...args: any[]): {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => void
} {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const api = (window as any).electronAPI
      const keys = channel.split('.')
      let method = api
      for (const key of keys) {
        method = method[key]
      }
      const result = await method(...args)
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [channel, ...args])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
```

- [ ] **Step 2: Create src/stores/feedStore.ts**

```typescript
import { create } from 'zustand'
import type { Feed } from '../types'

interface FeedStore {
  feeds: Feed[]
  loading: boolean
  error: string | null
  loadFeeds: () => Promise<void>
  addFeed: (url: string, sourceType: 'rss' | 'dxtools') => Promise<void>
  updateFeed: (id: number, title: string, url: string, isActive: boolean) => Promise<void>
  deleteFeed: (id: number) => Promise<void>
  fetchFeed: (feedId: number) => Promise<number>
  fetchAllActive: () => Promise<number>
}

export const useFeedStore = create<FeedStore>((set, get) => ({
  feeds: [],
  loading: false,
  error: null,

  loadFeeds: async () => {
    set({ loading: true, error: null })
    try {
      const feeds = await (window as any).electronAPI.feeds.getAll()
      set({ feeds, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  addFeed: async (url, sourceType) => {
    try {
      await (window as any).electronAPI.feeds.add(url, sourceType)
      await get().loadFeeds()
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  updateFeed: async (id, title, url, isActive) => {
    try {
      await (window as any).electronAPI.feeds.update(id, title, url, isActive)
      await get().loadFeeds()
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  deleteFeed: async (id) => {
    try {
      await (window as any).electronAPI.feeds.delete(id)
      await get().loadFeeds()
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  fetchFeed: async (feedId) => {
    try {
      const newCount = await (window as any).electronAPI.feeds.fetch(feedId)
      return newCount
    } catch (error) {
      set({ error: (error as Error).message })
      return 0
    }
  },

  fetchAllActive: async () => {
    try {
      const newCount = await (window as any).electronAPI.feeds.fetchActive()
      return newCount
    } catch (error) {
      set({ error: (error as Error).message })
      return 0
    }
  }
}))
```

- [ ] **Step 3: Create src/stores/articleStore.ts**

```typescript
import { create } from 'zustand'
import type { Article } from '../types'

interface ArticleStore {
  articles: Article[]
  currentArticle: Article | null
  loading: boolean
  error: string | null
  loadArticles: (options?: { feedId?: number; isFavorite?: boolean }) => Promise<void>
  loadArticle: (id: number) => Promise<void>
  markRead: (id: number) => Promise<void>
  toggleFavorite: (id: number) => Promise<void>
}

export const useArticleStore = create<ArticleStore>((set, get) => ({
  articles: [],
  currentArticle: null,
  loading: false,
  error: null,

  loadArticles: async (options) => {
    set({ loading: true, error: null })
    try {
      const articles = await (window as any).electronAPI.articles.getAll(options)
      set({ articles, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  loadArticle: async (id) => {
    set({ loading: true, error: null })
    try {
      const article = await (window as any).electronAPI.articles.getById(id)
      set({ currentArticle: article, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  markRead: async (id) => {
    try {
      await (window as any).electronAPI.articles.markRead(id)
      set(state => ({
        articles: state.articles.map(a => a.id === id ? { ...a, is_read: 1 } : a),
        currentArticle: state.currentArticle?.id === id
          ? { ...state.currentArticle, is_read: 1 }
          : state.currentArticle
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  toggleFavorite: async (id) => {
    try {
      const updated = await (window as any).electronAPI.articles.toggleFavorite(id)
      set(state => ({
        articles: state.articles.map(a => a.id === id ? updated : a),
        currentArticle: state.currentArticle?.id === id ? updated : state.currentArticle
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  }
}))
```

- [ ] **Step 4: Create src/stores/analysisStore.ts**

```typescript
import { create } from 'zustand'
import type { Analysis, AnalysisResult, ReportResult } from '../types'

interface AnalysisStore {
  analyses: Analysis[]
  currentAnalysis: AnalysisResult | null
  currentReport: ReportResult | null
  loading: boolean
  error: string | null
  loadAnalyses: (articleId: number) => Promise<void>
  analyzeArticle: (articleId: number) => Promise<void>
  analyzeSentiment: (articleId: number) => Promise<void>
  generateReport: (articleIds: number[]) => Promise<void>
}

export const useAnalysisStore = create<AnalysisStore>((set) => ({
  analyses: [],
  currentAnalysis: null,
  currentReport: null,
  loading: false,
  error: null,

  loadAnalyses: async (articleId) => {
    set({ loading: true, error: null })
    try {
      const analyses = await (window as any).electronAPI.analyses.getByArticle(articleId)
      set({ analyses, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  analyzeArticle: async (articleId) => {
    set({ loading: true, error: null, currentAnalysis: null })
    try {
      const result = await (window as any).electronAPI.llm.analyzeArticle(articleId)
      set({ currentAnalysis: result, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  analyzeSentiment: async (articleId) => {
    set({ loading: true, error: null, currentAnalysis: null })
    try {
      const result = await (window as any).electronAPI.llm.analyzeSentiment(articleId)
      set({ currentAnalysis: result, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  generateReport: async (articleIds) => {
    set({ loading: true, error: null, currentReport: null })
    try {
      const result = await (window as any).electronAPI.llm.generateReport(articleIds)
      set({ currentReport: result, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  }
}))
```

- [ ] **Step 5: Create src/stores/settingsStore.ts**

```typescript
import { create } from 'zustand'
import type { LLMConfig } from '../types'

interface SettingsStore {
  llmConfig: LLMConfig
  fetchInterval: number
  autoAnalyze: boolean
  language: string
  loading: boolean
  loadSettings: () => Promise<void>
  saveLLMConfig: (config: LLMConfig) => Promise<void>
  saveFetchInterval: (interval: number) => Promise<void>
  saveAutoAnalyze: (auto: boolean) => Promise<void>
  saveLanguage: (lang: string) => Promise<void>
  testConnection: () => Promise<boolean>
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  llmConfig: { baseUrl: '', apiKey: '', model: '' },
  fetchInterval: 30,
  autoAnalyze: false,
  language: 'zh',
  loading: false,

  loadSettings: async () => {
    set({ loading: true })
    try {
      const api = (window as any).electronAPI.settings
      const [baseUrl, apiKey, model, interval, auto, lang] = await Promise.all([
        api.get('llm_baseUrl'),
        api.get('llm_apiKey'),
        api.get('llm_model'),
        api.get('fetchInterval'),
        api.get('autoAnalyze'),
        api.get('language')
      ])

      set({
        llmConfig: {
          baseUrl: baseUrl || '',
          apiKey: apiKey || '',
          model: model || ''
        },
        fetchInterval: parseInt(interval) || 30,
        autoAnalyze: auto === 'true',
        language: lang || 'zh',
        loading: false
      })
    } catch (error) {
      set({ loading: false })
    }
  },

  saveLLMConfig: async (config) => {
    const api = (window as any).electronAPI.settings
    await api.set('llm_baseUrl', config.baseUrl)
    await api.set('llm_apiKey', config.apiKey)
    await api.set('llm_model', config.model)
    set({ llmConfig: config })
  },

  saveFetchInterval: async (interval) => {
    await (window as any).electronAPI.settings.set('fetchInterval', interval.toString())
    set({ fetchInterval: interval })
  },

  saveAutoAnalyze: async (auto) => {
    await (window as any).electronAPI.settings.set('autoAnalyze', auto.toString())
    set({ autoAnalyze: auto })
  },

  saveLanguage: async (lang) => {
    await (window as any).electronAPI.settings.set('language', lang)
    set({ language: lang })
  },

  testConnection: async () => {
    try {
      return await (window as any).electronAPI.llm.testConnection()
    } catch {
      return false
    }
  }
}))
```

- [ ] **Step 6: Commit**

```bash
git add src/stores src/hooks
git commit -m "feat: add Zustand stores and IPC hooks for frontend state"
```

---

## Task 8: Frontend Components & Layout

**Covers:** S4

**Files:**
- Create: `src/components/Layout.tsx`, `src/components/Sidebar.tsx`, `src/components/LanguageSwitch.tsx`

- [ ] **Step 1: Create src/components/Layout.tsx**

```typescript
import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

interface LayoutProps {
  children: ReactNode
  currentPage: string
  onNavigate: (page: string) => void
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Create src/components/Sidebar.tsx**

```typescript
import { useTranslation } from 'react-i18next'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { t } = useTranslation()

  const navItems = [
    { key: 'feeds', icon: '📰', label: t('nav.feeds') },
    { key: 'articles', icon: '📄', label: t('nav.articles') },
    { key: 'favorites', icon: '⭐', label: t('nav.favorites') },
    { key: 'analysis', icon: '📊', label: t('nav.analysis') },
    { key: 'settings', icon: '⚙️', label: t('nav.settings') }
  ]

  return (
    <aside className="w-48 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white">{t('app.title')}</h1>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map(item => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md mb-1 transition-colors ${
              currentPage === item.key
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 3: Create src/components/LanguageSwitch.tsx**

```typescript
import { useTranslation } from 'react-i18next'

export function LanguageSwitch() {
  const { i18n } = useTranslation()

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh'
    i18n.changeLanguage(newLang)
  }

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300"
    >
      {i18n.language === 'zh' ? 'English' : '中文'}
    </button>
  )
}
```

- [ ] **Step 4: Update src/App.tsx**

```typescript
import { useState, useEffect } from 'react'
import { Layout } from './components/Layout'
import { FeedPage } from './pages/FeedPage'
import { ArticleListPage } from './pages/ArticleListPage'
import { ArticleDetailPage } from './pages/ArticleDetailPage'
import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'
import { useSettingsStore } from './stores/settingsStore'
import { useTranslation } from 'react-i18next'

function App() {
  const [currentPage, setCurrentPage] = useState('articles')
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null)
  const { loadSettings } = useSettingsStore()
  const { i18n } = useTranslation()

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    const savedLang = useSettingsStore.getState().language
    if (savedLang) i18n.changeLanguage(savedLang)
  }, [])

  const handleNavigate = (page: string) => {
    setCurrentPage(page)
    if (page !== 'articleDetail') setSelectedArticleId(null)
  }

  const handleArticleSelect = (id: number) => {
    setSelectedArticleId(id)
    setCurrentPage('articleDetail')
  }

  const renderPage = () => {
    if (currentPage === 'articleDetail' && selectedArticleId) {
      return <ArticleDetailPage articleId={selectedArticleId} onBack={() => handleNavigate('articles')} />
    }

    switch (currentPage) {
      case 'feeds':
        return <FeedPage />
      case 'articles':
        return <ArticleListPage onArticleSelect={handleArticleSelect} />
      case 'favorites':
        return <ArticleListPage favoritesOnly onArticleSelect={handleArticleSelect} />
      case 'analysis':
        return <DashboardPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <ArticleListPage onArticleSelect={handleArticleSelect} />
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {renderPage()}
    </Layout>
  )
}

export default App
```

- [ ] **Step 5: Create placeholder pages**

Create `src/pages/FeedPage.tsx`:
```typescript
import { useTranslation } from 'react-i18next'

export function FeedPage() {
  const { t } = useTranslation()
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">{t('feeds.title')}</h2>
      <p className="text-gray-400">Feed management - coming soon</p>
    </div>
  )
}
```

Create `src/pages/ArticleListPage.tsx`:
```typescript
import { useTranslation } from 'react-i18next'

interface Props {
  favoritesOnly?: boolean
  onArticleSelect: (id: number) => void
}

export function ArticleListPage({ favoritesOnly, onArticleSelect }: Props) {
  const { t } = useTranslation()
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">
        {favoritesOnly ? t('nav.favorites') : t('articles.title')}
      </h2>
      <p className="text-gray-400">Article list - coming soon</p>
    </div>
  )
}
```

Create `src/pages/ArticleDetailPage.tsx`:
```typescript
import { useTranslation } from 'react-i18next'

interface Props {
  articleId: number
  onBack: () => void
}

export function ArticleDetailPage({ articleId, onBack }: Props) {
  const { t } = useTranslation()
  return (
    <div className="p-6">
      <button onClick={onBack} className="mb-4 text-blue-400">← Back</button>
      <h2 className="text-2xl font-bold mb-4">Article #{articleId}</h2>
      <p className="text-gray-400">Article detail - coming soon</p>
    </div>
  )
}
```

Create `src/pages/DashboardPage.tsx`:
```typescript
import { useTranslation } from 'react-i18next'

export function DashboardPage() {
  const { t } = useTranslation()
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">{t('analysis.title')}</h2>
      <p className="text-gray-400">Analysis dashboard - coming soon</p>
    </div>
  )
}
```

Create `src/pages/SettingsPage.tsx`:
```typescript
import { useTranslation } from 'react-i18next'

export function SettingsPage() {
  const { t } = useTranslation()
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">{t('settings.title')}</h2>
      <p className="text-gray-400">Settings - coming soon</p>
    </div>
  )
}
```

- [ ] **Step 6: Test the UI**

```bash
npm run dev
```

Expected: App shows three-column layout with sidebar navigation. Clicking nav items changes the content area.

- [ ] **Step 7: Commit**

```bash
git add src/components src/pages src/App.tsx
git commit -m "feat: add layout, sidebar, and placeholder pages"
```

---

## Task 9: Feed Management Page

**Covers:** S3, S4

**Files:**
- Create: `src/components/FeedForm.tsx`
- Modify: `src/pages/FeedPage.tsx`

- [ ] **Step 1: Create src/components/FeedForm.tsx**

```typescript
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface FeedFormProps {
  onSubmit: (url: string, sourceType: 'rss' | 'dxtools') => void
  onCancel: () => void
}

export function FeedForm({ onSubmit, onCancel }: FeedFormProps) {
  const { t } = useTranslation()
  const [url, setUrl] = useState('')
  const [sourceType, setSourceType] = useState<'rss' | 'dxtools'>('rss')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      onSubmit(url.trim(), sourceType)
      setUrl('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-lg">
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">{t('feeds.url')}</label>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://example.com/feed.xml"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">{t('feeds.type')}</label>
        <select
          value={sourceType}
          onChange={e => setSourceType(e.target.value as 'rss' | 'dxtools')}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
        >
          <option value="rss">{t('feeds.typeRss')}</option>
          <option value="dxtools">{t('feeds.typeDxtools')}</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md">
          {t('feeds.add')}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md">
          {t('feeds.cancel')}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Rewrite src/pages/FeedPage.tsx**

```typescript
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFeedStore } from '../stores/feedStore'
import { FeedForm } from '../components/FeedForm'

export function FeedPage() {
  const { t } = useTranslation()
  const { feeds, loading, loadFeeds, addFeed, deleteFeed, fetchFeed, fetchAllActive } = useFeedStore()
  const [showForm, setShowForm] = useState(false)
  const [fetching, setFetching] = useState<number | null>(null)

  useEffect(() => {
    loadFeeds()
  }, [])

  const handleAdd = async (url: string, sourceType: 'rss' | 'dxtools') => {
    await addFeed(url, sourceType)
    setShowForm(false)
  }

  const handleFetch = async (feedId: number) => {
    setFetching(feedId)
    try {
      await fetchFeed(feedId)
    } finally {
      setFetching(null)
    }
  }

  const handleFetchAll = async () => {
    setFetching(-1)
    try {
      await fetchAllActive()
    } finally {
      setFetching(null)
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{t('feeds.title')}</h2>
        <div className="flex gap-2">
          <button
            onClick={handleFetchAll}
            disabled={fetching !== null}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-md"
          >
            {fetching === -1 ? t('common.loading') : t('feeds.fetchNow')}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            {t('feeds.add')}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6">
          <FeedForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {loading ? (
        <p className="text-gray-400">{t('common.loading')}</p>
      ) : feeds.length === 0 ? (
        <p className="text-gray-400">{t('articles.noArticles')}</p>
      ) : (
        <div className="space-y-2">
          {feeds.map(feed => (
            <div key={feed.id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
              <div>
                <h3 className="font-medium">{feed.title}</h3>
                <p className="text-sm text-gray-400">{feed.url}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs px-2 py-1 bg-gray-700 rounded">
                    {feed.source_type === 'dxtools' ? t('feeds.typeDxtools') : t('feeds.typeRss')}
                  </span>
                  <span className="text-xs px-2 py-1 bg-gray-700 rounded">
                    {feed.is_active ? t('feeds.active') : t('feeds.inactive')}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFetch(feed.id)}
                  disabled={fetching !== null}
                  className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded"
                >
                  {fetching === feed.id ? '...' : '↓'}
                </button>
                <button
                  onClick={() => deleteFeed(feed.id)}
                  className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded"
                >
                  {t('feeds.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Test feed management**

```bash
npm run dev
```

Expected: Can add RSS feeds, see them listed, fetch articles, and delete feeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/FeedForm.tsx src/pages/FeedPage.tsx
git commit -m "feat: add feed management page with add/delete/fetch"
```

---

## Task 10: Article List & Detail Pages

**Covers:** S4

**Files:**
- Create: `src/components/ArticleCard.tsx`, `src/components/InsightPanel.tsx`, `src/components/SentimentPanel.tsx`, `src/components/NotesPanel.tsx`, `src/components/ReportPanel.tsx`
- Modify: `src/pages/ArticleListPage.tsx`, `src/pages/ArticleDetailPage.tsx`

- [ ] **Step 1: Create src/components/ArticleCard.tsx**

```typescript
import { useTranslation } from 'react-i18next'
import type { Article } from '../types'

interface Props {
  article: Article
  onClick: () => void
}

export function ArticleCard({ article, onClick }: Props) {
  const { t } = useTranslation()
  const date = article.published_at ? new Date(article.published_at).toLocaleDateString() : ''

  return (
    <div
      onClick={onClick}
      className={`bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors border-l-4 ${
        article.is_read ? 'border-gray-600' : 'border-blue-500'
      }`}
    >
      <div className="flex justify-between items-start">
        <h3 className={`font-medium ${article.is_read ? 'text-gray-400' : 'text-white'}`}>
          {article.title}
        </h3>
        {article.is_favorite ? <span className="text-yellow-400">★</span> : null}
      </div>
      <p className="text-sm text-gray-500 mt-1">{date}</p>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite src/pages/ArticleListPage.tsx**

```typescript
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useArticleStore } from '../stores/articleStore'
import { useFeedStore } from '../stores/feedStore'
import { ArticleCard } from '../components/ArticleCard'

interface Props {
  favoritesOnly?: boolean
  onArticleSelect: (id: number) => void
}

export function ArticleListPage({ favoritesOnly, onArticleSelect }: Props) {
  const { t } = useTranslation()
  const { articles, loading, loadArticles } = useArticleStore()
  const { feeds, loadFeeds } = useFeedStore()
  const [feedFilter, setFeedFilter] = useState<number | undefined>()
  const [readFilter, setReadFilter] = useState<boolean | undefined>()

  useEffect(() => {
    loadFeeds()
  }, [])

  useEffect(() => {
    loadArticles({
      feedId: feedFilter,
      isFavorite: favoritesOnly || undefined,
      isRead: readFilter
    })
  }, [feedFilter, readFilter, favoritesOnly])

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">
          {favoritesOnly ? t('nav.favorites') : t('articles.title')}
        </h2>
        <div className="flex gap-2">
          <select
            value={feedFilter ?? ''}
            onChange={e => setFeedFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
          >
            <option value="">{t('articles.all')}</option>
            {feeds.map(f => (
              <option key={f.id} value={f.id}>{f.title}</option>
            ))}
          </select>
          {!favoritesOnly && (
            <select
              value={readFilter === undefined ? '' : readFilter ? 'read' : 'unread'}
              onChange={e => {
                if (e.target.value === '') setReadFilter(undefined)
                else setReadFilter(e.target.value === 'read')
              }}
              className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
            >
              <option value="">{t('articles.all')}</option>
              <option value="unread">{t('articles.unread')}</option>
              <option value="read">已读</option>
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">{t('common.loading')}</p>
      ) : articles.length === 0 ? (
        <p className="text-gray-400">{t('articles.noArticles')}</p>
      ) : (
        <div className="space-y-2">
          {articles.map(article => (
            <ArticleCard
              key={article.id}
              article={article}
              onClick={() => onArticleSelect(article.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create src/components/InsightPanel.tsx**

```typescript
import { useTranslation } from 'react-i18next'
import type { AnalysisResult } from '../types'

interface Props {
  result: AnalysisResult
}

export function InsightPanel({ result }: Props) {
  const { t } = useTranslation()

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="font-bold mb-3">{t('analysis.insights')}</h3>
      <p className="text-gray-300 mb-3">{result.summary}</p>
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-400 mb-1">{t('analysis.keyPoints')}</h4>
        <ul className="list-disc list-inside space-y-1">
          {result.keyPoints.map((point, i) => (
            <li key={i} className="text-gray-300 text-sm">{point}</li>
          ))}
        </ul>
      </div>
      {result.assets.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-1">{t('analysis.assets')}</h4>
          <div className="flex flex-wrap gap-1">
            {result.assets.map((asset, i) => (
              <span key={i} className="px-2 py-1 bg-gray-700 rounded text-xs">{asset}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create src/components/SentimentPanel.tsx**

```typescript
import { useTranslation } from 'react-i18next'
import type { AnalysisResult } from '../types'

interface Props {
  result: AnalysisResult
}

const sentimentColors: Record<string, string> = {
  bullish: 'text-green-400',
  bearish: 'text-red-400',
  neutral: 'text-yellow-400'
}

export function SentimentPanel({ result }: Props) {
  const { t } = useTranslation()

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="font-bold mb-3">{t('analysis.sentiment')}</h3>
      <div className="flex items-center gap-4 mb-3">
        <span className={`text-2xl font-bold ${sentimentColors[result.sentiment]}`}>
          {t(`analysis.${result.sentiment}`)}
        </span>
        <div className="flex-1">
          <div className="text-sm text-gray-400">{t('analysis.confidence')}</div>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${result.confidence * 100}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">{Math.round(result.confidence * 100)}%</div>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-1">{t('analysis.reasoning')}</h4>
        <p className="text-gray-300 text-sm">{result.reasoning}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create src/components/NotesPanel.tsx**

```typescript
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Note } from '../types'

interface Props {
  articleId: number
}

export function NotesPanel({ articleId }: Props) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')

  useEffect(() => {
    loadNotes()
  }, [articleId])

  const loadNotes = async () => {
    const result = await (window as any).electronAPI.notes.getByArticle(articleId)
    setNotes(result)
  }

  const handleAdd = async () => {
    if (!newNote.trim()) return
    await (window as any).electronAPI.notes.add(articleId, newNote.trim())
    setNewNote('')
    loadNotes()
  }

  const handleDelete = async (id: number) => {
    await (window as any).electronAPI.notes.delete(id)
    loadNotes()
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="font-bold mb-3">{t('nav.notes')}</h3>
      <div className="mb-3">
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Add a note..."
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
          rows={3}
        />
        <button
          onClick={handleAdd}
          className="mt-2 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded"
        >
          {t('common.save')}
        </button>
      </div>
      <div className="space-y-2">
        {notes.map(note => (
          <div key={note.id} className="bg-gray-700 p-2 rounded text-sm">
            <p className="text-gray-300">{note.content}</p>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500">
                {new Date(note.created_at).toLocaleString()}
              </span>
              <button
                onClick={() => handleDelete(note.id)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create src/components/ReportPanel.tsx**

```typescript
import { useTranslation } from 'react-i18next'
import type { ReportResult } from '../types'

interface Props {
  report: ReportResult
}

export function ReportPanel({ report }: Props) {
  const { t } = useTranslation()

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="font-bold mb-2">{report.title}</h3>
      <p className="text-gray-300 mb-3">{report.summary}</p>
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-400 mb-1">Key Themes</h4>
        <div className="flex flex-wrap gap-1">
          {report.keyThemes.map((theme, i) => (
            <span key={i} className="px-2 py-1 bg-gray-700 rounded text-xs">{theme}</span>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-1">Market Outlook</h4>
        <p className="text-gray-300 text-sm">{report.marketOutlook}</p>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Based on {report.articlesAnalyzed} articles
      </p>
    </div>
  )
}
```

- [ ] **Step 7: Rewrite src/pages/ArticleDetailPage.tsx**

```typescript
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useArticleStore } from '../stores/articleStore'
import { useAnalysisStore } from '../stores/analysisStore'
import { InsightPanel } from '../components/InsightPanel'
import { SentimentPanel } from '../components/SentimentPanel'
import { NotesPanel } from '../components/NotesPanel'

interface Props {
  articleId: number
  onBack: () => void
}

export function ArticleDetailPage({ articleId, onBack }: Props) {
  const { t } = useTranslation()
  const { currentArticle, loadArticle, markRead, toggleFavorite } = useArticleStore()
  const { analyses, currentAnalysis, loading: analyzing, loadAnalyses, analyzeArticle, analyzeSentiment } = useAnalysisStore()

  useEffect(() => {
    loadArticle(articleId)
    loadAnalyses(articleId)
    markRead(articleId)
  }, [articleId])

  const latestInsight = analyses.find(a => a.analysis_type === 'insight')
  const latestSentiment = analyses.find(a => a.analysis_type === 'sentiment')

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onBack} className="text-blue-400 hover:text-blue-300">
            ← {t('common.cancel')}
          </button>
          <button
            onClick={() => toggleFavorite(articleId)}
            className={currentArticle?.is_favorite ? 'text-yellow-400' : 'text-gray-500'}
          >
            {currentArticle?.is_favorite ? '★' : '☆'}
          </button>
        </div>

        {currentArticle && (
          <>
            <h1 className="text-2xl font-bold mb-2">{currentArticle.title}</h1>
            <p className="text-sm text-gray-500 mb-4">
              {currentArticle.published_at ? new Date(currentArticle.published_at).toLocaleString() : ''}
            </p>
            <div className="prose prose-invert max-w-none">
              {currentArticle.content || <p className="text-gray-500">No content available</p>}
            </div>
          </>
        )}
      </div>

      <div className="w-96 bg-gray-900 border-l border-gray-700 p-4 overflow-auto">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => analyzeArticle(articleId)}
            disabled={analyzing}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm"
          >
            {analyzing ? t('analysis.analyzing') : t('analysis.analyze')}
          </button>
          <button
            onClick={() => analyzeSentiment(articleId)}
            disabled={analyzing}
            className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded text-sm"
          >
            {analyzing ? '...' : t('analysis.sentiment')}
          </button>
        </div>

        <div className="space-y-4">
          {currentAnalysis && 'keyPoints' in currentAnalysis && (
            <>
              <InsightPanel result={currentAnalysis} />
              <SentimentPanel result={currentAnalysis} />
            </>
          )}

          {latestInsight && !currentAnalysis && (
            <InsightPanel result={JSON.parse(latestInsight.result)} />
          )}
          {latestSentiment && !currentAnalysis && (
            <SentimentPanel result={JSON.parse(latestSentiment.result)} />
          )}

          {!currentAnalysis && !latestInsight && !latestSentiment && (
            <p className="text-gray-500 text-center">{t('analysis.noAnalysis')}</p>
          )}

          <NotesPanel articleId={articleId} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Test article pages**

```bash
npm run dev
```

Expected: Articles list shows fetched articles. Clicking opens detail with analysis panel. Can trigger analysis and add notes.

- [ ] **Step 9: Commit**

```bash
git add src/components src/pages
git commit -m "feat: add article list, detail page with analysis panels and notes"
```

---

## Task 11: Analysis Dashboard & Charts

**Covers:** S4

**Files:**
- Create: `src/components/SentimentChart.tsx`, `src/components/AssetFrequencyChart.tsx`, `src/components/SentimentPieChart.tsx`
- Modify: `src/pages/DashboardPage.tsx`

- [ ] **Step 1: Create src/components/SentimentChart.tsx**

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DataPoint {
  date: string
  bullish: number
  bearish: number
  neutral: number
}

interface Props {
  data: DataPoint[]
}

export function SentimentChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#9CA3AF" />
        <YAxis stroke="#9CA3AF" />
        <Tooltip
          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
          labelStyle={{ color: '#F3F4F6' }}
        />
        <Line type="monotone" dataKey="bullish" stroke="#10B981" strokeWidth={2} />
        <Line type="monotone" dataKey="bearish" stroke="#EF4444" strokeWidth={2} />
        <Line type="monotone" dataKey="neutral" stroke="#F59E0B" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Create src/components/AssetFrequencyChart.tsx**

```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DataPoint {
  asset: string
  count: number
}

interface Props {
  data: DataPoint[]
}

export function AssetFrequencyChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="asset" stroke="#9CA3AF" />
        <YAxis stroke="#9CA3AF" />
        <Tooltip
          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
          labelStyle={{ color: '#F3F4F6' }}
        />
        <Bar dataKey="count" fill="#3B82F6" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 3: Create src/components/SentimentPieChart.tsx**

```typescript
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface DataPoint {
  name: string
  value: number
}

interface Props {
  data: DataPoint[]
}

const COLORS = ['#10B981', '#EF4444', '#F59E0B']

export function SentimentPieChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 4: Rewrite src/pages/DashboardPage.tsx**

```typescript
import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAnalysisStore } from '../stores/analysisStore'
import { SentimentChart } from '../components/SentimentChart'
import { AssetFrequencyChart } from '../components/AssetFrequencyChart'
import { SentimentPieChart } from '../components/SentimentPieChart'
import type { AnalysisResult } from '../types'

export function DashboardPage() {
  const { t } = useTranslation()
  const { analyses, loadAnalyses } = useAnalysisStore()
  const [selectedArticleIds, setSelectedArticleIds] = useState<number[]>([])
  const { generateReport, currentReport, loading: generatingReport } = useAnalysisStore()

  useEffect(() => {
    loadAnalyses(0)
  }, [])

  useEffect(() => {
    ;(async () => {
      const result = await (window as any).electronAPI.analyses.getRecent(100)
      useAnalysisStore.setState({ analyses: result })
    })()
  }, [])

  const sentimentData = useMemo(() => {
    const byDate: Record<string, { bullish: number; bearish: number; neutral: number }> = {}
    analyses.forEach(a => {
      if (a.analysis_type !== 'sentiment') return
      try {
        const result: AnalysisResult = JSON.parse(a.result)
        const date = new Date(a.created_at).toLocaleDateString()
        if (!byDate[date]) byDate[date] = { bullish: 0, bearish: 0, neutral: 0 }
        byDate[date][result.sentiment]++
      } catch {}
    })
    return Object.entries(byDate).map(([date, counts]) => ({ date, ...counts }))
  }, [analyses])

  const assetData = useMemo(() => {
    const counts: Record<string, number> = {}
    analyses.forEach(a => {
      try {
        const result: AnalysisResult = JSON.parse(a.result)
        result.assets?.forEach(asset => {
          counts[asset] = (counts[asset] || 0) + 1
        })
      } catch {}
    })
    return Object.entries(counts)
      .map(([asset, count]) => ({ asset, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [analyses])

  const sentimentPieData = useMemo(() => {
    let bullish = 0, bearish = 0, neutral = 0
    analyses.forEach(a => {
      if (a.analysis_type !== 'sentiment') return
      try {
        const result: AnalysisResult = JSON.parse(a.result)
        if (result.sentiment === 'bullish') bullish++
        else if (result.sentiment === 'bearish') bearish++
        else neutral++
      } catch {}
    })
    return [
      { name: t('analysis.bullish'), value: bullish },
      { name: t('analysis.bearish'), value: bearish },
      { name: t('analysis.neutral'), value: neutral }
    ]
  }, [analyses, t])

  const handleGenerateReport = async () => {
    if (selectedArticleIds.length === 0) return
    await generateReport(selectedArticleIds)
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">{t('analysis.title')}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="font-bold mb-3">Sentiment Trend</h3>
          {sentimentData.length > 0 ? (
            <SentimentChart data={sentimentData} />
          ) : (
            <p className="text-gray-500 text-center py-10">{t('analysis.noAnalysis')}</p>
          )}
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="font-bold mb-3">Sentiment Distribution</h3>
          {sentimentPieData.some(d => d.value > 0) ? (
            <SentimentPieChart data={sentimentPieData} />
          ) : (
            <p className="text-gray-500 text-center py-10">{t('analysis.noAnalysis')}</p>
          )}
        </div>

        <div className="bg-gray-800 p-4 rounded-lg lg:col-span-2">
          <h3 className="font-bold mb-3">Top Assets Mentioned</h3>
          {assetData.length > 0 ? (
            <AssetFrequencyChart data={assetData} />
          ) : (
            <p className="text-gray-500 text-center py-10">{t('analysis.noAnalysis')}</p>
          )}
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold">{t('analysis.report')}</h3>
          <button
            onClick={handleGenerateReport}
            disabled={generatingReport || selectedArticleIds.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm"
          >
            {generatingReport ? t('analysis.analyzing') : t('analysis.generateReport')}
          </button>
        </div>
        {currentReport ? (
          <div>
            <h4 className="font-medium mb-2">{currentReport.title}</h4>
            <p className="text-gray-300 mb-3">{currentReport.summary}</p>
            <p className="text-gray-300 text-sm">{currentReport.marketOutlook}</p>
          </div>
        ) : (
          <p className="text-gray-500">{t('analysis.noAnalysis')}</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Install recharts**

```bash
npm install recharts
```

- [ ] **Step 6: Test dashboard**

```bash
npm run dev
```

Expected: Dashboard shows charts (empty initially). After running analyses, charts populate with data.

- [ ] **Step 7: Commit**

```bash
git add src/components src/pages
git commit -m "feat: add analysis dashboard with sentiment charts and asset frequency"
```

---

## Task 12: Settings Page

**Covers:** S4

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Rewrite src/pages/SettingsPage.tsx**

```typescript
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../stores/settingsStore'
import { LanguageSwitch } from '../components/LanguageSwitch'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const {
    llmConfig, fetchInterval, autoAnalyze,
    loadSettings, saveLLMConfig, saveFetchInterval, saveAutoAnalyze, saveLanguage, testConnection
  } = useSettingsStore()

  const [baseUrl, setBaseUrl] = useState(llmConfig.baseUrl)
  const [apiKey, setApiKey] = useState(llmConfig.apiKey)
  const [model, setModel] = useState(llmConfig.model)
  const [interval, setInterval] = useState(fetchInterval)
  const [auto, setAuto] = useState(autoAnalyze)
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    setBaseUrl(llmConfig.baseUrl)
    setApiKey(llmConfig.apiKey)
    setModel(llmConfig.model)
    setInterval(fetchInterval)
    setAuto(autoAnalyze)
  }, [llmConfig, fetchInterval, autoAnalyze])

  const handleSaveLLM = async () => {
    setSaving(true)
    await saveLLMConfig({ baseUrl, apiKey, model })
    setSaving(false)
  }

  const handleSaveInterval = async () => {
    await saveFetchInterval(interval)
  }

  const handleSaveAuto = async () => {
    await saveAutoAnalyze(auto)
  }

  const handleTest = async () => {
    setTestResult(null)
    const result = await testConnection()
    setTestResult(result)
  }

  const handleLanguageChange = async (lang: string) => {
    i18n.changeLanguage(lang)
    await saveLanguage(lang)
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">{t('settings.title')}</h2>

      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h3 className="font-bold mb-4">{t('settings.llm')}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">{t('settings.baseUrl')}</label>
            <input
              type="url"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">{t('settings.apiKey')}</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">{t('settings.model')}</label>
            <input
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="gpt-4o-mini"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveLLM}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded"
            >
              {saving ? t('common.loading') : t('settings.save')}
            </button>
            <button
              onClick={handleTest}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
            >
              {t('settings.testConnection')}
            </button>
            {testResult !== null && (
              <span className={`self-center text-sm ${testResult ? 'text-green-400' : 'text-red-400'}`}>
                {testResult ? t('settings.connectionSuccess') : t('settings.connectionFailed')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h3 className="font-bold mb-4">RSS Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">{t('settings.fetchInterval')}</label>
            <input
              type="number"
              value={interval}
              onChange={e => setInterval(Number(e.target.value))}
              min={5}
              max={1440}
              className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            />
            <button
              onClick={handleSaveInterval}
              className="ml-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              {t('common.save')}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoAnalyze"
              checked={auto}
              onChange={e => {
                setAuto(e.target.checked)
                saveAutoAnalyze(e.target.checked)
              }}
              className="w-4 h-4"
            />
            <label htmlFor="autoAnalyze" className="text-sm">{t('settings.autoAnalyze')}</label>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="font-bold mb-4">{t('settings.language')}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleLanguageChange('zh')}
            className={`px-4 py-2 rounded ${i18n.language === 'zh' ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            {t('settings.chinese')}
          </button>
          <button
            onClick={() => handleLanguageChange('en')}
            className={`px-4 py-2 rounded ${i18n.language === 'en' ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            {t('settings.english')}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test settings page**

```bash
npm run dev
```

Expected: Settings page shows LLM config, fetch interval, auto-analyze toggle, and language switch. Changes persist across restarts.

- [ ] **Step 3: Commit**

```bash
git add src/pages/SettingsPage.tsx
git commit -m "feat: add settings page with LLM config, fetch interval, and language"
```

---

## Task 13: Scheduler & Auto-Fetch

**Covers:** S3

**Files:**
- Create: `electron/services/scheduler.ts`
- Modify: `electron/main.ts`

- [ ] **Step 1: Create electron/services/scheduler.ts**

```typescript
import { getActiveFeeds } from '../db/feeds'
import { getSetting } from '../db/settings'
import { fetchAndStoreFeed } from './rss'
import { BrowserWindow } from 'electron'

let schedulerInterval: NodeJS.Timeout | null = null

export function startScheduler() {
  stopScheduler()

  const intervalMinutes = parseInt(getSetting('fetchInterval') || '30')
  const intervalMs = intervalMinutes * 60 * 1000

  schedulerInterval = setInterval(async () => {
    console.log('Scheduler: fetching feeds...')
    const feeds = getActiveFeeds()
    let totalNew = 0

    for (const feed of feeds) {
      try {
        const newCount = await fetchAndStoreFeed(feed.id, feed.url, feed.source_type)
        totalNew += newCount
      } catch (error) {
        console.error(`Scheduler: failed to fetch ${feed.title}:`, error)
      }
    }

    if (totalNew > 0) {
      const windows = BrowserWindow.getAllWindows()
      windows.forEach(win => {
        win.webContents.send('feeds:newArticles', totalNew)
      })
    }

    console.log(`Scheduler: fetched ${totalNew} new articles`)
  }, intervalMs)

  console.log(`Scheduler started with ${intervalMinutes} minute interval`)
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
    console.log('Scheduler stopped')
  }
}

export function restartScheduler() {
  stopScheduler()
  startScheduler()
}
```

- [ ] **Step 2: Update electron/main.ts**

Add import and call `startScheduler()` after `createWindow()`:

```typescript
import { startScheduler, restartScheduler } from './services/scheduler'

// In app.whenReady():
createWindow()
startScheduler()

// Add IPC handler for restarting scheduler
ipcMain.on('scheduler:restart', () => {
  restartScheduler()
})
```

- [ ] **Step 3: Update electron/preload.ts**

Add to electronAPI:

```typescript
scheduler: {
  restart: () => ipcRenderer.send('scheduler:restart')
},
onNewArticles: (callback: (count: number) => void) => {
  ipcRenderer.on('feeds:newArticles', (_, count) => callback(count))
}
```

- [ ] **Step 4: Test scheduler**

```bash
npm run dev
```

Expected: Scheduler starts automatically. Feeds are fetched periodically based on settings.

- [ ] **Step 5: Commit**

```bash
git add electron/services/scheduler.ts electron/main.ts electron/preload.ts
git commit -m "feat: add periodic RSS fetch scheduler"
```

---

## Task 14: Final Integration & Build

**Covers:** S1, S5

**Files:**
- Modify: Various files for final polish

- [ ] **Step 1: Add electron-builder.json**

```json
{
  "appId": "com.moneyanalysis.app",
  "productName": "Financial RSS Analyzer",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist-electron/**/*",
    "dist/renderer/**/*"
  ],
  "mac": {
    "category": "public.app-category.finance",
    "target": "dmg"
  },
  "win": {
    "target": "nsis"
  },
  "linux": {
    "target": "AppImage"
  }
}
```

- [ ] **Step 2: Add build scripts to package.json**

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "build:mac": "electron-vite build && electron-builder --mac",
    "build:win": "electron-vite build && electron-builder --win",
    "build:linux": "electron-vite build && electron-builder --linux",
    "lint": "eslint src electron --ext .ts,.tsx"
  }
}
```

- [ ] **Step 3: Run full build test**

```bash
npm run build
```

Expected: Build completes without errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final integration, build config, and polish"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - S1 (Architecture) → Tasks 1, 5, 14 ✓
   - S2 (Data Model) → Task 2 ✓
   - S3 (RSS & LLM) → Tasks 3, 4, 5, 9, 13 ✓
   - S4 (UI Design) → Tasks 6, 7, 8, 9, 10, 11, 12 ✓
   - S5 (Error Handling) → Task 14 ✓
   - S6 (Feature Scope) → All tasks ✓

2. **Placeholder scan:** No TBD/TODO found. All steps have complete code.

3. **Type consistency:** Types defined in Task 2 used consistently throughout.

4. **All spec sections covered by at least one task.** ✓
