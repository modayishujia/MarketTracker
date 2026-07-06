import { LLMConfig, AnalysisResult, ReportResult } from '../../src/types'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatCompletionResponse {
  choices: { message: { content: string } }[]
}

async function postChatCompletion(
  config: LLMConfig,
  messages: ChatMessage[]
): Promise<string> {
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

const INSIGHT_SYSTEM = `You are a financial news analyst. Analyze the article and return a JSON object with exactly these fields:
- summary: a concise 1-2 sentence summary
- keyPoints: array of 3-5 key insights
- sentiment: one of "bullish", "bearish", or "neutral"
- confidence: a number between 0 and 1
- reasoning: brief explanation of the sentiment
- assets: array of relevant markets, assets, or sectors mentioned`

export async function analyzeArticle(
  config: LLMConfig,
  title: string,
  content: string
): Promise<AnalysisResult> {
  const raw = await callLLM(config, INSIGHT_SYSTEM, `Title: ${title}\n\nContent:\n${content}`)
  return JSON.parse(raw) as AnalysisResult
}

const SENTIMENT_SYSTEM = `You are a financial sentiment analyst. Analyze the article and return a JSON object with exactly these fields:
- summary: a concise 1-2 sentence summary
- keyPoints: array of 3-5 key insights
- sentiment: one of "bullish", "bearish", or "neutral"
- confidence: a number between 0 and 1 representing your confidence in the sentiment classification
- reasoning: detailed explanation of why this sentiment was assigned
- assets: array of specific markets, assets, or sectors affected`

export async function analyzeSentiment(
  config: LLMConfig,
  title: string,
  content: string
): Promise<AnalysisResult> {
  const raw = await callLLM(config, SENTIMENT_SYSTEM, `Title: ${title}\n\nContent:\n${content}`)
  return JSON.parse(raw) as AnalysisResult
}

const REPORT_SYSTEM = `You are a senior financial analyst. Given multiple article summaries, produce a comprehensive market report as a JSON object with exactly these fields:
- title: a descriptive report title
- summary: a 3-5 sentence executive summary
- keyThemes: array of major themes across the articles
- marketOutlook: overall market outlook paragraph
- articlesAnalyzed: the number of articles you received`

export async function generateReport(
  config: LLMConfig,
  articles: { title: string; content: string }[]
): Promise<ReportResult> {
  const articlesBlock = articles
    .map((a, i) => `### Article ${i + 1}: ${a.title}\n${a.content}`)
    .join('\n\n---\n\n')
  const raw = await callLLM(config, REPORT_SYSTEM, articlesBlock)
  return JSON.parse(raw) as ReportResult
}

export async function testLLMConnection(config: LLMConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: 'Reply with "ok".' }]
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
