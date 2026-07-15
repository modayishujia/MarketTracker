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
  title_zh: string | null
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

export interface ServiceStatus {
  isReady: boolean
  port: number
}

export interface BatchAnalyzeRequest {
  title: string
  content: string
}

export interface BatchAnalyzeResponse {
  results: AnalysisResult[]
}

export interface Company {
  id: number
  name: string
  ticker: string | null
  sector: string | null
  description: string | null
  created_at: string
}

export interface Product {
  id: number
  company_id: number
  name: string
  category: string | null
  description: string | null
  keywords: string | null
  created_at: string
  company_name?: string
  ticker?: string | null
}

export interface Signal {
  id: number
  company_id: number
  signal_type: string
  grade: string
  score: number
  reasoning: string
  evidence: string
  status: string
  created_at: string
  company_name?: string
  ticker?: string | null
}
