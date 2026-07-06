import Parser from 'rss-parser'
import { addArticle } from '../db/articles'
import { updateFeedLastFetched } from '../db/feeds'

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'MoneyAnalysis/1.0' }
})

export interface FetchedArticle {
  title: string
  url: string
  content: string | null
  publishedAt: string | null
}

export async function fetchFeed(feedUrl: string): Promise<FetchedArticle[]> {
  try {
    const feed = await parser.parseURL(feedUrl)
    return (feed.items || [])
      .filter(item => item.title && item.link)
      .map(item => ({
        title: item.title!,
        url: item.link!,
        content: item.content || item.contentSnippet || null,
        publishedAt: item.isoDate || item.pubDate || null
      }))
  } catch (err: any) {
    console.error(`Failed to fetch feed ${feedUrl}:`, err.message)
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
        const result = addArticle(feedId, article.title, article.url, article.content || undefined, article.publishedAt || undefined)
        if (result) newCount++
      } catch (err: any) {
        // Skip duplicate or invalid articles
        if (!err.message?.includes('UNIQUE constraint')) {
          console.error('Failed to add article:', err.message)
        }
      }
    }
    updateFeedLastFetched(feedId)
    return newCount
  } catch (err: any) {
    console.error(`Failed to fetch and store feed ${feedId}:`, err.message)
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
