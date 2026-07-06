import Parser from 'rss-parser'
import { addArticle } from '../db/articles'
import { updateFeedLastFetched } from '../db/feeds'

const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'MoneyAnalysis/1.0' },
  maxRedirects: 3
})

export interface FetchedArticle {
  title: string
  url: string
  content: string | null
  publishedAt: string | null
}

export async function fetchFeed(feedUrl: string): Promise<FetchedArticle[]> {
  try {
    // Validate URL
    if (!feedUrl || !feedUrl.startsWith('http')) {
      return []
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    try {
      const feed = await parser.parseURL(feedUrl)
      clearTimeout(timeout)
      
      return (feed.items || [])
        .filter(item => item && item.title && item.link)
        .slice(0, 100) // Limit articles per feed
        .map(item => ({
          title: String(item.title || '').substring(0, 500),
          url: String(item.link || ''),
          content: item.content || item.contentSnippet ? String(item.content || item.contentSnippet).substring(0, 2000) : null,
          publishedAt: item.isoDate || item.pubDate || null
        }))
    } catch (parseErr) {
      clearTimeout(timeout)
      return []
    }
  } catch (err: any) {
    // Silently fail - don't crash
    return []
  }
}

export async function fetchAndStoreFeed(
  feedId: number,
  feedUrl: string,
  sourceType: 'rss' | 'dxtools'
): Promise<number> {
  try {
    const articles = await fetchFeed(feedUrl)
    let newCount = 0

    for (const article of articles) {
      try {
        if (!article.url) continue
        const result = addArticle(
          feedId,
          article.title || 'Untitled',
          article.url,
          article.content || undefined,
          article.publishedAt || undefined
        )
        if (result) newCount++
      } catch {
        // Skip duplicates or invalid
      }
    }

    try {
      updateFeedLastFetched(feedId)
    } catch {
      // Ignore
    }

    return newCount
  } catch {
    return 0
  }
}

export async function extractFeedTitle(feedUrl: string): Promise<string> {
  try {
    const feed = await parser.parseURL(feedUrl)
    return feed.title || feedUrl
  } catch {
    return feedUrl
  }
}
