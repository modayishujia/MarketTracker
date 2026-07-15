import type { Feed, Article, Analysis, Note, Setting, AnalysisResult, ReportResult, Company, Product, Signal } from './types'

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

  companies: {
    getAll: () => Promise<Company[]>
    getById: (id: number) => Promise<Company | undefined>
    add: (name: string, ticker?: string, sector?: string, description?: string) => Promise<Company>
    update: (id: number, name: string, ticker?: string, sector?: string, description?: string) => Promise<void>
    delete: (id: number) => Promise<void>
  }

  products: {
    getAll: () => Promise<Product[]>
    getByCompany: (companyId: number) => Promise<Product[]>
    add: (companyId: number, name: string, category?: string, description?: string, keywords?: string) => Promise<Product>
    update: (id: number, name: string, category?: string, description?: string, keywords?: string) => Promise<void>
    delete: (id: number) => Promise<void>
  }

  signals: {
    getActive: (limit?: number) => Promise<Signal[]>
    add: (companyId: number, signalType: string, grade: string, score: number, reasoning: string, evidence: string) => Promise<Signal>
    dismiss: (id: number) => Promise<void>
    getCount: () => Promise<{ active: number; dismissed: number }>
    scan: () => Promise<{ ok: boolean; scanned: number; signals: number }>
    getDetail: (signalId: number) => Promise<Signal & { company_name: string; ticker: string | null; sector: string | null }>
    getCompanyArticles: (companyId: number, limit?: number) => Promise<{ id: number; title: string; title_zh: string | null; url: string; published_at: string | null; sentiment: string | null; confidence: number | null; summary: string | null }[]>
    getCompanyProducts: (companyId: number) => Promise<Product[]>
  }

  opportunities: {
    getProductsByArticle: (articleId: number) => Promise<(Product & { relevance_score: number })[]>
    linkArticleProduct: (articleId: number, productId: number, relevanceScore?: number) => Promise<void>
  }

  scheduler: {
    restart: () => void
  }

  mcp: {
    getCommand: () => Promise<{ command: string; args: string[] }>
  }

  onNewArticles: (callback: (count: number) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
