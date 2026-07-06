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
