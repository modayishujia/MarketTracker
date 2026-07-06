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
