import { fetchFeed, FetchedArticle } from './rss'

const DXTOOLS_BASE = 'https://rss.dxtools.top'

interface DxToolsSource {
  name: string
  url: string
}

export async function fetchDxToolsSources(): Promise<DxToolsSource[]> {
  const response = await fetch(`${DXTOOLS_BASE}/api/feeds`)
  if (!response.ok) throw new Error(`dxtools API error: ${response.status}`)
  const data = await response.json()
  return Array.isArray(data) ? data : data.feeds || []
}

export async function fetchDxToolsFeed(feedUrl: string): Promise<FetchedArticle[]> {
  let url = feedUrl
  if (!url.startsWith('http')) url = `${DXTOOLS_BASE}/${url}`
  return fetchFeed(url)
}

export async function fetchAllDxToolsFeeds(): Promise<Map<string, FetchedArticle[]>> {
  const sources = await fetchDxToolsSources()
  const results = new Map<string, FetchedArticle[]>()
  for (const source of sources) {
    try {
      const articles = await fetchDxToolsFeed(source.url)
      results.set(source.name, articles)
    } catch (error) {
      console.error(`Failed to fetch dxtools feed ${source.name}:`, error)
    }
  }
  return results
}
