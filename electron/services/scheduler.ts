import { getActiveFeeds } from '../db/feeds'
import { getSetting } from '../db/settings'
import { fetchAndStoreFeed } from './rss'
import { startAutoAnalysis } from './batchAnalysis'
import { BrowserWindow } from 'electron'

let schedulerInterval: NodeJS.Timeout | null = null
let isFetching = false

export function startScheduler() {
  stopScheduler()
  const intervalMinutes = parseInt(getSetting('fetchInterval') || '30')
  const intervalMs = intervalMinutes * 60 * 1000

  schedulerInterval = setInterval(async () => {
    await fetchAllFeeds()
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

export async function fetchAllFeeds(): Promise<number> {
  if (isFetching) return 0
  isFetching = true

  try {
    const feeds = getActiveFeeds()
    let totalNew = 0

    for (const feed of feeds) {
      try {
        const newCount = await fetchAndStoreFeed(feed.id, feed.url, feed.source_type)
        totalNew += newCount
      } catch (err: any) {
        console.error(`Failed to fetch feed ${feed.title}:`, err.message)
      }
    }

    // Notify renderer
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send('feeds:fetched', { newCount: totalNew })
      }
    })

    // Auto-analyze if enabled
    if (totalNew > 0) {
      const autoAnalyze = getSetting('autoAnalyze')
      if (autoAnalyze === 'true') {
        startAutoAnalysis()
      }
    }

    console.log(`Scheduler: fetched ${totalNew} new articles`)
    return totalNew
  } catch (err: any) {
    console.error('Fetch all feeds error:', err.message)
    return 0
  } finally {
    isFetching = false
  }
}
