import { ipcMain } from 'electron'
import { getAllFeeds, addFeed, updateFeed, deleteFeed, getActiveFeeds } from '../db/feeds'
import { fetchAndStoreFeed } from '../services/rss'

export function registerFeedHandlers() {
  ipcMain.handle('feeds:getAll', () => {
    return getAllFeeds()
  })

  ipcMain.handle('feeds:add', (_event, title: string, url: string, sourceType?: 'rss' | 'dxtools') => {
    return addFeed(title, url, sourceType)
  })

  ipcMain.handle('feeds:update', (_event, id: number, title: string, url: string, sourceType: 'rss' | 'dxtools') => {
    return updateFeed(id, title, url, sourceType)
  })

  ipcMain.handle('feeds:delete', (_event, id: number) => {
    return deleteFeed(id)
  })

  ipcMain.handle('feeds:fetch', async (_event, feedId: number, feedUrl: string, sourceType: 'rss' | 'dxtools') => {
    return fetchAndStoreFeed(feedId, feedUrl, sourceType)
  })

  ipcMain.handle('feeds:fetchActive', async () => {
    const feeds = getActiveFeeds()
    let totalNew = 0
    for (const feed of feeds) {
      const count = await fetchAndStoreFeed(feed.id, feed.url, feed.source_type)
      totalNew += count
    }
    return totalNew
  })
}
