import Parser from 'rss-parser'
import { addArticle } from '../db/articles'
import { updateFeedLastFetched } from '../db/feeds'

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'FinancialRSSAnalyzer/1.0' }
})

export interface FetchedArticle {
  title: string
  url: string
  content: string | null
  publishedAt: string | null
}

export async function fetchFeed(feedUrl: string): Promise<FetchedArticle[]> {
  const feed = await parser.parseURL(feedUrl)
  return (feed.items || [])
    .filter(item => item.title && item.link)
    .map(item => ({
      title: item.title!,
      url: item.link!,
      content: item.content || item.contentSnippet || null,
      publishedAt: item.isoDate || item.pubDate || null
    }))
}

export async function fetchAndStoreFeed(
  feedId: number,
  feedUrl: string,
  sourceType: 'rss' | 'dxtools'
): Promise<number> {
  const articles = await fetchFeed(feedUrl)
  let newCount = 0
  for (const article of articles) {
    const result = addArticle(feedId, article.title, article.url, article.content || undefined, article.publishedAt || undefined)
    if (result) newCount++
  }
  updateFeedLastFetched(feedId)
  return newCount
}

export function extractFeedTitle(feedUrl: string): Promise<string> {
  return parser.parseURL(feedUrl).then(feed => feed.title || feedUrl)
}
