import http from 'http'
import Parser from 'rss-parser'

const PORT = 19876
let llmConfig = { baseUrl: '', apiKey: '', model: '' }

interface ServiceRequest {
  action: string
  params?: any
}

interface ServiceResponse {
  ok: boolean
  data?: any
  error?: string
}

const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'MarketTracker/1.0' },
  maxRedirects: 3
})

function getConfig() {
  return { ...llmConfig }
}

function setConfig(config: any) {
  llmConfig = { ...config }
}

async function callLLM(config: any, systemPrompt: string, userContent: string): Promise<string> {
  if (!config.baseUrl || !config.apiKey || !config.model) {
    throw new Error('LLM not configured')
  }

  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ]
    })
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`LLM API error ${res.status}: ${body}`)
  }

  const data = await res.json() as any
  return data.choices[0]?.message?.content ?? ''
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s*onclick="[^"]*"/gi, '')
    .replace(/\s*onload="[^"]*"/gi, '')
    .replace(/<img([^>]*)>/gi, '')
    .trim()
}

async function fetchFeed(feedUrl: string) {
  try {
    if (!feedUrl || !feedUrl.startsWith('http')) {
      return []
    }

    const feed = await parser.parseURL(feedUrl)

    return (feed.items || [])
      .filter(item => item && item.title && item.link)
      .slice(0, 100)
      .map(item => {
        const raw = item.content || item.contentSnippet || ''
        const cleaned = raw ? sanitizeHtml(String(raw).substring(0, 5000)) : null
        return {
          title: String(item.title || '').substring(0, 500),
          url: String(item.link || ''),
          content: cleaned || null,
          publishedAt: item.isoDate || item.pubDate || null
        }
      })
  } catch (err: any) {
    return []
  }
}

async function analyzeArticle(config: any, title: string, content: string) {
  const systemPrompt = `You are a professional financial analyst for investors. Analyze the article and return a JSON object with exactly these fields:
- summary: a concise 1-2 sentence summary (string)
- keyPoints: array of 3-5 key insights (array of strings)
- sentiment: one of "bullish", "bearish", or "neutral" (string)
- confidence: a number between 0 and 1 (number)
- reasoning: brief explanation of the sentiment (string)
- assets: array of relevant markets, assets, or sectors mentioned (array of strings)`

  const raw = await callLLM(config, systemPrompt, `Title: ${title}\n\nContent:\n${content}`)
  return JSON.parse(raw)
}

async function batchAnalyze(config: any, articles: { title: string; content: string }[]) {
  const results: any[] = []
  for (const article of articles) {
    try {
      const result = await analyzeArticle(config, article.title, article.content)
      results.push({ ...result, title: article.title })
    } catch (err: any) {
      results.push({ error: err.message, title: article.title })
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  return results
}

async function handleRequest(req: ServiceRequest): Promise<ServiceResponse> {
  try {
    switch (req.action) {
      case 'ping':
        return { ok: true, data: { status: 'running' } }

      case 'setConfig':
        setConfig(req.params)
        return { ok: true }

      case 'getConfig':
        return { ok: true, data: getConfig() }

      case 'fetchFeed':
        if (!req.params?.url) {
          return { ok: false, error: 'Missing url parameter' }
        }
        const articles = await fetchFeed(req.params.url)
        return { ok: true, data: { articles } }

      case 'analyzeArticle':
        if (!req.params?.title || !req.params?.content) {
          return { ok: false, error: 'Missing title or content' }
        }
        const config = getConfig()
        if (!config.baseUrl || !config.apiKey || !config.model) {
          return { ok: false, error: 'LLM not configured' }
        }
        const result = await analyzeArticle(config, req.params.title, req.params.content)
        return { ok: true, data: result }

      case 'batchAnalyze':
        if (!Array.isArray(req.params?.articles)) {
          return { ok: false, error: 'Missing articles array' }
        }
        const batchConfig = getConfig()
        if (!batchConfig.baseUrl || !batchConfig.apiKey || !batchConfig.model) {
          return { ok: false, error: 'LLM not configured' }
        }
        const batchResults = await batchAnalyze(batchConfig, req.params.articles)
        return { ok: true, data: { results: batchResults } }

      default:
        return { ok: false, error: `Unknown action: ${req.action}` }
    }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Internal error' }
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }))
    return
  }

  let body = ''
  req.on('data', chunk => {
    body += chunk.toString()
  })

  req.on('end', async () => {
    try {
      const request: ServiceRequest = JSON.parse(body)
      const response = await handleRequest(request)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(response))
    } catch (err: any) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: err.message || 'Invalid request' }))
    }
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[FetchAnalysisService] Running on http://127.0.0.1:${PORT}`)
  if (process.send) {
    process.send({ type: 'ready', port: PORT })
  }
})

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[FetchAnalysisService] Port ${PORT} in use, trying ${PORT + 1}`)
    const newPort = PORT + 1
    server.listen(newPort, '127.0.0.1', () => {
      console.log(`[FetchAnalysisService] Running on http://127.0.0.1:${newPort}`)
      if (process.send) process.send({ type: 'ready', port: newPort })
    })
  } else {
    console.error('[FetchAnalysisService] Server error:', err)
    process.exit(1)
  }
})

process.on('message', (msg: any) => {
  if (msg.type === 'config') {
    setConfig(msg.config)
    console.log('[FetchAnalysisService] Config updated')
  }
})

process.on('SIGTERM', () => {
  console.log('[FetchAnalysisService] Shutting down...')
  server.close()
  process.exit(0)
})
