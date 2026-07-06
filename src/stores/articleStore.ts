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

export const useArticleStore = create<ArticleStore>((set) => ({
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
