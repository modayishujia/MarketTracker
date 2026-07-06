import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useFeedStore } from '../../stores/feedStore'

interface Article {
  id: number
  title: string
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

interface Props {
  onStatsUpdate?: () => void
}

export function NewsFeed({ onStatsUpdate }: Props) {
  const { t, i18n } = useTranslation()
  const { feeds, loadFeeds, fetchAllActive } = useFeedStore()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<AnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'favorites'>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [analysisCache, setAnalysisCache] = useState<Map<number, AnalysisResult>>(new Map())

  useEffect(() => {
    loadFeeds()
    loadArticles()
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
    if (diffMins < 30) return '#00e676'
    if (diffMins < 120) return '#ffd740'
    return 'var(--text-muted)'
  }

  const getSentimentColor = (sentiment?: string) => {
    if (sentiment === 'bullish') return '#00e676'
    if (sentiment === 'bearish') return '#ff5252'
    return '#ffd740'
  }

  const getSentimentLabel = (sentiment?: string) => {
    if (sentiment === 'bullish') return i18n.language === 'zh' ? '看涨' : 'Bullish'
    if (sentiment === 'bearish') return i18n.language === 'zh' ? '看跌' : 'Bearish'
    return i18n.language === 'zh' ? '中性' : 'Neutral'
  }

  const truncateContent = (content: string | undefined, maxLen: number = 150) => {
    if (!content) return ''
    if (content.length <= maxLen) return content
    return content.substring(0, maxLen) + '...'
  }

  const filteredArticles = articles.filter(a => {
    if (filter === 'unread') return !a.is_read
    if (filter === 'favorites') return a.is_favorite
    return true
  })

  const unreadCount = articles.filter(a => !a.is_read).length

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
          background: 'rgba(0,0,0,0.15)'
        }}>
          <button
            onClick={handleFetch}
            disabled={fetching}
            style={{
              padding: '5px 12px',
              background: fetching ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg, rgba(0, 230, 118, 0.12) 0%, rgba(0, 230, 118, 0.04) 100%)',
              border: `1px solid ${fetching ? 'var(--border-primary)' : 'rgba(0, 230, 118, 0.25)'}`,
              borderRadius: '3px',
              color: fetching ? 'var(--text-muted)' : '#00e676',
              fontSize: '10px',
              fontWeight: '500',
              fontFamily: 'JetBrains Mono, monospace',
              cursor: fetching ? 'not-allowed' : 'pointer'
            }}
          >
            {fetching ? '⏳' : '↻'} {t('feed.sync')}
          </button>

          <div style={{ width: '1px', height: '16px', background: 'var(--border-primary)' }} />

          {(['all', 'unread', 'favorites'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '3px 8px',
                background: filter === f ? 'rgba(212, 168, 83, 0.08)' : 'transparent',
                border: `1px solid ${filter === f ? 'rgba(212, 168, 83, 0.2)' : 'transparent'}`,
                borderRadius: '2px',
                color: filter === f ? '#d4a853' : 'var(--text-muted)',
                fontSize: '9px',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {f === 'unread' && unreadCount > 0 && (
                <span style={{ background: '#d4a853', color: '#000', padding: '0 3px', borderRadius: '2px', fontSize: '8px', fontWeight: '600' }}>
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
                    background: isSelected ? 'rgba(212, 168, 83, 0.06)' : 'transparent',
                    borderLeft: isSelected ? '3px solid #d4a853' : article.is_read ? '3px solid transparent' : '3px solid rgba(212, 168, 83, 0.4)',
                    transition: 'all 0.1s ease',
                    animation: `fadeIn 0.12s ease-out ${Math.min(idx * 0.015, 0.3)}s both`
                  }}
                  onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'rgba(255,255,255,0.015)')}
                  onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Time & Favorite */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ 
                      fontSize: '9px', 
                      color: getTimeColor(article.published_at),
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: '500'
                    }}>
                      {formatDate(article.published_at)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleFavorite(article) }}
                      style={{ background: 'none', border: 'none', color: article.is_favorite ? '#d4a853' : 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', padding: '2px' }}
                    >
                      {article.is_favorite ? '★' : '☆'}
                    </button>
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
      {selectedArticle && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-primary)',
            background: 'rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', lineHeight: '1.3', marginBottom: '8px' }}>
                  {selectedArticle.title}
                </h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatDate(selectedArticle.published_at)}
                  </span>
                  <a 
                    href={selectedArticle.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '10px',
                      color: 'var(--accent-cyan)',
                      textDecoration: 'none',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                  >
                    {t('feed.openOriginal')} ↗
                  </a>
                  <button
                    onClick={() => handleToggleFavorite(selectedArticle)}
                    style={{ background: 'none', border: 'none', color: selectedArticle.is_favorite ? '#d4a853' : 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}
                  >
                    {selectedArticle.is_favorite ? '★' : '☆'}
                  </button>
                </div>
              </div>
              <button
                onClick={() => { setSelectedArticle(null); setAiAnalysis(null) }}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-primary)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', width: '28px', height: '28px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="scroll-area" style={{ flex: 1, padding: '20px' }}>
            {/* AI Analysis Button */}
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: analyzing ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg, rgba(212, 168, 83, 0.12) 0%, rgba(212, 168, 83, 0.04) 100%)',
                  border: `1px solid ${analyzing ? 'var(--border-primary)' : 'rgba(212, 168, 83, 0.2)'}`,
                  borderRadius: '6px',
                  color: analyzing ? 'var(--text-muted)' : '#d4a853',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: analyzing ? 'not-allowed' : 'pointer',
                  fontFamily: 'JetBrains Mono, monospace',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {analyzing ? (
                  <>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <div className="thinking-dot" style={{ width: '4px', height: '4px' }} />
                      <div className="thinking-dot" style={{ width: '4px', height: '4px' }} />
                      <div className="thinking-dot" style={{ width: '4px', height: '4px' }} />
                    </div>
                    {t('feed.analyzing')}
                  </>
                ) : aiAnalysis ? (
                  <>🔄 {i18n.language === 'zh' ? '重新分析' : 'Re-analyze'}</>
                ) : (
                  <>🤖 {t('feed.aiAnalysis')}</>
                )}
              </button>
            </div>

            {/* AI Analysis Result */}
            {aiAnalysis && !aiAnalysis.error && (
              <div style={{ marginBottom: '20px' }}>
                {/* Sentiment Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px',
                  background: `${getSentimentColor(aiAnalysis.sentiment)}06`,
                  border: `1px solid ${getSentimentColor(aiAnalysis.sentiment)}15`,
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '24px' }}>
                    {aiAnalysis.sentiment === 'bullish' ? '📈' : aiAnalysis.sentiment === 'bearish' ? '📉' : '➡️'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: '14px', fontWeight: '700',
                      color: getSentimentColor(aiAnalysis.sentiment),
                      fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px'
                    }}>
                      {getSentimentLabel(aiAnalysis.sentiment)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {Math.round((aiAnalysis.confidence || 0) * 100)}% {t('pulse.confidence')}
                    </div>
                  </div>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: `conic-gradient(${getSentimentColor(aiAnalysis.sentiment)} ${(aiAnalysis.confidence || 0) * 360}deg, rgba(255,255,255,0.03) 0deg)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-card)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: '600', fontFamily: 'JetBrains Mono, monospace',
                      color: getSentimentColor(aiAnalysis.sentiment)
                    }}>
                      {Math.round((aiAnalysis.confidence || 0) * 100)}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                {aiAnalysis.summary && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '1px', marginBottom: '8px' }}>
                      {t('feed.summary').toUpperCase()}
                    </div>
                    <p style={{ 
                      fontSize: '13px', lineHeight: '1.7', color: 'var(--text-secondary)',
                      padding: '12px', background: 'rgba(255,255,255,0.015)', borderRadius: '6px', border: '1px solid var(--border-primary)'
                    }}>
                      {aiAnalysis.summary}
                    </p>
                  </div>
                )}

                {/* Key Points */}
                {aiAnalysis.keyPoints && aiAnalysis.keyPoints.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '1px', marginBottom: '8px' }}>
                      {t('feed.keyInsights').toUpperCase()} ({aiAnalysis.keyPoints.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {aiAnalysis.keyPoints.map((point, i) => (
                        <div key={i} style={{
                          display: 'flex', gap: '10px', padding: '10px 12px',
                          background: 'rgba(255,255,255,0.01)', borderRadius: '4px', border: '1px solid var(--border-primary)'
                        }}>
                          <span style={{ color: '#d4a853', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', fontWeight: '600', minWidth: '18px' }}>
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Assets */}
                {aiAnalysis.assets && aiAnalysis.assets.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '1px', marginBottom: '8px' }}>
                      {t('feed.relatedAssets').toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {aiAnalysis.assets.map((asset, i) => (
                        <span key={i} style={{
                          padding: '5px 12px',
                          background: 'rgba(0, 212, 255, 0.06)',
                          border: '1px solid rgba(0, 212, 255, 0.15)',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontFamily: 'JetBrains Mono, monospace',
                          color: 'var(--accent-cyan)',
                          fontWeight: '500'
                        }}>
                          {asset}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reasoning */}
                {aiAnalysis.reasoning && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '1px', marginBottom: '8px' }}>
                      {t('feed.aiReasoning').toUpperCase()}
                    </div>
                    <p style={{ 
                      fontSize: '12px', lineHeight: '1.6', color: 'var(--text-muted)', fontStyle: 'italic',
                      padding: '12px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px',
                      borderLeft: '2px solid rgba(212, 168, 83, 0.3)'
                    }}>
                      "{aiAnalysis.reasoning}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {aiAnalysis?.error && (
              <div style={{
                padding: '14px',
                background: 'rgba(255, 82, 82, 0.06)',
                border: '1px solid rgba(255, 82, 82, 0.12)',
                borderRadius: '6px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '12px', color: '#ff5252', fontWeight: '500' }}>⚠️ {aiAnalysis.error}</div>
              </div>
            )}

            {/* Original Content */}
            {selectedArticle.content && (
              <div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '1px', marginBottom: '10px' }}>
                  {i18n.language === 'zh' ? '原文内容' : 'ORIGINAL CONTENT'}
                </div>
                <div style={{
                  padding: '16px',
                  background: 'rgba(255,255,255,0.015)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  lineHeight: '1.8',
                  color: 'var(--text-secondary)',
                  maxHeight: '500px',
                  overflow: 'auto'
                }}>
                  {selectedArticle.content}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!aiAnalysis && !selectedArticle.content && (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>📄</div>
                <div style={{ fontSize: '12px' }}>{t('feed.clickToAnalyze')}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
