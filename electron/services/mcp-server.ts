import Database from 'better-sqlite3'
import http from 'http'
import path from 'path'
import os from 'os'

const dbPath = path.join(os.homedir(), 'Library/Application Support/markettracker/money-analysis.db')
const HTTP_PORT = 19877

function getDb() {
  const db = new Database(dbPath, { readonly: true })
  db.pragma('journal_mode = WAL')
  return db
}

// ========== TOOL IMPLEMENTATIONS ==========

function listArticles(args: any) {
  const db = getDb()
  const conditions: string[] = []
  const params: any[] = []
  if (args.feed_id !== undefined) { conditions.push('a.feed_id = ?'); params.push(args.feed_id) }
  if (args.is_favorite !== undefined) { conditions.push('a.is_favorite = ?'); params.push(args.is_favorite ? 1 : 0) }
  if (args.is_read !== undefined) { conditions.push('a.is_read = ?'); params.push(args.is_read ? 1 : 0) }

  let sql = `SELECT a.id, a.title, a.title_zh, a.url, a.published_at, a.is_read, a.is_favorite,
    f.title as feed_name FROM articles a LEFT JOIN feeds f ON a.feed_id = f.id`
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY a.published_at DESC LIMIT ? OFFSET ?'
  params.push(args.limit || 20, args.offset || 0)

  const rows = db.prepare(sql).all(...params)
  db.close()
  return rows
}

function getArticle(args: any) {
  const db = getDb()
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(args.article_id)
  if (!article) { db.close(); return { error: 'Article not found' } }
  const analyses = db.prepare('SELECT analysis_type, result, model, created_at FROM analyses WHERE article_id = ? ORDER BY created_at DESC').all(args.article_id)
  const notes = db.prepare('SELECT content, created_at FROM notes WHERE article_id = ? ORDER BY created_at DESC').all(args.article_id)
  db.close()
  return { article, analyses, notes }
}

function searchArticles(args: any) {
  const db = getDb()
  const rows = db.prepare(`
    SELECT a.id, a.title, a.title_zh, a.url, a.published_at, f.title as feed_name
    FROM articles a LEFT JOIN feeds f ON a.feed_id = f.id
    WHERE a.title LIKE ? OR a.title_zh LIKE ? OR a.content LIKE ?
    ORDER BY a.published_at DESC LIMIT ?
  `).all(`%${args.query}%`, `%${args.query}%`, `%${args.query}%`, args.limit || 20)
  db.close()
  return rows
}

function getAnalyses(args: any) {
  const db = getDb()
  let sql = `SELECT a.id, a.article_id, a.analysis_type, a.result, a.model, a.created_at,
    ar.title as article_title FROM analyses a LEFT JOIN articles ar ON a.article_id = ar.id`
  const params: any[] = []
  if (args.analysis_type) { sql += ' WHERE a.analysis_type = ?'; params.push(args.analysis_type) }
  sql += ' ORDER BY a.created_at DESC LIMIT ?'
  params.push(args.limit || 30)
  const rows = db.prepare(sql).all(...params).map((r: any) => {
    try { r.parsed = JSON.parse(r.result) } catch { r.parsed = null }
    return r
  })
  db.close()
  return rows
}

function getMarketPulse() {
  const db = getDb()
  const rows = db.prepare(`
    SELECT result, created_at FROM analyses
    WHERE analysis_type IN ('insight', 'sentiment')
    ORDER BY created_at DESC LIMIT 500
  `).all() as any[]

  let total = 0, bullish = 0, bearish = 0, neutral = 0, confSum = 0
  const assetMap = new Map<string, { b: number; be: number; n: number; count: number }>()
  const trendMap = new Map<string, { b: number; be: number; n: number }>()

  for (const row of rows) {
    try {
      const p = JSON.parse(row.result)
      if (!p.sentiment) continue
      total++
      if (p.sentiment === 'bullish') bullish++
      else if (p.sentiment === 'bearish') bearish++
      else neutral++
      confSum += p.confidence || 0.5

      if (Array.isArray(p.assets)) {
        for (const asset of p.assets) {
          if (!asset || typeof asset !== 'string') continue
          const k = asset.trim().toLowerCase()
          const e = assetMap.get(k) || { b: 0, be: 0, n: 0, count: 0 }
          e.count++
          if (p.sentiment === 'bullish') e.b++
          else if (p.sentiment === 'bearish') e.be++
          else e.n++
          assetMap.set(k, e)
        }
      }

      const day = row.created_at.substring(0, 10)
      const t = trendMap.get(day) || { b: 0, be: 0, n: 0 }
      if (p.sentiment === 'bullish') t.b++
      else if (p.sentiment === 'bearish') t.be++
      else t.n++
      trendMap.set(day, t)
    } catch {}
  }

  const assets = Array.from(assetMap.entries())
    .map(([name, d]) => ({ asset: name, count: d.count, bullish: d.b, bearish: d.be, neutral: d.n }))
    .sort((a, b) => b.count - a.count).slice(0, 20)

  const now = new Date()
  const trend: any[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    const k = d.toISOString().substring(0, 10)
    const t = trendMap.get(k) || { b: 0, be: 0, n: 0 }
    trend.push({ date: k, bullish: t.b, bearish: t.be, neutral: t.n })
  }

  db.close()
  return {
    total, bullish, bearish, neutral,
    avgConfidence: total > 0 ? confSum / total : 0,
    overallSentiment: bullish > bearish ? 'bullish' : bearish > bullish ? 'bearish' : 'neutral',
    assets, trend
  }
}

function listSignals(args: any) {
  const db = getDb()
  let sql = `SELECT s.*, c.name as company_name, c.ticker, c.sector
    FROM signals s JOIN companies c ON s.company_id = c.id WHERE s.status = 'active'`
  const params: any[] = []
  if (args.grade) { sql += ' AND s.grade = ?'; params.push(args.grade) }
  sql += ' ORDER BY s.score DESC LIMIT ?'
  params.push(args.limit || 20)
  const rows = db.prepare(sql).all(...params)
  db.close()
  return rows
}

function getCompanyDetail(args: any) {
  const db = getDb()
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(args.company_id)
  if (!company) { db.close(); return { error: 'Company not found' } }
  const products = db.prepare('SELECT * FROM products WHERE company_id = ?').all(args.company_id)
  const signals = db.prepare("SELECT * FROM signals WHERE company_id = ? AND status = 'active' ORDER BY score DESC").all(args.company_id)
  const productIds = (products as any[]).map(p => p.id)
  let articles: any[] = []
  if (productIds.length > 0) {
    const ph = productIds.map(() => '?').join(',')
    articles = db.prepare(`
      SELECT DISTINCT ar.id, ar.title, ar.title_zh, ar.url, ar.published_at,
        json_extract(a.result, '$.sentiment') as sentiment,
        json_extract(a.result, '$.summary') as summary
      FROM articles ar JOIN article_products ap ON ar.id = ap.article_id
      LEFT JOIN analyses a ON ar.id = a.article_id AND a.analysis_type IN ('insight', 'sentiment')
      WHERE ap.product_id IN (${ph}) ORDER BY ar.published_at DESC LIMIT 20
    `).all(...productIds)
  }
  db.close()
  return { company, products, signals, articles }
}

function listCompanies() {
  const db = getDb()
  const companies = db.prepare('SELECT * FROM companies ORDER BY name').all()
  const products = db.prepare('SELECT * FROM products ORDER BY company_id, name').all()
  const enriched = (companies as any[]).map(c => ({
    ...c, products: (products as any[]).filter(p => p.company_id === c.id)
  }))
  db.close()
  return enriched
}

function listFeeds() {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM feeds ORDER BY title').all()
  db.close()
  return rows
}

function listFeedSources() {
  return {
    tech: [
      { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
      { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
      { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
      { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
    ],
    ai: [
      { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml' },
      { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/' },
      { name: 'DeepMind Blog', url: 'https://deepmind.google/blog/rss.xml' },
    ],
    finance: [
      { name: 'Bloomberg Markets', url: 'https://feeds.bloomberg.com/markets/news.rss' },
      { name: 'Reuters Business', url: 'https://www.reutersagency.com/feed/?best-topics=business-finance' },
      { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
    ],
    chinese: [
      { name: '36氪', url: 'https://36kr.com/feed' },
      { name: '少数派', url: 'https://sspai.com/feed' },
      { name: '机器之心', url: 'https://www.jiqizhixin.com/rss' },
    ]
  }
}

function getStats() {
  const db = getDb()
  const articles = (db.prepare('SELECT COUNT(*) as c FROM articles').get() as any).c
  const analyzed = (db.prepare('SELECT COUNT(DISTINCT article_id) as c FROM analyses').get() as any).c
  const signals = (db.prepare("SELECT COUNT(*) as c FROM signals WHERE status = 'active'").get() as any).c
  const companies = (db.prepare('SELECT COUNT(*) as c FROM companies').get() as any).c
  const products = (db.prepare('SELECT COUNT(*) as c FROM products').get() as any).c
  const feeds = (db.prepare('SELECT COUNT(*) as c FROM feeds WHERE is_active = 1').get() as any).c
  const sentimentDist = db.prepare(`
    SELECT json_extract(result, '$.sentiment') as s, COUNT(*) as c
    FROM analyses WHERE analysis_type IN ('insight', 'sentiment')
    AND json_extract(result, '$.sentiment') IS NOT NULL GROUP BY s
  `).all()
  db.close()
  return { articles, analyzed, signals, companies, products, activeFeeds: feeds, sentimentDistribution: sentimentDist }
}

// ========== TOOL DEFINITIONS ==========

const TOOLS: Record<string, { description: string; handler: (args: any) => any }> = {
  list_articles: {
    description: 'List articles from RSS feeds. Filter by feed, read status, favorites.',
    handler: listArticles
  },
  get_article: {
    description: 'Get full article content and all AI analyses (insight, sentiment, custom).',
    handler: getArticle
  },
  search_articles: {
    description: 'Full-text search across article titles and content.',
    handler: searchArticles
  },
  get_analyses: {
    description: 'Get recent AI analyses (sentiment, insight) across all articles.',
    handler: getAnalyses
  },
  get_market_pulse: {
    description: 'Aggregated market sentiment: distribution, per-asset breakdown, 14-day trend.',
    handler: getMarketPulse
  },
  list_signals: {
    description: 'Active trading signals scored S/A/B/C by sentiment extreme, news density, sentiment shift.',
    handler: listSignals
  },
  get_company_detail: {
    description: 'Company detail: products, recent signals, linked articles with sentiment.',
    handler: getCompanyDetail
  },
  list_companies: {
    description: 'All tracked companies with their products.',
    handler: listCompanies
  },
  list_feeds: {
    description: 'Subscribed RSS feed sources with status.',
    handler: listFeeds
  },
  list_feed_sources: {
    description: 'Available RSS sources by category that users can subscribe to.',
    handler: listFeedSources
  },
  get_stats: {
    description: 'System statistics: article/analysis/signal counts and sentiment distribution.',
    handler: getStats
  }
}

// ========== HTTP JSON-RPC SERVER ==========

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', () => {
    try {
      const rpc = JSON.parse(body)
      let result: any

      if (rpc.method === 'initialize') {
        result = {
          protocolVersion: '2024-11-05',
          capabilities: { tools: { listChanged: true } },
          serverInfo: { name: 'MarketTracker', version: '1.0.0' }
        }
      } else if (rpc.method === 'tools/list') {
        result = {
          tools: Object.entries(TOOLS).map(([name, t]) => ({
            name, description: t.description, inputSchema: { type: 'object', properties: {} }
          }))
        }
      } else if (rpc.method === 'tools/call') {
        const toolName = rpc.params?.name
        const tool = TOOLS[toolName]
        if (!tool) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, error: { code: -32601, message: `Tool not found: ${toolName}` } }))
          return
        }
        try {
          const data = tool.handler(rpc.params?.arguments || {})
          result = { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
        } catch (err: any) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, error: { code: -32000, message: err.message } }))
          return
        }
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, error: { code: -32601, message: `Method not found: ${rpc.method}` } }))
        return
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result }))
    } catch (err: any) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }))
    }
  })
})

server.listen(HTTP_PORT, 'localhost', () => {
  console.log(`[MCP] MarketTracker MCP server on http://127.0.0.1:${HTTP_PORT}`)
})

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    const newPort = HTTP_PORT + 1
    console.log(`[MCP] Port ${HTTP_PORT} in use, trying ${newPort}`)
    server.listen(newPort, 'localhost', () => {
      console.log(`[MCP] MarketTracker MCP server on http://localhost:${newPort}`)
    })
  } else {
    console.error('[MCP] Server error:', err)
    process.exit(1)
  }
})
