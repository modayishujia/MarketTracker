import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFeedStore } from '../stores/feedStore'
import { FeedForm } from '../components/FeedForm'

export function FeedPage() {
  const { t } = useTranslation()
  const { feeds, loading, error, loadFeeds, addFeed, deleteFeed, fetchFeed, fetchAllActive } = useFeedStore()
  const [showForm, setShowForm] = useState(false)
  const [fetchingIds, setFetchingIds] = useState<Set<number>>(new Set())
  const [fetchingAll, setFetchingAll] = useState(false)

  useEffect(() => {
    loadFeeds()
  }, [loadFeeds])

  const handleAdd = async (url: string, sourceType: 'rss' | 'dxtools') => {
    await addFeed(url, sourceType)
    setShowForm(false)
  }

  const handleDelete = async (id: number) => {
    await deleteFeed(id)
  }

  const handleFetchOne = async (feedId: number) => {
    setFetchingIds(prev => new Set(prev).add(feedId))
    try {
      await fetchFeed(feedId)
      await loadFeeds()
    } finally {
      setFetchingIds(prev => {
        const next = new Set(prev)
        next.delete(feedId)
        return next
      })
    }
  }

  const handleFetchAll = async () => {
    setFetchingAll(true)
    try {
      await fetchAllActive()
      await loadFeeds()
    } finally {
      setFetchingAll(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          fontSize: '10px', 
          color: 'var(--text-muted)',
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          marginBottom: '8px'
        }}>
          Feed Management
        </div>
        <div className="flex items-center justify-between">
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '600',
            color: 'var(--text-primary)',
            letterSpacing: '-0.5px'
          }}>
            {t('feeds.title')}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleFetchAll}
              disabled={fetchingAll || feeds.length === 0}
              className="transition-all duration-200"
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, rgba(0, 230, 118, 0.15) 0%, rgba(0, 230, 118, 0.05) 100%)',
                border: '1px solid rgba(0, 230, 118, 0.3)',
                borderRadius: '6px',
                color: '#00e676',
                fontSize: '13px',
                fontWeight: '500',
                opacity: (fetchingAll || feeds.length === 0) ? 0.5 : 1,
                cursor: (fetchingAll || feeds.length === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              {fetchingAll ? `⏳ ${t('feeds.fetching')}` : `🔄 ${t('feeds.fetchAll')}`}
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                padding: '8px 16px',
                background: showForm 
                  ? 'linear-gradient(135deg, rgba(255, 82, 82, 0.15) 0%, rgba(255, 82, 82, 0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(212, 168, 83, 0.15) 0%, rgba(212, 168, 83, 0.05) 100%)',
                border: `1px solid ${showForm ? 'rgba(255, 82, 82, 0.3)' : 'rgba(212, 168, 83, 0.3)'}`,
                borderRadius: '6px',
                color: showForm ? '#ff5252' : '#d4a853',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {showForm ? `✕ ${t('feeds.cancel')}` : `+ ${t('feeds.add')}`}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ 
          marginBottom: '16px',
          padding: '12px 16px',
          background: 'linear-gradient(90deg, rgba(255, 82, 82, 0.1) 0%, rgba(255, 82, 82, 0.05) 100%)',
          border: '1px solid rgba(255, 82, 82, 0.2)',
          borderRadius: '6px',
          color: '#ff5252',
          fontSize: '13px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div style={{ marginBottom: '24px' }} className="animate-fadeIn">
          <FeedForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '48px',
          color: 'var(--text-muted)'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
          {t('common.loading')}
        </div>
      ) : feeds.length === 0 ? (
        <div className="glass" style={{ 
          textAlign: 'center', 
          padding: '48px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📡</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {t('feeds.noFeeds')}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px' }}>
            {t('feeds.add')} RSS / dxtools
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {feeds.map((feed, index) => (
            <div
              key={feed.id}
              className="glass glass-hover animate-fadeIn"
              style={{
                padding: '16px 20px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                animationDelay: `${index * 50}ms`
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-3" style={{ marginBottom: '6px' }}>
                  <h3 style={{ 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {feed.title || feed.url}
                  </h3>
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontFamily: 'JetBrains Mono, monospace',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    background: feed.source_type === 'rss' 
                      ? 'rgba(255, 152, 0, 0.15)' 
                      : 'rgba(156, 39, 176, 0.15)',
                    color: feed.source_type === 'rss' ? '#ff9800' : '#ce93d8',
                    border: `1px solid ${feed.source_type === 'rss' ? 'rgba(255, 152, 0, 0.3)' : 'rgba(156, 39, 176, 0.3)'}`
                  }}>
                    {feed.source_type}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div 
                      className="status-dot" 
                      style={{ 
                        background: feed.is_active ? 'var(--accent-green)' : 'var(--text-muted)',
                        animation: feed.is_active ? 'pulse 2s infinite' : 'none'
                      }} 
                    />
                    <span style={{ 
                      fontSize: '11px', 
                      color: feed.is_active ? 'var(--accent-green)' : 'var(--text-muted)',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}>
                      {feed.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>
                <p style={{ 
                  fontSize: '12px', 
                  color: 'var(--text-muted)',
                  fontFamily: 'JetBrains Mono, monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {feed.url}
                </p>
                <p style={{ 
                  fontSize: '11px', 
                  color: 'var(--text-muted)',
                  marginTop: '4px',
                  fontFamily: 'JetBrains Mono, monospace'
                }}>
                  LAST FETCH: {formatDate(feed.last_fetched_at)}
                </p>
              </div>
              
              <div className="flex gap-2" style={{ flexShrink: 0 }}>
                <button
                  onClick={() => handleFetchOne(feed.id)}
                  disabled={fetchingIds.has(feed.id)}
                  style={{
                    padding: '6px 14px',
                    background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 212, 255, 0.05) 100%)',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    borderRadius: '6px',
                    color: 'var(--accent-cyan)',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: fetchingIds.has(feed.id) ? 'not-allowed' : 'pointer',
                    opacity: fetchingIds.has(feed.id) ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {fetchingIds.has(feed.id) ? '⏳' : '↓'} {t('feeds.fetchNow')}
                </button>
                <button
                  onClick={() => handleDelete(feed.id)}
                  style={{
                    padding: '6px 14px',
                    background: 'linear-gradient(135deg, rgba(255, 82, 82, 0.15) 0%, rgba(255, 82, 82, 0.05) 100%)',
                    border: '1px solid rgba(255, 82, 82, 0.2)',
                    borderRadius: '6px',
                    color: '#ff5252',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  ✕ {t('feeds.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
