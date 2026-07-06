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
