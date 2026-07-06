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

  useEffect(() => {
    loadFeeds()
    loadArticles()
  }, [])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      loadArticles()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' && !e.metaKey && !e.ctrlKey) {
        handleFetch()
      }
      if (e.key === 'Escape') {
        setSelectedArticle(null)
        setAiAnalysis(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fetching])

  const loadArticles = async () => {
    setLoading(true)
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

  const handleAnalyze = async (article: Article) => {
    setSelectedArticle(article)
    setAnalyzing(true)
    setAiAnalysis(null)
    try {
      const result = await (window as any).electronAPI.llm.analyzeArticle(article.id)
      setAiAnalysis(result)
      // Mark as read
      await (window as any).electronAPI.articles.markRead(article.id)
      // Update local state
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, is_read: 1 } : a))
    } catch (err: any) {
      setAiAnalysis({ error: err.message })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleToggleFavorite = async (article: Article) => {
    try {
      await (window as any).electronAPI.articles.toggleFavorite(article.id)
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, is_favorite: a.is_favorite ? 0 : 1 } : a))
      if (selectedArticle?.id === article.id) {
        setSelectedArticle(prev => prev ? { ...prev, is_favorite: prev.is_favorite ? 0 : 1 } : null)
      }
    } catch {}
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'NOW'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getTimeColor = (dateStr: string | null) => {
    if (!dateStr) return 'var(--text-muted)'
    const diffMs = new Date().getTime() - new Date(dateStr).getTime()
    const diffMins = Math.floor(diffMs / 60000)
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

  return (
    <div style={{ height: '100%', display: 'flex' }}>
      {/* Article List */}
      <div style={{ 
        flex: selectedArticle ? '0 0 420px' : '1',
        borderRight: selectedArticle ? '1px solid var(--border-primary)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        transition: 'flex 0.3s ease'
      }}>
        {/* Toolbar */}
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <button
            onClick={handleFetch}
            disabled={fetching}
            style={{
              padding: '5px 10px',
              background: fetching 
                ? 'rgba(255,255,255,0.03)'
                : 'linear-gradient(135deg, rgba(0, 230, 118, 0.12) 0%, rgba(0, 230, 118, 0.04) 100%)',
              border: `1px solid ${fetching ? 'var(--border-primary)' : 'rgba(0, 230, 118, 0.25)'}`,
              borderRadius: '3px',
              color: fetching ? 'var(--text-muted)' : '#00e676',
              fontSize: '10px',
              fontWeight: '500',
              fontFamily: 'JetBrains Mono, monospace',
              cursor: fetching ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {fetching ? (
              <>
                <div className="thinking-dot" style={{ width: '3px', height: '3px' }} />
                SYNC
              </>
            ) : (
              <>↻ SYNC</>
            )}
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
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
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
              {f}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              padding: '3px 6px',
              background: autoRefresh ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
              border: `1px solid ${autoRefresh ? 'rgba(0, 212, 255, 0.2)' : 'var(--border-primary)'}`,
              borderRadius: '2px',
              color: autoRefresh ? 'var(--accent-cyan)' : 'var(--text-muted)',
              fontSize: '8px',
              fontFamily: 'JetBrains Mono, monospace',
              cursor: 'pointer'
            }}
            title="Auto-refresh (5min)"
          >
            AUTO
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
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '12px' }}>
                <div className="thinking-dot" />
                <div className="thinking-dot" />
                <div className="thinking-dot" />
              </div>
              <div style={{ fontSize: '11px' }}>Loading feed...</div>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>📭</div>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>No articles</div>
              <div style={{ fontSize: '10px', opacity: 0.7 }}>Press SYNC to fetch latest</div>
            </div>
          ) : (
            filteredArticles.map((article, idx) => {
              const isSelected = selectedArticle?.id === article.id
              return (
                <div
                  key={article.id}
                  onClick={() => handleAnalyze(article)}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid var(--border-primary)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(212, 168, 83, 0.06)' : 'transparent',
                    borderLeft: isSelected ? '2px solid #d4a853' : article.is_read ? '2px solid transparent' : '2px solid rgba(212, 168, 83, 0.4)',
                    transition: 'all 0.1s ease',
                    animation: `fadeIn 0.15s ease-out ${Math.min(idx * 0.02, 0.5)}s both`
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent'
                  }}
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
                      {article.is_favorite ? (
                        <span style={{ color: '#d4a853', fontSize: '10px' }}>★</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* AI Analysis Panel */}
      {selectedArticle && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-primary)',
            background: 'rgba(0,0,0,0.2)'
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
                  <span style={{ 
                    width: '4px', 
                    height: '4px', 
                    borderRadius: '50%', 
                    background: '#d4a853',
                    display: 'inline-block'
                  }} />
                  AI ANALYSIS
                </div>
                <h3 style={{ 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  lineHeight: '1.3',
                  marginBottom: '8px'
                }}>
                  {selectedArticle.title}
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleToggleFavorite(selectedArticle)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: selectedArticle.is_favorite ? '#d4a853' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      padding: '2px'
                    }}
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
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                  >
                    OPEN ↗
                  </a>
                </div>
              </div>
              <button
                onClick={() => { setSelectedArticle(null); setAiAnalysis(null) }}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="scroll-area" style={{ flex: 1, padding: '16px' }}>
            {analyzing ? (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ 
                  width: '48px',
                  height: '48px',
                  margin: '0 auto 20px',
                  borderRadius: '50%',
                  border: '2px solid var(--border-primary)',
                  borderTopColor: '#d4a853',
                  animation: 'spin 1s linear infinite'
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <div style={{ color: '#d4a853', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                  Analyzing with AI...
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  Extracting sentiment, key insights, and market signals
                </div>
              </div>
            ) : aiAnalysis?.error ? (
              <div style={{
                padding: '16px',
                background: 'rgba(255, 82, 82, 0.08)',
                border: '1px solid rgba(255, 82, 82, 0.15)',
                borderRadius: '6px'
              }}>
                <div style={{ fontSize: '12px', color: '#ff5252', fontWeight: '500', marginBottom: '4px' }}>
                  Analysis Failed
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {aiAnalysis.error}
                </div>
              </div>
            ) : aiAnalysis ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Sentiment Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  background: aiAnalysis.sentiment === 'bullish' 
                    ? 'rgba(0, 230, 118, 0.06)' 
                    : aiAnalysis.sentiment === 'bearish'
                    ? 'rgba(255, 82, 82, 0.06)'
                    : 'rgba(255, 215, 64, 0.06)',
                  border: `1px solid ${
                    aiAnalysis.sentiment === 'bullish' 
                      ? 'rgba(0, 230, 118, 0.15)' 
                      : aiAnalysis.sentiment === 'bearish'
                      ? 'rgba(255, 82, 82, 0.15)'
                      : 'rgba(255, 215, 64, 0.15)'
                  }`,
                  borderRadius: '8px'
                }}>
                  <div style={{ 
                    fontSize: '28px',
                    lineHeight: '1'
                  }}>
                    {aiAnalysis.sentiment === 'bullish' ? '📈' : aiAnalysis.sentiment === 'bearish' ? '📉' : '➡️'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: '600',
                      color: aiAnalysis.sentiment === 'bullish' 
                        ? '#00e676' 
                        : aiAnalysis.sentiment === 'bearish'
                        ? '#ff5252'
                        : '#ffd740',
                      textTransform: 'uppercase',
                      fontFamily: 'JetBrains Mono, monospace',
                      letterSpacing: '1px'
                    }}>
                      {aiAnalysis.sentiment}
                    </div>
                    <div style={{ 
                      fontSize: '10px', 
                      color: 'var(--text-muted)',
                      fontFamily: 'JetBrains Mono, monospace',
                      marginTop: '2px'
                    }}>
                      {Math.round((aiAnalysis.confidence || 0) * 100)}% CONFIDENCE
                    </div>
                  </div>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: `conic-gradient(${
                      aiAnalysis.sentiment === 'bullish' ? '#00e676' : aiAnalysis.sentiment === 'bearish' ? '#ff5252' : '#ffd740'
                    } ${(aiAnalysis.confidence || 0) * 360}deg, rgba(255,255,255,0.05) 0deg)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'var(--bg-card)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: '600',
                      fontFamily: 'JetBrains Mono, monospace',
                      color: aiAnalysis.sentiment === 'bullish' 
                        ? '#00e676' 
                        : aiAnalysis.sentiment === 'bearish'
                        ? '#ff5252'
                        : '#ffd740'
                    }}>
                      {Math.round((aiAnalysis.confidence || 0) * 100)}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <div style={{ 
                    fontSize: '8px', 
                    color: 'var(--text-muted)',
                    fontFamily: 'JetBrains Mono, monospace',
                    letterSpacing: '1.5px',
                    marginBottom: '8px'
                  }}>
                    SUMMARY
                  </div>
                  <p style={{ 
                    fontSize: '13px', 
                    lineHeight: '1.7', 
                    color: 'var(--text-secondary)',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-primary)'
                  }}>
                    {aiAnalysis.summary}
                  </p>
                </div>

                {/* Key Points */}
                {aiAnalysis.keyPoints?.length > 0 && (
                  <div>
                    <div style={{ 
                      fontSize: '8px', 
                      color: 'var(--text-muted)',
                      fontFamily: 'JetBrains Mono, monospace',
                      letterSpacing: '1.5px',
                      marginBottom: '8px'
                    }}>
                      KEY INSIGHTS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {aiAnalysis.keyPoints.map((point: string, i: number) => (
                        <div key={i} style={{
                          display: 'flex',
                          gap: '10px',
                          padding: '10px 12px',
                          background: 'rgba(255,255,255,0.015)',
                          borderRadius: '4px',
                          border: '1px solid var(--border-primary)'
                        }}>
                          <span style={{ 
                            color: '#d4a853', 
                            fontSize: '9px', 
                            fontFamily: 'JetBrains Mono, monospace',
                            fontWeight: '600',
                            minWidth: '20px'
                          }}>
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            {point}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assets */}
                {aiAnalysis.assets?.length > 0 && (
                  <div>
                    <div style={{ 
                      fontSize: '8px', 
                      color: 'var(--text-muted)',
                      fontFamily: 'JetBrains Mono, monospace',
                      letterSpacing: '1.5px',
                      marginBottom: '8px'
                    }}>
                      RELATED ASSETS
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {aiAnalysis.assets.map((asset: string, i: number) => (
                        <span key={i} style={{
                          padding: '4px 10px',
                          background: 'rgba(0, 212, 255, 0.06)',
                          border: '1px solid rgba(0, 212, 255, 0.15)',
                          borderRadius: '3px',
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
                  <div>
                    <div style={{ 
                      fontSize: '8px', 
                      color: 'var(--text-muted)',
                      fontFamily: 'JetBrains Mono, monospace',
                      letterSpacing: '1.5px',
                      marginBottom: '8px'
                    }}>
                      AI REASONING
                    </div>
                    <p style={{ 
                      fontSize: '12px', 
                      lineHeight: '1.6', 
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.01)',
                      borderRadius: '6px',
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
                <div style={{ fontSize: '12px' }}>Click an article to analyze</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
