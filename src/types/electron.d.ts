import type { Feed, Article, Analysis, Note, Setting, AnalysisResult, ReportResult } from './types'

interface ElectronAPI {
  platform: string

  feeds: {
    getAll: () => Promise<Feed[]>
    add: (title: string, url: string, sourceType?: 'rss' | 'dxtools') => Promise<Feed>
    update: (id: number, title: string, url: string, sourceType: 'rss' | 'dxtools') => Promise<Feed | undefined>
    delete: (id: number) => Promise<boolean>
    fetch: (feedId: number, feedUrl: string, sourceType: 'rss' | 'dxtools') => Promise<number>
    fetchActive: () => Promise<number>
  }

  articles: {
    getAll: (options?: { feedId?: number; isFavorite?: boolean; isRead?: boolean; limit?: number; offset?: number }) => Promise<Article[]>
    getById: (id: number) => Promise<Article | undefined>
    markRead: (id: number, isRead?: boolean) => Promise<void>
    toggleFavorite: (id: number) => Promise<Article | undefined>
    getCount: (options?: { feedId?: number; isFavorite?: boolean }) => Promise<number>
  }

  analyses: {
    getByArticle: (articleId: number) => Promise<Analysis[]>
    getRecent: (limit?: number) => Promise<Analysis[]>
    getByType: (analysisType: 'insight' | 'sentiment' | 'report', limit?: number) => Promise<Analysis[]>
    getCount: (options?: { articleId?: number; analysisType?: string }) => Promise<number>
  }

  notes: {
    getByArticle: (articleId: number) => Promise<Note[]>
    add: (articleId: number, content: string) => Promise<Note>
    update: (id: number, content: string) => Promise<Note | undefined>
    delete: (id: number) => Promise<boolean>
  }

  settings: {
    get: (key: string) => Promise<string | undefined>
    set: (key: string, value: string) => Promise<void>
    getAll: () => Promise<Setting[]>
    delete: (key: string) => Promise<boolean>
  }

  llm: {
    analyzeArticle: (title: string, content: string) => Promise<AnalysisResult>
    analyzeSentiment: (title: string, content: string) => Promise<AnalysisResult>
    generateReport: (articles: { title: string; content: string }[]) => Promise<ReportResult>
    testConnection: () => Promise<boolean>
  }

  scheduler: {
    restart: () => void
  }

  onNewArticles: (callback: (count: number) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
