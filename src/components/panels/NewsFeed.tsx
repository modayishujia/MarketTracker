import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFeedStore } from '../../stores/feedStore'
import { useSettingsStore } from '../../stores/settingsStore'

interface Article {
  id: number
  title: string
  title_zh?: string | null
  url: string
  published_at: string | null
  is_read: number
  is_favorite: number
  feed_id: number
  content?: string
}

interface AnalysisResult {
  summary?: string
  keyPoints?: string[]
  sentiment?: string
  confidence?: number
  reasoning?: string
  assets?: string[]
  error?: string
}

interface FetchedContent {
  title: string
  content: string
  error?: string
}

interface CustomResult {
  result?: string
  error?: string
}

interface Props {
  onStatsUpdate?: () => void
}

export function NewsFeed({ onStatsUpdate }: Props) {
  const { t, i18n } = useTranslation()
  const { feeds, loadFeeds, fetchAllActive } = useFeedStore()
  const { autoAnalyze } = useSettingsStore()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<AnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [analysisCache, setAnalysisCache] = useState<Map<number, AnalysisResult>>(new Map())
  const [tick, setTick] = useState(0)
  const [fetchedContent, setFetchedContent] = useState<FetchedContent | null>(null)
  const [fetchingContent, setFetchingContent] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [customResult, setCustomResult] = useState<CustomResult | null>(null)
  const [customAnalyzing, setCustomAnalyzing] = useState(false)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    loadFeeds()
    loadArticles()
    // Load saved custom prompt
    ;(window as any).electronAPI.settings.get('customPrompt').then((v: string | undefined) => {
      if (v) setCustomPrompt(v)
    })
  }, [])

  // Re-render every 60s to update relative times
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => loadArticles(), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const loadArticles = async () => {
    try {
      const data = await (window as any).electronAPI.articles.getAll({})
      setArticles(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFetch = useCallback(async () => {
    if (fetching) return
    setFetching(true)
    try {
      await fetchAllActive()
      await loadArticles()
      onStatsUpdate?.()
    } finally {
      setFetching(false)
    }
  }, [fetching])

  const handleSelectArticle = async (article: Article) => {
    setSelectedArticle(article)
    setAiAnalysis(null)
    setFetchedContent(null)
    setCustomResult(null)
    setShowCustomInput(false)
    setFetchError(null)

    // Check cache first
    if (analysisCache.has(article.id)) {
      setAiAnalysis(analysisCache.get(article.id))
    } else {
      // Load existing analysis
      try {
        const analyses = await (window as any).electronAPI.analyses.getByArticle(article.id)
        if (analyses.length > 0) {
          const latest = JSON.parse(analyses[0].result)
          setAiAnalysis(latest)
          setAnalysisCache(prev => new Map(prev).set(article.id, latest))
        }
      } catch {}
    }

    // Mark as read
    if (!article.is_read) {
      await (window as any).electronAPI.articles.markRead(article.id)
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, is_read: 1 } : a))
    }

    // Auto fetch & analyze if AUTO is on and no existing analysis
    if (autoAnalyze && !analysisCache.has(article.id)) {
      handleFetchContentFor(article)
    }
  }

  const handleFetchContentFor = async (article: Article) => {
    if (fetchingContent) return
    setFetchingContent(true)
    setFetchedContent(null)
    setAiAnalysis(null)
    setFetchError(null)
    try {
      const result = await (window as any).electronAPI.llm.fetchContent(article.url)
      if (result.error) {
        setFetchError(result.error)
        setFetchingContent(false)
        return
      }
      setFetchedContent(result)
      if (result.content) {
        setAnalyzing(true)
        try {
          const analysisResult = await (window as any).electronAPI.llm.analyzeArticle(article.id)
          if (!analysisResult.error) {
            setAiAnalysis(analysisResult)
            setAnalysisCache(prev => new Map(prev).set(article.id, analysisResult))
            onStatsUpdate?.()
          }
        } catch {}
        setAnalyzing(false)
      }
    } catch (e: any) {
      setFetchError(e.message || 'Fetch failed')
    }
    setFetchingContent(false)
  }

  const handleAnalyze = async () => {
    if (!selectedArticle || analyzing) return
    setAnalyzing(true)
    setAiAnalysis(null)
    try {
      const result = await (window as any).electronAPI.llm.analyzeArticle(selectedArticle.id)
      if (!result.error) {
        setAiAnalysis(result)
        setAnalysisCache(prev => new Map(prev).set(selectedArticle.id, result))
        onStatsUpdate?.()
      } else {
        setAiAnalysis(result)
      }
    } catch (err: any) {
      setAiAnalysis({ error: err.message })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleToggleFavorite = async (article: Article) => {
    try {
      await (window as any).electronAPI.articles.toggleFavorite(article.id)
      const updated = { ...article, is_favorite: article.is_favorite ? 0 : 1 }
      setArticles(prev => prev.map(a => a.id === article.id ? updated : a))
      if (selectedArticle?.id === article.id) {
        setSelectedArticle(updated)
      }
    } catch {}
  }

  const handleFetchContent = async () => {
    if (!selectedArticle || fetchingContent) return
    await handleFetchContentFor(selectedArticle)
  }

  const handleCustomAnalyze = async () => {
    if (!selectedArticle || !customPrompt.trim() || customAnalyzing) return
    setCustomAnalyzing(true)
    setCustomResult(null)
    try {
      const result = await (window as any).electronAPI.llm.customAnalyze(selectedArticle.id, customPrompt)
      setCustomResult(result)
      onStatsUpdate?.()
    } catch {}
    setCustomAnalyzing(false)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    const diffMs = new Date().getTime() - new Date(dateStr).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return i18n.language === 'zh' ? '刚刚' : 'NOW'
    if (diffMins < 60) return `${diffMins}${i18n.language === 'zh' ? '分钟前' : 'm'}`
    if (diffHours < 24) return `${diffHours}${i18n.language === 'zh' ? '小时前' : 'h'}`
    if (diffDays < 7) return `${diffDays}${i18n.language === 'zh' ? '天前' : 'd'}`
    return new Date(dateStr).toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })
  }

  const getTimeColor = (dateStr: string | null) => {
    if (!dateStr) return 'var(--text-muted)'
    const diffMins = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 60000)
    if (diffMins < 30) return 'var(--accent-green)'
    if (diffMins < 120) return 'var(--accent-gold)'
    return 'var(--text-muted)'
  }

  const getSentimentColor = (sentiment?: string) => {
    if (sentiment === 'bullish') return 'var(--accent-green)'
    if (sentiment === 'bearish') return 'var(--accent-red)'
    return 'var(--accent-gold)'
  }

  const getSentimentLabel = (sentiment?: string) => {
    if (sentiment === 'bullish') return i18n.language === 'zh' ? '看涨' : 'Bullish'
    if (sentiment === 'bearish') return i18n.language === 'zh' ? '看跌' : 'Bearish'
    return i18n.language === 'zh' ? '中性' : 'Neutral'
  }

  const truncateContent = (content: string | undefined, maxLen: number = 150) => {
    if (!content) return ''
    const text = content
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
    if (text.length < 15) return ''
    const skip = /^(点击查看|点击阅读|查看原文|阅读原文|查看详情|点击这里|click\s*(here|to|view|read|for)|read\s*more)/i
    if (skip.test(text)) return ''
    if (text.length <= maxLen) return text
    return text.substring(0, maxLen) + '...'
  }

  const filteredArticles = articles.filter(a => {
    if (filter === 'unread') return !a.is_read
    return true
  })

  const unreadCount = articles.filter(a => !a.is_read).length

  const feedMap = new Map(feeds.map(f => [f.id, f.title]))

  return (
    <div style={{ height: '100%', display: 'flex' }}>
      {/* Article List */}
      <div style={{ 
        flex: selectedArticle ? '0 0 420px' : '1',
        borderRight: selectedArticle ? '1px solid var(--border-primary)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        transition: 'flex 0.2s ease'
      }}>
        {/* Toolbar */}
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--bg-secondary)'
        }}>
          <button
            onClick={handleFetch}
            disabled={fetching}
            style={{
              padding: '5px 12px',
              background: fetching ? 'var(--bg-card)' : 'var(--accent-green-dim)',
              border: `1px solid ${fetching ? 'var(--border-primary)' : 'rgba(94,201,138,0.2)'}`,
              borderRadius: '3px',
              color: fetching ? 'var(--text-muted)' : 'var(--accent-green)',
              fontSize: '10px',
              fontWeight: '500',
              fontFamily: 'JetBrains Mono, monospace',
              cursor: fetching ? 'not-allowed' : 'pointer'
            }}
          >
            {fetching ? '⏳' : '↻'} {t('feed.sync')}
          </button>

          <div style={{ width: '1px', height: '16px', background: 'var(--border-primary)' }} />

          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '3px 8px',
                background: filter === f ? 'var(--accent-gold-dim)' : 'transparent',
                border: `1px solid ${filter === f ? 'var(--border-accent)' : 'transparent'}`,
                borderRadius: '2px',
                color: filter === f ? 'var(--accent-gold)' : 'var(--text-muted)',
                fontSize: '9px',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {f === 'unread' && unreadCount > 0 && (
                <span style={{ background: 'var(--accent-gold)', color: '#fff', padding: '0 3px', borderRadius: '2px', fontSize: '8px', fontWeight: '600' }}>
                  {unreadCount}
                </span>
              )}
              {t(`feed.${f}`)}
            </button>
          ))}

          <div style={{ flex: 1 }} />
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            {filteredArticles.length}
          </span>
        </div>

        {/* Article Cards */}
        <div className="scroll-area" style={{ flex: 1 }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '12px' }}>
                <div className="thinking-dot" />
                <div className="thinking-dot" />
                <div className="thinking-dot" />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>📰</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{t('feed.noArticles')}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{t('feed.syncHint')}</div>
            </div>
          ) : (
            filteredArticles.map((article, idx) => {
              const isSelected = selectedArticle?.id === article.id
              return (
                <div
                  key={article.id}
                  onClick={() => handleSelectArticle(article)}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border-primary)',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--accent-gold-dim)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--accent-gold)' : article.is_read ? '3px solid transparent' : '3px solid var(--accent-gold-dim)',
                    transition: 'all 0.1s ease',
                    animation: `fadeIn 0.12s ease-out ${Math.min(idx * 0.015, 0.3)}s both`
                  }}
                  onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Time + Source */}
                  <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      fontSize: '9px', 
                      color: getTimeColor(article.published_at),
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: '500'
                    }}>
                      {formatDate(article.published_at)}
                    </span>
                    {feedMap.get(article.feed_id) && (
                      <span style={{
                        fontSize: '9px',
                        color: 'var(--accent-cyan)',
                        fontFamily: 'JetBrains Mono, monospace',
                        opacity: 0.6
                      }}>
                        {feedMap.get(article.feed_id)}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4 style={{ 
                    fontSize: '13px', 
                    fontWeight: article.is_read ? '400' : '600',
                    color: article.is_read ? 'var(--text-secondary)' : 'var(--text-primary)',
                    lineHeight: '1.4',
                    marginBottom: '8px'
                  }}>
                    {article.title}
                  </h4>

                  {/* Content Preview */}
                  {article.content && (
                    <p style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      lineHeight: '1.5',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {truncateContent(article.content, 120)}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedArticle && (() => {
        const displayTitle = i18n.language === 'zh' && selectedArticle.title_zh
          ? selectedArticle.title_zh
          : selectedArticle.title

        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-primary)',
              background: 'var(--bg-card)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    lineHeight: '1.4',
                    color: 'var(--text-primary)',
                    marginBottom: '8px',
                    letterSpacing: '-0.2px'
                  }}>
                    {displayTitle}
                  </h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    {feedMap.get(selectedArticle.feed_id) && (
                      <span style={{
                        fontSize: '10px',
                        color: 'var(--accent-cyan)',
                        fontFamily: 'JetBrains Mono, monospace',
                        padding: '2px 7px',
                        background: 'var(--accent-cyan-dim)',
                        borderRadius: '3px'
                      }}>
                        {feedMap.get(selectedArticle.feed_id)}
                      </span>
                    )}
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {formatDate(selectedArticle.published_at)}
                    </span>
                    <button
                      onClick={() => (window as any).electronAPI.shell.openExternal(selectedArticle.url)}
                      style={{
                        fontSize: '10px',
                        color: 'var(--accent-cyan)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'JetBrains Mono, monospace',
                        padding: 0
                      }}
                    >
                      {t('feed.openOriginal')} ↗
                    </button>
                    <div style={{ width: '1px', height: '12px', background: 'var(--border-primary)' }} />
                    <button
                      onClick={handleFetchContent}
                      disabled={fetchingContent || analyzing}
                      style={{
                        fontSize: '10px',
                        color: (fetchingContent || analyzing) ? 'var(--accent-green)' : 'var(--text-muted)',
                        background: 'none',
                        border: 'none',
                        cursor: (fetchingContent || analyzing) ? 'not-allowed' : 'pointer',
                        fontFamily: 'JetBrains Mono, monospace',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      {(fetchingContent || analyzing) ? '⏳' : '📄'} {i18n.language === 'zh' ? '抓取分析' : 'Fetch'}
                    </button>
                    <button
                      onClick={() => setShowCustomInput(!showCustomInput)}
                      style={{
                        fontSize: '10px',
                        color: showCustomInput ? 'var(--accent-purple)' : 'var(--text-muted)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'JetBrains Mono, monospace',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      ✏️ {i18n.language === 'zh' ? '自定义' : 'Custom'}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedArticle(null); setAiAnalysis(null); setFetchedContent(null); setSummary(null); setCustomResult(null) }}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="scroll-area" style={{ flex: 1, padding: '20px 24px' }}>
              {/* Loading states */}
              {(fetchingContent || analyzing) && (
                <div style={{
                  marginBottom: '20px',
                  padding: '16px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <div className="thinking-dot" />
                    <div className="thinking-dot" />
                    <div className="thinking-dot" />
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {fetchingContent
                      ? (i18n.language === 'zh' ? '正在抓取全文...' : 'Fetching full content...')
                      : (i18n.language === 'zh' ? '正在 AI 分析...' : 'Running AI analysis...')}
                  </span>
                </div>
              )}

              {/* AI Analysis (auto-generated after fetch) */}
              {aiAnalysis && !aiAnalysis.error && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 16px',
                    background: `${getSentimentColor(aiAnalysis.sentiment)}06`,
                    border: `1px solid ${getSentimentColor(aiAnalysis.sentiment)}15`,
                    borderRadius: '8px', marginBottom: '12px'
                  }}>
                    <div style={{ fontSize: '24px' }}>
                      {aiAnalysis.sentiment === 'bullish' ? '📈' : aiAnalysis.sentiment === 'bearish' ? '📉' : '➡️'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '14px', fontWeight: '700',
                        color: getSentimentColor(aiAnalysis.sentiment),
                        fontFamily: 'JetBrains Mono, monospace'
                      }}>
                        {getSentimentLabel(aiAnalysis.sentiment)}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {Math.round((aiAnalysis.confidence || 0) * 100)}% {t('pulse.confidence')}
                      </div>
                    </div>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: `conic-gradient(${getSentimentColor(aiAnalysis.sentiment)} ${(aiAnalysis.confidence || 0) * 360}deg, var(--border-primary) 0deg)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-card)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: '600', fontFamily: 'JetBrains Mono, monospace',
                        color: getSentimentColor(aiAnalysis.sentiment)
                      }}>
                        {Math.round((aiAnalysis.confidence || 0) * 100)}
                      </div>
                    </div>
                  </div>

                  {aiAnalysis.keyPoints && aiAnalysis.keyPoints.length > 0 && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: '6px',
                      padding: '14px 16px',
                      background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                      borderRadius: '8px', marginBottom: '12px'
                    }}>
                      {aiAnalysis.keyPoints.map((point, i) => (
                        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <span style={{
                            color: 'var(--accent-gold)', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace',
                            fontWeight: '600', minWidth: '18px', height: '18px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'var(--accent-gold-dim)', borderRadius: '3px'
                          }}>
                            {i + 1}
                          </span>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{point}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {aiAnalysis.assets && aiAnalysis.assets.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                      {aiAnalysis.assets.map((asset, i) => (
                        <span key={i} style={{
                          padding: '4px 10px', background: 'var(--accent-cyan-dim)',
                          border: '1px solid rgba(94, 196, 212, 0.12)', borderRadius: '4px',
                          fontSize: '11px', fontFamily: 'JetBrains Mono, monospace',
                          color: 'var(--accent-cyan)', fontWeight: '500'
                        }}>
                          {asset}
                        </span>
                      ))}
                    </div>
                  )}

                  {aiAnalysis.reasoning && (
                    <div style={{
                      padding: '14px 16px', background: 'var(--bg-card)',
                      borderLeft: '3px solid var(--accent-gold-dim)',
                      borderRadius: '0 6px 6px 0'
                    }}>
                      <div style={{
                        fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace',
                        letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase'
                      }}>
                        {t('feed.aiReasoning')}
                      </div>
                      <p style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        {aiAnalysis.reasoning}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Prompt Input */}
              {showCustomInput && (
                <div style={{
                  marginBottom: '20px', padding: '16px',
                  background: 'var(--bg-card)', border: '1px solid rgba(160,128,208,0.15)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    fontSize: '10px', color: 'var(--accent-purple)',
                    fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px',
                    marginBottom: '10px', textTransform: 'uppercase'
                  }}>
                    {i18n.language === 'zh' ? '自定义分析指令' : 'CUSTOM PROMPT'}
                  </div>
                  <textarea
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    placeholder={i18n.language === 'zh'
                      ? '例如：分析这篇文章对特斯拉股价的潜在影响'
                      : 'e.g., Analyze the potential impact on Tesla stock price'}
                    style={{
                      width: '100%', minHeight: '72px', padding: '10px 12px',
                      background: 'var(--bg-primary)', border: '1px solid var(--border-primary)',
                      borderRadius: '6px', color: 'var(--text-primary)',
                      fontSize: '13px', lineHeight: '1.6', resize: 'vertical', fontFamily: 'inherit'
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(160,128,208,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-primary)'}
                  />
                  <button
                    onClick={handleCustomAnalyze}
                    disabled={!customPrompt.trim() || customAnalyzing}
                    style={{
                      marginTop: '8px', padding: '7px 16px',
                      background: !customPrompt.trim() || customAnalyzing
                        ? 'rgba(255,255,255,0.03)'
                        : 'var(--accent-purple-dim, rgba(160,128,208,0.1))',
                      border: `1px solid ${!customPrompt.trim() || customAnalyzing ? 'var(--border-primary)' : 'rgba(160,128,208,0.2)'}`,
                      borderRadius: '6px',
                      color: !customPrompt.trim() || customAnalyzing ? 'var(--text-muted)' : 'var(--accent-purple)',
                      fontSize: '12px', fontWeight: '500',
                      cursor: !customPrompt.trim() || customAnalyzing ? 'not-allowed' : 'pointer',
                      opacity: !customPrompt.trim() || customAnalyzing ? 0.5 : 1
                    }}
                  >
                    {customAnalyzing
                      ? (i18n.language === 'zh' ? '分析中...' : 'Analyzing...')
                      : (i18n.language === 'zh' ? '执行分析' : 'Run')}
                  </button>
                </div>
              )}

              {/* Custom Analysis Result */}
              {customResult && !customResult.error && customResult.result && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    padding: '16px', background: 'var(--bg-card)',
                    border: '1px solid rgba(160,128,208,0.12)', borderRadius: '8px'
                  }}>
                    <div style={{
                      fontSize: '11px', color: 'var(--text-muted)',
                      fontFamily: 'JetBrains Mono, monospace', marginBottom: '10px',
                      padding: '5px 8px', background: 'rgba(160,128,208,0.06)', borderRadius: '4px'
                    }}>
                      ✏️ {customPrompt}
                    </div>
                    <p style={{
                      fontSize: '14px', lineHeight: '1.8',
                      color: 'var(--text-primary)', whiteSpace: 'pre-wrap'
                    }}>
                      {customResult.result}
                    </p>
                  </div>
                </div>
              )}

              {/* Error */}
              {(fetchError || aiAnalysis?.error || customResult?.error) && (
                <div style={{
                  padding: '12px 16px', marginBottom: '20px',
                  background: 'rgba(224, 85, 85, 0.06)',
                  border: '1px solid rgba(224, 85, 85, 0.12)', borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--accent-red)' }}>
                    ⚠️ {fetchError || aiAnalysis?.error || customResult?.error}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!aiAnalysis && !fetchedContent && !fetchingContent && (
                <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.15 }}>📄</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {i18n.language === 'zh' ? '点击标题栏 📄 抓取内容并分析' : 'Click 📄 in title bar to fetch and analyze'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {i18n.language === 'zh' ? '或点击 ✏️ 进行自定义分析' : 'or click ✏️ for custom analysis'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
