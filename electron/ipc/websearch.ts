import { ipcMain } from 'electron'

interface WebSearchResult {
  title: string
  snippet: string
  url: string
}

async function searchWeb(query: string, numResults: number = 5): Promise<WebSearchResult[]> {
  try {
    // Use DuckDuckGo instant answer API (no key needed)
    const encoded = encodeURIComponent(query)
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encoded}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000)
    })

    if (!res.ok) return []

    const html = await res.text()
    const results: WebSearchResult[] = []

    // Parse DuckDuckGo HTML results
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gi
    let match
    while ((match = resultRegex.exec(html)) !== null && results.length < numResults) {
      results.push({
        title: match[2].replace(/<[^>]*>/g, '').trim(),
        snippet: match[3].replace(/<[^>]*>/g, '').trim(),
        url: match[1]
      })
    }

    return results
  } catch (err: any) {
    console.error('[WebSearch] Error:', err.message)
    return []
  }
}

export async function fetchMarketHeadlines(): Promise<{ topic: string; items: string[] }[]> {
  const queries = [
    { topic: 'stock market today', query: 'stock market news today major movers' },
    { topic: 'crypto market', query: 'cryptocurrency market news bitcoin ethereum today' },
    { topic: 'macro economy', query: 'federal reserve interest rates inflation economy today' },
    { topic: 'tech earnings', query: 'tech company earnings revenue AI spending today' },
    { topic: 'china market', query: 'china economy stock market trade tariffs today' },
  ]

  const results: { topic: string; items: string[] }[] = []

  for (const q of queries) {
    try {
      const searchResults = await searchWeb(q.query, 3)
      results.push({
        topic: q.topic,
        items: searchResults.map(r => `${r.title}: ${r.snippet}`)
      })
    } catch {
      results.push({ topic: q.topic, items: [] })
    }
  }

  return results
}

export function registerWebSearchHandlers() {
  ipcMain.handle('websearch:market', async () => {
    try {
      return await fetchMarketHeadlines()
    } catch (err: any) {
      return [{ topic: 'error', items: [err.message] }]
    }
  })

  ipcMain.handle('websearch:query', async (_event, query: string, numResults?: number) => {
    try {
      return await searchWeb(query, numResults || 5)
    } catch (err: any) {
      return []
    }
  })
}
