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
