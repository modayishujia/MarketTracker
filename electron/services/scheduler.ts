import { getActiveFeeds } from '../db/feeds'
import { getSetting } from '../db/settings'
import { fetchAndStoreFeed } from './rss'
import { BrowserWindow } from 'electron'

let schedulerInterval: NodeJS.Timeout | null = null
let isFetching = false

export function startScheduler() {
  stopScheduler()
  const intervalMinutes = parseInt(getSetting('fetchInterval') || '30')
  const intervalMs = Math.max(intervalMinutes, 5) * 60 * 1000

  schedulerInterval = setInterval(() => {
    fetchAllFeeds().catch(() => {})
  }, intervalMs)

  console.log(`Scheduler started with ${intervalMinutes} minute interval`)
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
  }
}

export function restartScheduler() {
  stopScheduler()
  startScheduler()
}

export async function fetchAllFeeds(): Promise<number> {
  if (isFetching) {
    console.log('Already fetching, skipping...')
    return 0
  }

  isFetching = true
  let totalNew = 0

  try {
    const feeds = getActiveFeeds()
    console.log(`Fetching ${feeds.length} feeds...`)

    for (let i = 0; i < feeds.length; i++) {
      const feed = feeds[i]
      try {
        const newCount = await fetchAndStoreFeed(feed.id, feed.url, feed.source_type)
        totalNew += newCount
        console.log(`[${i + 1}/${feeds.length}] ${feed.title}: ${newCount} new`)
      } catch (err: any) {
        console.error(`Failed: ${feed.title} - ${err.message}`)
      }

      // Delay between feeds to avoid overwhelming
      if (i < feeds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    // Notify renderer
    try {
      const windows = BrowserWindow.getAllWindows()
      windows.forEach(win => {
        if (!win.isDestroyed()) {
          win.webContents.send('feeds:fetched', { newCount: totalNew })
        }
      })
    } catch {}

    console.log(`Fetch complete: ${totalNew} new articles`)
    return totalNew
  } catch (err: any) {
    console.error('Fetch error:', err.message)
    return 0
  } finally {
    isFetching = false
  }
}
