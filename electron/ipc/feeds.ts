import { ipcMain } from 'electron'
import { getAllFeeds, addFeed, updateFeed, deleteFeed, getActiveFeeds } from '../db/feeds'
import { fetchAndStoreFeed } from '../services/rss'

export function registerFeedHandlers() {
  ipcMain.handle('feeds:getAll', () => {
    try {
      return getAllFeeds()
    } catch (err: any) {
      console.error('Failed to get feeds:', err.message)
      return []
    }
  })

  ipcMain.handle('feeds:add', (_event, title: string, url: string, sourceType?: 'rss' | 'dxtools') => {
    try {
      return addFeed(title, url, sourceType)
    } catch (err: any) {
      console.error('Failed to add feed:', err.message)
      throw err
    }
  })

  ipcMain.handle('feeds:update', (_event, id: number, title: string, url: string, sourceType: 'rss' | 'dxtools') => {
    try {
      return updateFeed(id, title, url, sourceType)
    } catch (err: any) {
      console.error('Failed to update feed:', err.message)
      throw err
    }
  })

  ipcMain.handle('feeds:delete', (_event, id: number) => {
    try {
      return deleteFeed(id)
    } catch (err: any) {
      console.error('Failed to delete feed:', err.message)
      throw err
    }
  })

  ipcMain.handle('feeds:fetch', async (_event, feedId: number, feedUrl: string, sourceType: 'rss' | 'dxtools') => {
    try {
      return await fetchAndStoreFeed(feedId, feedUrl, sourceType)
    } catch (err: any) {
      console.error('Failed to fetch feed:', err.message)
      return 0
    }
  })

  ipcMain.handle('feeds:fetchActive', async () => {
    try {
      const feeds = getActiveFeeds()
      let totalNew = 0
      for (const feed of feeds) {
        try {
          const count = await fetchAndStoreFeed(feed.id, feed.url, feed.source_type)
          totalNew += count
        } catch (err: any) {
          console.error(`Failed to fetch feed ${feed.title}:`, err.message)
        }
      }
      return totalNew
    } catch (err: any) {
      console.error('Failed to fetch active feeds:', err.message)
      return 0
    }
  })
}
