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

interface Props {
  onStatsUpdate?: () => void
}

export function NewsFeed({ onStatsUpdate }: Props) {
  const { t } = useTranslation()
  const { feeds, loadFeeds, fetchAllActive } = useFeedStore()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'favorites'>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [showOriginal, setShowOriginal] = useState(false)

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

  const handleSelectArticle = (article: Article) => {
    setSelectedArticle(article)
    setAiAnalysis(null)
    setShowOriginal(false)
  }

  const handleAnalyze = async () => {
    if (!selectedArticle || analyzing) return
    setAnalyzing(true)
    setAiAnalysis(null)
    try {
      const result = await (window as any).electronAPI.llm.analyzeArticle(selectedArticle.id)
      setAiAnalysis(result)
      await (window as any).electronAPI.articles.markRead(selectedArticle.id)
      setArticles(prev => prev.map(a => a.id === selectedArticle.id ? { ...a, is_read: 1 } : a))
      onStatsUpdate?.()
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
    if (diffMins < 1) return 'NOW'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getTimeColor = (dateStr: string | null) => {
    if (!dateStr) return 'var(--text-muted)'
    const diffMins = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 60000)
    if (diffMins < 30) return '#00e676'
    if (diffMins < 120) return '#ffd740'
    return 'var(--text-muted)'
  }

  const filteredArticles = articles.filter(a => {
    if (filter === 'unread') return !a.is_read
    if (filter === 'favorites') return a.is_favorite
    return true
  })

  const unreadCount = articles.filter(a => !a.is_read).length

  const sentimentColors: Record<string, string> = {
    bullish: '#00e676',
    bearish: '#ff5252',
    neutral: '#ffd740'
  }

  return (
    <div style={{ height: '100%', display: 'flex' }}>
      {/* Article List */}
      <div style={{ 
        flex: selectedArticle ? '0 0 380px' : '1',
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
            className={fetching ? '' : 'btn-primary'}
            style={{
              padding: '5px 12px',
              fontSize: '10px',
              opacity: fetching ? 0.5 : 1,
              cursor: fetching ? 'not-allowed' : 'pointer'
            }}
          >
            {fetching ? `⏳ ${t('feed.syncing')}` : `↻ ${t('feed.sync')}`}
          </button>

          <div style={{ width: '1px', height: '16px', background: 'var(--border-primary)' }} />

          {(['all', 'unread', 'favorites'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn-ghost ${filter === f ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {f === 'unread' && unreadCount > 0 && (
                <span style={{ 
                  background: '#d4a853', 
                  color: '#000', 
                  padding: '0 4px', 
                  borderRadius: '2px',
                  fontSize: '8px',
                  fontWeight: '600'
                }}>
                  {unreadCount}
                </span>
              )}
              {t(`feed.${f}`)}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`btn-ghost ${autoRefresh ? 'active' : ''}`}
            style={{ fontSize: '8px' }}
          >
            {t('feed.autoRefresh')}
          </button>

          <span style={{ 
            fontSize: '9px', 
            color: 'var(--text-muted)',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            {filteredArticles.length}
          </span>
        </div>

        {/* List */}
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
              <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>📭</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                {t('feed.noArticles')}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {t('feed.syncHint')}
              </div>
            </div>
          ) : (
            filteredArticles.map((article, idx) => {
              const isSelected = selectedArticle?.id === article.id
              return (
                <div
                  key={article.id}
                  onClick={() => handleSelectArticle(article)}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--border-primary)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(212, 168, 83, 0.05)' : 'transparent',
                    borderLeft: isSelected ? '3px solid #d4a853' : article.is_read ? '3px solid transparent' : '3px solid rgba(212, 168, 83, 0.4)',
                    transition: 'all 0.1s ease',
                    animation: `fadeIn 0.12s ease-out ${Math.min(idx * 0.015, 0.4)}s both`
                  }}
                  onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'rgba(255,255,255,0.015)')}
                  onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <h4 style={{ 
                      fontSize: '12px', 
                      fontWeight: article.is_read ? '400' : '500',
                      color: article.is_read ? 'var(--text-secondary)' : 'var(--text-primary)',
                      lineHeight: '1.4',
                      flex: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {article.title}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <span style={{ 
                        fontSize: '9px', 
                        color: getTimeColor(article.published_at),
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: '500'
                      }}>
                        {formatDate(article.published_at)}
                      </span>
                      {article.is_favorite ? <span style={{ color: '#d4a853', fontSize: '10px' }}>★</span> : null}
                    </div>
                  </div>
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
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-primary)',
            background: 'rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '8px', 
                  color: '#d4a853',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '1.5px',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#d4a853' }} />
                  {t('feed.aiAnalysis')}
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: '500', lineHeight: '1.4', marginBottom: '8px' }}>
                  {selectedArticle.title}
                </h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => handleToggleFavorite(selectedArticle)}
                    style={{ background: 'none', border: 'none', color: selectedArticle.is_favorite ? '#d4a853' : 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}
                  >
                    {selectedArticle.is_favorite ? '★' : '☆'}
                  </button>
                  <a 
                    href={selectedArticle.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '10px',
                      color: 'var(--accent-cyan)',
                      textDecoration: 'none',
                      fontFamily: 'JetBrains Mono, monospace',
                      padding: '3px 8px',
                      background: 'rgba(0, 212, 255, 0.06)',
                      border: '1px solid rgba(0, 212, 255, 0.15)',
                      borderRadius: '3px'
                    }}
                  >
                    {t('feed.openOriginal')} ↗
                  </a>
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="btn-primary"
                    style={{ padding: '4px 12px', fontSize: '10px' }}
                  >
                    {analyzing ? `⏳ ${t('feed.analyzing')}` : `🤖 ${t('feed.aiAnalysis')}`}
                  </button>
                </div>
              </div>
              <button
                onClick={() => { setSelectedArticle(null); setAiAnalysis(null) }}
                className="btn-secondary"
                style={{ padding: '4px 8px', fontSize: '11px', marginLeft: '12px' }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="scroll-area" style={{ flex: 1, padding: '16px' }}>
            {/* Show Original Content Toggle */}
            {selectedArticle.content && (
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="btn-ghost"
                style={{ marginBottom: '12px', fontSize: '10px' }}
              >
                {showOriginal ? '▼' : '▶'} {t('feed.clickToAnalyze')}
              </button>
            )}

            {/* Original Content */}
            {showOriginal && selectedArticle.content && (
              <div style={{
                padding: '16px',
                background: 'rgba(255,255,255,0.015)',
                border: '1px solid var(--border-primary)',
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '12px',
                lineHeight: '1.7',
                color: 'var(--text-secondary)',
                maxHeight: '300px',
                overflow: 'auto'
              }}>
                {selectedArticle.content}
              </div>
            )}

            {/* AI Analysis */}
            {analyzing ? (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ 
                  width: '48px', height: '48px', margin: '0 auto 20px', borderRadius: '50%',
                  border: '2px solid var(--border-primary)', borderTopColor: '#d4a853',
                  animation: 'spin 1s linear infinite'
                }} />
                <div style={{ color: '#d4a853', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                  {t('feed.analyzing')}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  {t('feed.clickToAnalyze')}
                </div>
              </div>
            ) : aiAnalysis?.error ? (
              <div style={{
                padding: '16px',
                background: 'rgba(255, 82, 82, 0.06)',
                border: '1px solid rgba(255, 82, 82, 0.12)',
                borderRadius: '6px'
              }}>
                <div style={{ fontSize: '12px', color: '#ff5252', fontWeight: '500', marginBottom: '4px' }}>
                  ⚠️ {t('feed.analysisFailed')}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{aiAnalysis.error}</div>
              </div>
            ) : aiAnalysis ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Sentiment Badge */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '16px',
                  background: `${sentimentColors[aiAnalysis.sentiment] || '#ffd740'}06`,
                  border: `1px solid ${sentimentColors[aiAnalysis.sentiment] || '#ffd740'}15`,
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '28px', lineHeight: '1' }}>
                    {aiAnalysis.sentiment === 'bullish' ? '📈' : aiAnalysis.sentiment === 'bearish' ? '📉' : '➡️'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: '16px', fontWeight: '700',
                      color: sentimentColors[aiAnalysis.sentiment] || '#ffd740',
                      textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '1px'
                    }}>
                      {aiAnalysis.sentiment === 'bullish' ? t('pulse.bullish') : aiAnalysis.sentiment === 'bearish' ? t('pulse.bearish') : t('pulse.neutral')}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: '2px' }}>
                      {Math.round((aiAnalysis.confidence || 0) * 100)}% {t('pulse.confidence')}
                    </div>
                  </div>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: `conic-gradient(${sentimentColors[aiAnalysis.sentiment] || '#ffd740'} ${(aiAnalysis.confidence || 0) * 360}deg, rgba(255,255,255,0.03) 0deg)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '50%', background: 'var(--bg-card)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: '600', fontFamily: 'JetBrains Mono, monospace',
                      color: sentimentColors[aiAnalysis.sentiment] || '#ffd740'
                    }}>
                      {Math.round((aiAnalysis.confidence || 0) * 100)}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '1.5px', marginBottom: '8px' }}>
                    {t('feed.summary').toUpperCase()}
                  </div>
                  <p style={{ 
                    fontSize: '13px', lineHeight: '1.7', color: 'var(--text-secondary)',
                    padding: '14px', background: 'rgba(255,255,255,0.015)', borderRadius: '6px', border: '1px solid var(--border-primary)'
                  }}>
                    {aiAnalysis.summary}
                  </p>
                </div>

                {/* Key Points */}
                {aiAnalysis.keyPoints?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '1.5px', marginBottom: '8px' }}>
                      {t('feed.keyInsights').toUpperCase()} ({aiAnalysis.keyPoints.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {aiAnalysis.keyPoints.map((point: string, i: number) => (
                        <div key={i} style={{
                          display: 'flex', gap: '10px', padding: '10px 12px',
                          background: 'rgba(255,255,255,0.01)', borderRadius: '4px', border: '1px solid var(--border-primary)'
                        }}>
                          <span style={{ color: '#d4a853', fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', fontWeight: '600', minWidth: '18px' }}>
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assets */}
                {aiAnalysis.assets?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '1.5px', marginBottom: '8px' }}>
                      {t('feed.relatedAssets').toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {aiAnalysis.assets.map((asset: string, i: number) => (
                        <span key={i} className="badge badge-cyan">{asset}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reasoning */}
                {aiAnalysis.reasoning && (
                  <div>
                    <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '1.5px', marginBottom: '8px' }}>
                      {t('feed.aiReasoning').toUpperCase()}
                    </div>
                    <p style={{ 
                      fontSize: '12px', lineHeight: '1.6', color: 'var(--text-muted)', fontStyle: 'italic',
                      padding: '14px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px',
                      borderLeft: '2px solid rgba(212, 168, 83, 0.3)'
                    }}>
                      "{aiAnalysis.reasoning}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>🤖</div>
                <div style={{ fontSize: '12px' }}>{t('feed.clickToAnalyze')}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
