import Parser from 'rss-parser'
import { addArticle } from '../db/articles'
import { updateFeedLastFetched } from '../db/feeds'
import { getSetting } from '../db/settings'
import { callLLM } from './llm'
import type { LLMConfig } from '../../src/types'

const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'MarketTracker/1.0' },
  maxRedirects: 3
})

export interface FetchedArticle {
  title: string
  url: string
  content: string | null
  publishedAt: string | null
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

export async function fetchFeed(feedUrl: string): Promise<FetchedArticle[]> {
  try {
    // Validate URL
    if (!feedUrl || !feedUrl.startsWith('http')) {
      return []
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    try {
      const feed = await parser.parseURL(feedUrl)
      clearTimeout(timeout)
      
      return (feed.items || [])
        .filter(item => item && item.title && item.link)
        .slice(0, 100) // Limit articles per feed
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
    } catch (parseErr) {
      clearTimeout(timeout)
      return []
    }
  } catch (err: any) {
    // Silently fail - don't crash
    return []
  }
}

function isEnglishTitle(title: string): boolean {
  if (!title || title.length < 3) return false
  const cleaned = title.replace(/[\s\-:.'"!,?()\/\\@#$%^&*+=\[\]{}|;<>~`]/g, '')
  if (cleaned.length === 0) return false
  return /^[a-zA-Z0-9]+$/.test(cleaned)
}

async function batchTranslateTitles(titles: string[]): Promise<string[]> {
  try {
    const baseUrl = getSetting('llm_baseUrl')
    const apiKey = getSetting('llm_apiKey')
    const model = getSetting('llm_model')
    if (!baseUrl || !apiKey || !model) {
      console.log('Translate skipped: LLM not configured')
      return titles
    }

    const config: LLMConfig = { baseUrl, apiKey, model }
    const numbered = titles.map((t, i) => `${i + 1}. ${t}`).join('\n')
    const prompt = `Translate the following English article titles to simplified Chinese. Return ONLY a JSON object with a single key "translations" containing an array of translated strings in the same order. Keep proper nouns as-is.\n\n${numbered}`

    console.log(`Translating ${titles.length} titles...`)
    const raw = await callLLM(config, 'You are a professional translator. Return only valid JSON, no markdown.', prompt)
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed.translations) && parsed.translations.length === titles.length) {
      console.log(`Translated ${parsed.translations.length} titles OK`)
      return parsed.translations
    }
    console.log('Translate: response format mismatch, using originals')
    return titles
  } catch (err: any) {
    console.error('Translate failed:', err.message)
    return titles
  }
}

export async function fetchAndStoreFeed(
  feedId: number,
  feedUrl: string,
  sourceType: 'rss' | 'dxtools'
): Promise<number> {
  try {
    const articles = await fetchFeed(feedUrl)
    const lang = getSetting('language') || 'zh'
    let newCount = 0

    const englishTitles: { index: number; title: string }[] = []
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].title && isEnglishTitle(articles[i].title)) {
        englishTitles.push({ index: i, title: articles[i].title })
      }
    }

    let translations: string[] = []
    if (lang === 'zh' && englishTitles.length > 0) {
      translations = await batchTranslateTitles(englishTitles.map(e => e.title))
    }

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i]
      try {
        if (!article.url) continue
        const enIdx = englishTitles.findIndex(e => e.index === i)
        const titleZh = enIdx >= 0 && translations[enIdx] ? translations[enIdx] : undefined
        const result = addArticle(
          feedId,
          article.title || 'Untitled',
          article.url,
          article.content || undefined,
          article.publishedAt || undefined,
          titleZh
        )
        if (result) newCount++
      } catch {
        // Skip duplicates or invalid
      }
    }

    try {
      updateFeedLastFetched(feedId)
    } catch {
      // Ignore
    }

    return newCount
  } catch {
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
