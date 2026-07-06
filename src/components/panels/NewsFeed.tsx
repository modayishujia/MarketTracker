import { useState, useEffect } from 'react'
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

  useEffect(() => {
    loadFeeds()
    loadArticles()
  }, [])

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

  const handleFetch = async () => {
    setFetching(true)
    try {
      await fetchAllActive()
      await loadArticles()
      onStatsUpdate?.()
    } finally {
      setFetching(false)
    }
  }

  const handleAnalyze = async (article: Article) => {
    setSelectedArticle(article)
    setAnalyzing(true)
    setAiAnalysis(null)
    try {
      const result = await (window as any).electronAPI.llm.analyzeArticle(article.id)
      setAiAnalysis(result)
    } catch (err: any) {
      setAiAnalysis({ error: err.message })
    } finally {
      setAnalyzing(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const filteredArticles = articles.filter(a => {
    if (filter === 'unread') return !a.is_read
    if (filter === 'favorites') return a.is_favorite
    return true
  })

  return (
    <div style={{ height: '100%', display: 'flex' }}>
      {/* Article List */}
      <div style={{ 
        flex: selectedArticle ? '0 0 400px' : '1',
        borderRight: selectedArticle ? '1px solid var(--border-primary)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        transition: 'flex 0.3s ease'
      }}>
        {/* Toolbar */}
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <button
            onClick={handleFetch}
            disabled={fetching}
            style={{
              padding: '6px 12px',
              background: 'linear-gradient(135deg, rgba(0, 230, 118, 0.15) 0%, rgba(0, 230, 118, 0.05) 100%)',
              border: '1px solid rgba(0, 230, 118, 0.3)',
              borderRadius: '4px',
              color: '#00e676',
              fontSize: '11px',
              fontWeight: '500',
              fontFamily: 'JetBrains Mono, monospace',
              cursor: fetching ? 'not-allowed' : 'pointer',
              opacity: fetching ? 0.5 : 1
            }}
          >
            {fetching ? '⏳ SYNC' : '↻ SYNC'}
          </button>

          <div style={{ 
            width: '1px', 
            height: '20px', 
            background: 'var(--border-primary)' 
          }} />

          {(['all', 'unread', 'favorites'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '4px 10px',
                background: filter === f ? 'rgba(212, 168, 83, 0.1)' : 'transparent',
                border: `1px solid ${filter === f ? 'rgba(212, 168, 83, 0.3)' : 'transparent'}`,
                borderRadius: '3px',
                color: filter === f ? '#d4a853' : 'var(--text-muted)',
                fontSize: '10px',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              {f}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          <span style={{ 
            fontSize: '10px', 
            color: 'var(--text-muted)',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            {filteredArticles.length} ARTICLES
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
              Loading feed...
            </div>
          ) : filteredArticles.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>📭</div>
              <div style={{ fontSize: '12px' }}>No articles</div>
              <button
                onClick={handleFetch}
                style={{
                  marginTop: '16px',
                  padding: '8px 16px',
                  background: 'rgba(212, 168, 83, 0.1)',
                  border: '1px solid rgba(212, 168, 83, 0.3)',
                  borderRadius: '4px',
                  color: '#d4a853',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                ↻ Fetch Now
              </button>
            </div>
          ) : (
            filteredArticles.map((article, idx) => (
              <div
                key={article.id}
                onClick={() => handleAnalyze(article)}
                className="glass-hover"
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border-primary)',
                  cursor: 'pointer',
                  background: selectedArticle?.id === article.id ? 'rgba(212, 168, 83, 0.05)' : 'transparent',
                  borderLeft: article.is_read ? '2px solid transparent' : '2px solid #d4a853',
                  animation: `fadeIn 0.15s ease-out ${idx * 0.02}s both`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <h4 style={{ 
                    fontSize: '12px', 
                    fontWeight: article.is_read ? '400' : '500',
                    color: article.is_read ? 'var(--text-secondary)' : 'var(--text-primary)',
                    lineHeight: '1.4',
                    flex: 1
                  }}>
                    {article.title}
                  </h4>
                  <span style={{ 
                    fontSize: '10px', 
                    color: 'var(--text-muted)',
                    fontFamily: 'JetBrains Mono, monospace',
                    flexShrink: 0
                  }}>
                    {formatDate(article.published_at)}
                  </span>
                </div>
                {article.is_favorite ? (
                  <span style={{ color: '#d4a853', fontSize: '10px' }}>★</span>
                ) : null}
              </div>
            ))
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ 
                  fontSize: '9px', 
                  color: 'var(--text-muted)',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '1px',
                  marginBottom: '4px'
                }}>
                  AI ANALYSIS
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: '500', lineHeight: '1.3' }}>
                  {selectedArticle.title}
                </h3>
              </div>
              <button
                onClick={() => { setSelectedArticle(null); setAiAnalysis(null) }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="scroll-area" style={{ flex: 1, padding: '16px' }}>
            {analyzing ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div className="thinking-dot" style={{ width: '8px', height: '8px' }} />
                  <div className="thinking-dot" style={{ width: '8px', height: '8px' }} />
                  <div className="thinking-dot" style={{ width: '8px', height: '8px' }} />
                </div>
                <div style={{ color: '#d4a853', fontSize: '12px', fontWeight: '500' }}>
                  AI is analyzing...
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '8px' }}>
                  Extracting insights and sentiment
                </div>
              </div>
            ) : aiAnalysis?.error ? (
              <div style={{
                padding: '16px',
                background: 'rgba(255, 82, 82, 0.1)',
                border: '1px solid rgba(255, 82, 82, 0.2)',
                borderRadius: '6px',
                color: '#ff5252',
                fontSize: '12px'
              }}>
                ⚠️ {aiAnalysis.error}
              </div>
            ) : aiAnalysis ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Sentiment Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: aiAnalysis.sentiment === 'bullish' 
                    ? 'rgba(0, 230, 118, 0.08)' 
                    : aiAnalysis.sentiment === 'bearish'
                    ? 'rgba(255, 82, 82, 0.08)'
                    : 'rgba(255, 215, 64, 0.08)',
                  border: `1px solid ${
                    aiAnalysis.sentiment === 'bullish' 
                      ? 'rgba(0, 230, 118, 0.2)' 
                      : aiAnalysis.sentiment === 'bearish'
                      ? 'rgba(255, 82, 82, 0.2)'
                      : 'rgba(255, 215, 64, 0.2)'
                  }`,
                  borderRadius: '6px'
                }}>
                  <div style={{ fontSize: '24px' }}>
                    {aiAnalysis.sentiment === 'bullish' ? '📈' : aiAnalysis.sentiment === 'bearish' ? '📉' : '➡️'}
                  </div>
                  <div>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '600',
                      color: aiAnalysis.sentiment === 'bullish' 
                        ? '#00e676' 
                        : aiAnalysis.sentiment === 'bearish'
                        ? '#ff5252'
                        : '#ffd740',
                      textTransform: 'uppercase',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}>
                      {aiAnalysis.sentiment}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {Math.round((aiAnalysis.confidence || 0) * 100)}% confidence
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <div style={{ 
                    fontSize: '9px', 
                    color: 'var(--text-muted)',
                    fontFamily: 'JetBrains Mono, monospace',
                    letterSpacing: '1px',
                    marginBottom: '8px'
                  }}>
                    SUMMARY
                  </div>
                  <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                    {aiAnalysis.summary}
                  </p>
                </div>

                {/* Key Points */}
                {aiAnalysis.keyPoints?.length > 0 && (
                  <div>
                    <div style={{ 
                      fontSize: '9px', 
                      color: 'var(--text-muted)',
                      fontFamily: 'JetBrains Mono, monospace',
                      letterSpacing: '1px',
                      marginBottom: '8px'
                    }}>
                      KEY INSIGHTS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {aiAnalysis.keyPoints.map((point: string, i: number) => (
                        <div key={i} style={{
                          display: 'flex',
                          gap: '8px',
                          padding: '8px 10px',
                          background: 'rgba(255,255,255,0.02)',
                          borderRadius: '4px',
                          border: '1px solid var(--border-primary)'
                        }}>
                          <span style={{ color: '#d4a853', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace' }}>
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
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
                      fontSize: '9px', 
                      color: 'var(--text-muted)',
                      fontFamily: 'JetBrains Mono, monospace',
                      letterSpacing: '1px',
                      marginBottom: '8px'
                    }}>
                      RELATED ASSETS
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {aiAnalysis.assets.map((asset: string, i: number) => (
                        <span key={i} style={{
                          padding: '4px 10px',
                          background: 'rgba(0, 212, 255, 0.08)',
                          border: '1px solid rgba(0, 212, 255, 0.2)',
                          borderRadius: '3px',
                          fontSize: '11px',
                          fontFamily: 'JetBrains Mono, monospace',
                          color: 'var(--accent-cyan)'
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
                      fontSize: '9px', 
                      color: 'var(--text-muted)',
                      fontFamily: 'JetBrains Mono, monospace',
                      letterSpacing: '1px',
                      marginBottom: '8px'
                    }}>
                      AI REASONING
                    </div>
                    <p style={{ 
                      fontSize: '12px', 
                      lineHeight: '1.6', 
                      color: 'var(--text-muted)',
                      fontStyle: 'italic'
                    }}>
                      {aiAnalysis.reasoning}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Click "ANALYZE" to get AI insights
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
