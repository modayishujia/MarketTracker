import { LLMConfig, AnalysisResult, ReportResult } from '../../src/types'
import { getSetting } from '../db/settings'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatCompletionResponse {
  choices: { message: { content: string } }[]
}

function getLanguage(): string {
  return getSetting('language') || 'zh'
}

function getLanguageInstruction(lang: string): string {
  if (lang === 'zh') {
    return '请用中文回复。所有文本字段（summary, keyPoints, reasoning, title, marketOutlook等）必须使用中文。'
  }
  return 'Reply in English. All text fields must be in English.'
}

async function postChatCompletion(
  config: LLMConfig,
  messages: ChatMessage[]
): Promise<string> {
  if (!config.baseUrl || !config.apiKey || !config.model) {
    throw new Error('LLM not configured. Please set API URL, API Key, and Model in Settings.')
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
      messages
    })
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`LLM API error ${res.status}: ${body}`)
  }
  const data = (await res.json()) as ChatCompletionResponse
  return data.choices[0]?.message?.content ?? ''
}

export async function callLLM(
  config: LLMConfig,
  systemPrompt: string,
  userContent: string
): Promise<string> {
  return postChatCompletion(config, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent }
  ])
}

export async function analyzeArticle(
  config: LLMConfig,
  title: string,
  content: string
): Promise<AnalysisResult> {
  const lang = getLanguage()
  const langInst = getLanguageInstruction(lang)
  
  const systemPrompt = `You are a professional financial analyst for investors. Analyze the article and return a JSON object with exactly these fields:
- summary: a concise 1-2 sentence summary (string)
- keyPoints: array of 3-5 key insights (array of strings)
- sentiment: one of "bullish", "bearish", or "neutral" (string)
- confidence: a number between 0 and 1 (number)
- reasoning: brief explanation of the sentiment (string)
- assets: array of relevant markets, assets, or sectors mentioned (array of strings)

${langInst}`

  const raw = await callLLM(config, systemPrompt, `Title: ${title}\n\nContent:\n${content}`)
  return JSON.parse(raw) as AnalysisResult
}

export async function analyzeSentiment(
  config: LLMConfig,
  title: string,
  content: string
): Promise<AnalysisResult> {
  const lang = getLanguage()
  const langInst = getLanguageInstruction(lang)
  
  const systemPrompt = `You are a financial sentiment analyst for investors. Analyze the article and return a JSON object with exactly these fields:
- summary: a concise 1-2 sentence summary (string)
- keyPoints: array of 3-5 key insights (array of strings)
- sentiment: one of "bullish", "bearish", or "neutral" (string)
- confidence: a number between 0 and 1 representing your confidence (number)
- reasoning: detailed explanation of why this sentiment was assigned (string)
- assets: array of specific markets, assets, or sectors affected (array of strings)

${langInst}`

  const raw = await callLLM(config, systemPrompt, `Title: ${title}\n\nContent:\n${content}`)
  return JSON.parse(raw) as AnalysisResult
}

export async function generateReport(
  config: LLMConfig,
  articles: { title: string; content: string }[]
): Promise<ReportResult> {
  const lang = getLanguage()
  const langInst = getLanguageInstruction(lang)
  
  const systemPrompt = `You are a senior financial analyst creating market briefings for investors. Given multiple article summaries, produce a comprehensive market report as a JSON object with exactly these fields:
- title: a descriptive report title (string)
- summary: a 3-5 sentence executive summary (string)
- keyThemes: array of major themes across the articles (array of strings)
- marketOutlook: overall market outlook paragraph (string)
- articlesAnalyzed: the number of articles you received (number)

${langInst}`

  const articlesBlock = articles
    .map((a, i) => `### Article ${i + 1}: ${a.title}\n${a.content}`)
    .join('\n\n---\n\n')
  const raw = await callLLM(config, systemPrompt, articlesBlock)
  return JSON.parse(raw) as ReportResult
}

export async function generatePulseReport(
  config: LLMConfig,
  articles: { title: string; sentiment?: string; confidence?: number; assets?: string[]; summary?: string }[]
): Promise<string> {
  const lang = getLanguage()

  const systemPrompt = `You are a senior financial analyst creating a professional market sentiment report for institutional investors. 

Generate a COMPLETE, self-contained HTML document (with embedded CSS) that is:
- Visually rich with charts, gauges, and data visualizations using pure CSS/HTML (no external dependencies)
- High information density - every section should deliver insights
- Professional and persuasive tone
- Use color coding: green for bullish, red for bearish, gold for neutral
- Include: executive summary, sentiment distribution, key assets analysis, risk assessment, market outlook
- Use CSS gradients, progress bars, badges, and grid layouts for visual appeal
- Make it look like a Bloomberg terminal / professional dashboard
- The HTML should be complete with <!DOCTYPE html>, <html>, <head> (with <style>), and <body>
- Use modern CSS: grid, flexbox, gradients, border-radius, box-shadow
- Dark theme (dark background, light text) matching a financial terminal aesthetic
- ${lang === 'zh' ? 'All text content must be in Chinese.' : 'All text content must be in English.'}
- Include the generation timestamp
- Width: 100%, max-width 900px, centered

Return ONLY the raw HTML string, no markdown wrapping, no explanation.`

  const dataBlock = articles
    .map((a, i) => {
      const parts = [`Article ${i + 1}: ${a.title}`]
      if (a.sentiment) parts.push(`Sentiment: ${a.sentiment}`)
      if (a.confidence) parts.push(`Confidence: ${Math.round(a.confidence * 100)}%`)
      if (a.assets?.length) parts.push(`Assets: ${a.assets.join(', ')}`)
      if (a.summary) parts.push(`Summary: ${a.summary}`)
      return parts.join(' | ')
    })
    .join('\n')

  const prompt = `Based on the following ${articles.length} analyzed articles, generate a comprehensive market sentiment HTML report.\n\n${dataBlock}`

  const raw = await callLLM(config, systemPrompt, prompt)
  // Extract HTML from response (handle cases where LLM wraps in ```html...```)
  const htmlMatch = raw.match(/<!DOCTYPE[\s\S]*<\/html>/i)
  return htmlMatch ? htmlMatch[0] : raw
}

export async function fetchArticleContent(url: string): Promise<{ title: string; content: string; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(15000)
    })
    if (!res.ok) return { title: '', content: '', error: `HTTP ${res.status}` }
    const html = await res.text()

    // Extract article body: try <article>, then <main>, then full page
    let body = ''
    const articleMatch = html.match(/<article[\s\S]*?<\/article>/i)
    const mainMatch = html.match(/<main[\s\S]*?<\/main>/i)
    if (articleMatch) body = articleMatch[0]
    else if (mainMatch) body = mainMatch[0]
    else body = html

    const cleaned = body
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<form[\s\S]*?<\/form>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s*class="[^"]*"/gi, '')
      .replace(/\s*id="[^"]*"/gi, '')
      .replace(/\s*style="[^"]*"/gi, '')
      .replace(/\s*data-[^=]*="[^"]*"/gi, '')
      .replace(/\s*onclick="[^"]*"/gi, '')
      .replace(/\s*onload="[^"]*"/gi, '')
      .replace(/<img([^>]*)>/gi, '<img$1 loading="lazy">')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : ''
    return { title, content: cleaned.substring(0, 30000) }
  } catch (err: any) {
    return { title: '', content: '', error: err.message || 'Fetch failed' }
  }
}

export async function summarizeContent(
  config: LLMConfig,
  title: string,
  content: string
): Promise<{ summary: string; keyPoints: string[] }> {
  const lang = getLanguage()
  const langInst = getLanguageInstruction(lang)

  const systemPrompt = `You are an expert content summarizer. Read the article and return a JSON object with:
- summary: a clear 3-5 sentence summary covering the main points (string)
- keyPoints: array of 3-6 key takeaways (array of strings)

${langInst}`

  const raw = await callLLM(config, systemPrompt, `Title: ${title}\n\nContent:\n${content}`)
  return JSON.parse(raw)
}

export async function customAnalysis(
  config: LLMConfig,
  title: string,
  content: string,
  customPrompt: string
): Promise<{ result: string }> {
  const lang = getLanguage()
  const langInst = getLanguageInstruction(lang)

  const systemPrompt = `You are a professional analyst. Follow the user's analysis instructions precisely. Return a JSON object with a single field "result" containing your analysis as a well-formatted string (use \\n for line breaks).

${langInst}`

  const raw = await callLLM(config, systemPrompt, `Article Title: ${title}\n\nArticle Content:\n${content}\n\n---\nAnalysis Instructions:\n${customPrompt}`)
  return JSON.parse(raw)
}

export async function testLLMConnection(config: LLMConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const lang = getLanguage()
    const testMessage = lang === 'zh' ? '回复"ok"。' : 'Reply with "ok".'
    
    const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: testMessage }]
      })
    })
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `HTTP ${res.status}: ${body.substring(0, 200)}` }
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Unknown error' }
  }
}

export async function generateMarketIntelligence(
  config: LLMConfig,
  localData: {
    total: number; bullish: number; bearish: number; neutral: number
    assets: { asset: string; bullish: number; bearish: number; neutral: number; avgConfidence: number }[]
    signals: { company: string; ticker: string | null; grade: string; score: number; reasoning: string }[]
    recentArticles: { title: string; sentiment: string | null; summary: string | null }[]
  },
  webData: { topic: string; items: string[] }[]
): Promise<string> {
  const lang = getLanguage()

  const localSection = `
## LOCAL SENTIMENT DATA (from ${localData.total} analyzed articles)
Overall: Bullish ${localData.bullish} / Bearish ${localData.bearish} / Neutral ${localData.neutral}
Top Assets: ${localData.assets.slice(0, 10).map(a => `${a.asset}(${a.bullish}B/${a.bearish}Bear/${a.neutral}N, conf:${Math.round(a.avgConfidence * 100)}%)`).join(', ')}
Active Signals: ${localData.signals.map(s => `${s.company}${s.ticker ? '(' + s.ticker + ')' : ''} [${s.grade}] ${s.score.toFixed(1)} - ${s.reasoning}`).join('\n  ')}
Recent Headlines: ${localData.recentArticles.slice(0, 15).map(a => `[${a.sentiment || '?'}] ${a.title}`).join('\n  ')}`

  const webSection = `
## REAL-TIME WEB INTELLIGENCE
${webData.map(w => `### ${w.topic}\n${w.items.map(i => '- ' + i).join('\n')}`).join('\n\n')}`

  const systemPrompt = `You are a senior portfolio strategist creating a comprehensive market intelligence briefing for a professional investor.

Combine the LOCAL sentiment data (from the investor's own RSS feeds and AI analysis) with the REAL-TIME web intelligence to produce a HIGH-VALUE market brief.

Structure your analysis as a JSON object with exactly these fields:
- executiveSummary: 3-4 sentence overview of current market conditions (string)
- keyThemes: array of 4-6 dominant market themes right now (array of strings)
- sentimentAssessment: { overall: "bullish"|"bearish"|"neutral", strength: "strong"|"moderate"|"weak", reasoning: string }
- hotTopics: array of { topic: string, impact: "positive"|"negative"|"neutral", relevance: string } — the most important things happening NOW
- sectorRotation: { inflow: array of sectors money is flowing INTO, outflow: array of sectors money is flowing OUT OF, reasoning: string }
- riskEvents: array of { event: string, impact: "high"|"medium"|"low", timeframe: string } — upcoming catalysts
- contrarianSignals: array of { signal: string, direction: "long"|"short", conviction: "high"|"medium"|"low" } — when local sentiment diverges from web consensus
- tradingImplications: array of { action: "buy"|"sell"|"hold"|"watch", target: string, reasoning: string } — specific actionable ideas
- riskWarning: the #1 risk to watch right now (string)

${lang === 'zh' ? '请用中文回复。所有字段内容必须使用中文。' : 'Reply in English.'}

Be specific, cite actual data points. Avoid vague generalizations. Think like a PM who needs to make decisions TODAY.`

  const raw = await callLLM(config, systemPrompt, localSection + '\n\n' + webSection)

  // Try to extract JSON from response
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  return jsonMatch ? jsonMatch[0] : raw
}
