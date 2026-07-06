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
      return await (window as any).electronAPI.feeds.fetch(feedId)
    } catch (error) {
      set({ error: (error as Error).message })
      return 0
    }
  },
  fetchAllActive: async () => {
    try {
      return await (window as any).electronAPI.feeds.fetchActive()
    } catch (error) {
      set({ error: (error as Error).message })
      return 0
    }
  }
}))
