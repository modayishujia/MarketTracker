import { getDatabase } from '../db/database'
import { getAllProducts, linkArticleProduct, addSignal } from '../db/opportunities'
import type { Analysis, Product } from '../../src/types'

interface MatchedProduct {
  product: Product & { company_name: string; ticker: string | null; company_id: number }
  score: number
  matchedKeywords: string[]
}

interface SentimentData {
  sentiment: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  assets: string[]
  summary: string
}

interface CompanySentimentStats {
  companyId: number
  companyName: string
  ticker: string | null
  recentCount: number
  bullish: number
  bearish: number
  neutral: number
  avgConfidence: number
  prevSentiment: string | null
  currentSentiment: string | null
}

function matchArticleToProducts(title: string, content: string): MatchedProduct[] {
  const products = getAllProducts()
  const text = `${title} ${(content || '').substring(0, 2000)}`.toLowerCase()
  const matches: MatchedProduct[] = []

  for (const product of products) {
    const keywords: string[] = []

    // Product name is always a keyword
    if (product.name) keywords.push(product.name.toLowerCase())

    // Product keywords (comma separated)
    if (product.keywords) {
      product.keywords.split(',').forEach(k => {
        const trimmed = k.trim().toLowerCase()
        if (trimmed) keywords.push(trimmed)
      })
    }

    // Company name and ticker
    if (product.company_name) keywords.push(product.company_name.toLowerCase())
    if (product.ticker) keywords.push(product.ticker.toLowerCase())

    let matchCount = 0
    const matchedKeywords: string[] = []

    for (const kw of keywords) {
      if (kw.length < 2) continue
      // Short keywords and tickers need word boundary matching
      if (kw.length <= 5 || kw === (product.ticker || '').toLowerCase()) {
        const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        if (regex.test(text)) {
          matchCount++
          matchedKeywords.push(kw)
        }
      } else {
        if (text.includes(kw)) {
          matchCount++
          matchedKeywords.push(kw)
        }
      }
    }

    if (matchCount > 0) {
      matches.push({
        product: product as any,
        score: matchCount / Math.max(keywords.length, 1),
        matchedKeywords
      })
    }
  }

  // Sort by match score descending
  matches.sort((a, b) => b.score - a.score)
  return matches.slice(0, 5)
}

function getCompanySentimentStats(companyId: number, days: number = 7): CompanySentimentStats {
  const db = getDatabase()

  // Get company info
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) as any

  // Get products for this company
  const productIds = db.prepare('SELECT id FROM products WHERE company_id = ?').all(companyId) as { id: number }[]
  if (productIds.length === 0 || !company) {
    return {
      companyId, companyName: company?.name || '', ticker: company?.ticker || null,
      recentCount: 0, bullish: 0, bearish: 0, neutral: 0, avgConfidence: 0,
      prevSentiment: null, currentSentiment: null
    }
  }

  const placeholders = productIds.map(() => '?').join(',')

  // Recent analyses mentioning this company's products
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString()

  const recentRows = db.prepare(`
    SELECT a.result, a.created_at
    FROM analyses a
    JOIN article_products ap ON a.article_id = ap.article_id
    WHERE ap.product_id IN (${placeholders})
      AND a.analysis_type IN ('insight', 'sentiment')
      AND a.created_at > ?
    ORDER BY a.created_at DESC
    LIMIT 200
  `).all(...productIds.map(p => p.id), cutoffStr) as { result: string; created_at: string }[]

  let bullish = 0, bearish = 0, neutral = 0, confidenceSum = 0, valid = 0
  const byDay = new Map<string, { bullish: number; bearish: number; neutral: number }>()

  for (const row of recentRows) {
    try {
      const parsed = JSON.parse(row.result) as SentimentData
      if (!parsed.sentiment) continue

      valid++
      const s = parsed.sentiment
      if (s === 'bullish') bullish++
      else if (s === 'bearish') bearish++
      else neutral++

      confidenceSum += parsed.confidence || 0.5

      const day = row.created_at.substring(0, 10)
      const dayData = byDay.get(day) || { bullish: 0, bearish: 0, neutral: 0 }
      if (s === 'bullish') dayData.bullish++
      else if (s === 'bearish') dayData.bearish++
      else dayData.neutral++
      byDay.set(day, dayData)
    } catch {}
  }

  // Determine current vs previous sentiment
  const sortedDays = Array.from(byDay.keys()).sort().reverse()
  let currentSentiment: string | null = null
  let prevSentiment: string | null = null

  if (sortedDays.length >= 1) {
    const today = byDay.get(sortedDays[0])!
    currentSentiment = today.bullish > today.bearish ? 'bullish' : today.bearish > today.bullish ? 'bearish' : 'neutral'
  }
  if (sortedDays.length >= 2) {
    const prev = byDay.get(sortedDays[1])!
    prevSentiment = prev.bullish > prev.bearish ? 'bullish' : prev.bearish > prev.bullish ? 'bearish' : 'neutral'
  }

  return {
    companyId,
    companyName: company.name,
    ticker: company.ticker,
    recentCount: valid,
    bullish, bearish, neutral,
    avgConfidence: valid > 0 ? confidenceSum / valid : 0,
    prevSentiment,
    currentSentiment
  }
}

function calculateScores(stats: CompanySentimentStats): {
  sentimentExtreme: number
  newsDensity: number
  sentimentShift: number
  composite: number
  grade: string
} {
  const { recentCount, bullish, bearish, neutral, avgConfidence, prevSentiment, currentSentiment } = stats
  const total = bullish + bearish + neutral

  // 1. Sentiment Extreme Score (0-10)
  // How skewed the sentiment is (all bullish or all bearish = high score)
  let sentimentExtreme = 0
  if (total > 0) {
    const dominant = Math.max(bullish, bearish)
    const ratio = dominant / total
    sentimentExtreme = ratio * 10 * Math.min(avgConfidence + 0.3, 1)
  }

  // 2. News Density Score (0-10)
  // More mentions = higher score, with diminishing returns
  // Use sqrt for smoother scaling — even 3-4 articles gives a meaningful score
  const newsDensity = Math.min(Math.sqrt(recentCount) * 3.5, 10)

  // 3. Sentiment Shift Score (0-10)
  // Change from previous sentiment to current
  let sentimentShift = 0
  if (prevSentiment && currentSentiment && prevSentiment !== currentSentiment) {
    // Full reversal = high score
    if ((prevSentiment === 'bullish' && currentSentiment === 'bearish') ||
        (prevSentiment === 'bearish' && currentSentiment === 'bullish')) {
      sentimentShift = 8
    } else {
      sentimentShift = 5
    }
    // Amplify if confidence is high
    sentimentShift *= Math.min(avgConfidence + 0.3, 1)
  }

  // Composite Score
  // When sentiment is mixed/neutral, news density becomes more important
  const hasDirectionalSentiment = sentimentExtreme > 3
  const composite = hasDirectionalSentiment
    ? (sentimentExtreme * 0.45) + (newsDensity * 0.25) + (sentimentShift * 0.3)
    : (sentimentExtreme * 0.2) + (newsDensity * 0.5) + (sentimentShift * 0.3)

  // Grade
  let grade: string
  if (composite >= 7) grade = 'S'
  else if (composite >= 5) grade = 'A'
  else if (composite >= 3) grade = 'B'
  else grade = 'C'

  return { sentimentExtreme, newsDensity, sentimentShift, composite, grade }
}

function buildReasoning(stats: CompanySentimentStats, scores: ReturnType<typeof calculateScores>): string {
  const parts: string[] = []
  const { companyName, ticker, recentCount, bullish, bearish, neutral, prevSentiment, currentSentiment } = stats
  const label = ticker ? `${companyName} (${ticker})` : companyName

  parts.push(`${label}: ${recentCount} articles analyzed in 7 days.`)

  if (bullish > bearish && bullish > neutral) {
    parts.push(`Dominant sentiment: BULLISH (${bullish}/${bullish + bearish + neutral}).`)
  } else if (bearish > bullish && bearish > neutral) {
    parts.push(`Dominant sentiment: BEARISH (${bearish}/${bullish + bearish + neutral}).`)
  } else {
    parts.push(`Sentiment is MIXED/NEUTRAL.`)
  }

  if (prevSentiment && currentSentiment && prevSentiment !== currentSentiment) {
    parts.push(`SENTIMENT SHIFT detected: ${prevSentiment.toUpperCase()} -> ${currentSentiment.toUpperCase()}.`)
  }

  if (scores.sentimentExtreme >= 7) {
    parts.push(`Strong sentiment extreme (score: ${scores.sentimentExtreme.toFixed(1)}).`)
  }
  if (scores.newsDensity >= 6) {
    parts.push(`High news density (score: ${scores.newsDensity.toFixed(1)}).`)
  }

  return parts.join(' ')
}

function buildEvidence(stats: CompanySentimentStats): string {
  const lines: string[] = []
  lines.push(`Period: 7 days`)
  lines.push(`Articles: ${stats.recentCount}`)
  lines.push(`Bullish: ${stats.bullish} | Bearish: ${stats.bearish} | Neutral: ${stats.neutral}`)
  lines.push(`Avg Confidence: ${(stats.avgConfidence * 100).toFixed(0)}%`)
  if (stats.prevSentiment) lines.push(`Previous: ${stats.prevSentiment}`)
  if (stats.currentSentiment) lines.push(`Current: ${stats.currentSentiment}`)
  return lines.join('\n')
}

export function processArticleForSignals(articleId: number, title: string, content: string, analysisResult?: string): void {
  try {
    // Match article to products
    const matches = matchArticleToProducts(title, content)
    if (matches.length === 0) return

    // Link article to matched products
    for (const match of matches) {
      linkArticleProduct(articleId, match.product.id, match.score)
    }

    // If we have analysis result, check if we should generate signals
    if (!analysisResult) return

    let parsed: SentimentData
    try {
      parsed = JSON.parse(analysisResult)
    } catch { return }

    if (!parsed.sentiment) return

    // Group matches by company
    const companyMatches = new Map<number, { companyId: number; maxScore: number }>()
    for (const match of matches) {
      const cid = match.product.company_id
      const existing = companyMatches.get(cid)
      if (!existing || match.score > existing.maxScore) {
        companyMatches.set(cid, { companyId: cid, maxScore: match.score })
      }
    }

    // For each matched company, calculate scores and potentially generate signal
    for (const [_, { companyId }] of companyMatches) {
      const stats = getCompanySentimentStats(companyId)

      // Need at least 2 articles to generate a signal
      if (stats.recentCount < 2) continue

      const scores = calculateScores(stats)

      // Only generate signal if grade is B or above
      if (scores.grade === 'C') continue

      // Check if we already have a recent signal for this company (avoid duplicates within 24h)
      const db = getDatabase()
      const recentSignal = db.prepare(`
        SELECT id FROM signals
        WHERE company_id = ? AND created_at > datetime('now', '-1 day')
        LIMIT 1
      `).get(companyId)

      if (recentSignal) continue

      const reasoning = buildReasoning(stats, scores)
      const evidence = buildEvidence(stats)

      addSignal(
        companyId,
        scores.sentimentShift > 3 ? 'sentiment_shift' : scores.sentimentExtreme > 7 ? 'sentiment_extreme' : 'composite',
        scores.grade,
        scores.composite,
        reasoning,
        evidence
      )

      console.log(`[SignalEngine] Generated ${scores.grade} signal for ${stats.companyName}`)
    }
  } catch (err: any) {
    console.error('[SignalEngine] Error:', err.message)
  }
}

export function runSignalScan(): { scanned: number; signals: number } {
  const db = getDatabase()

  // Get recent analyses (last 7 days)
  const rows = db.prepare(`
    SELECT a.article_id, a.result, ar.title, ar.content
    FROM analyses a
    JOIN articles ar ON a.article_id = ar.id
    WHERE a.analysis_type IN ('insight', 'sentiment')
      AND a.created_at > datetime('now', '-7 days')
    ORDER BY a.created_at DESC
    LIMIT 500
  `).all() as { article_id: number; result: string; title: string; content: string }[]

  let scanned = 0
  let signalsBefore = (db.prepare("SELECT COUNT(*) as c FROM signals WHERE status = 'active'").get() as { c: number }).c

  for (const row of rows) {
    processArticleForSignals(row.article_id, row.title, row.content, row.result)
    scanned++
  }

  let signalsAfter = (db.prepare("SELECT COUNT(*) as c FROM signals WHERE status = 'active'").get() as { c: number }).c

  return { scanned, signals: signalsAfter - signalsBefore }
}
