import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useArticleStore } from '../stores/articleStore'
import { useFeedStore } from '../stores/feedStore'
import { ArticleCard } from '../components/ArticleCard'

interface ArticleListPageProps {
  onArticleSelect: (articleId: number) => void
  favoritesOnly?: boolean
}

export function ArticleListPage({ onArticleSelect, favoritesOnly }: ArticleListPageProps) {
  const { t } = useTranslation()
  const { articles, loading, loadArticles } = useArticleStore()
  const { feeds, loadFeeds, fetchAllActive } = useFeedStore()
  const [feedFilter, setFeedFilter] = useState<number | undefined>(undefined)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    loadFeeds()
  }, [loadFeeds])

  useEffect(() => {
    loadArticles({
      feedId: feedFilter,
      isFavorite: favoritesOnly ? true : undefined
    })
  }, [loadArticles, feedFilter, favoritesOnly])

  const handleFetchAll = async () => {
    setFetching(true)
    try {
      await fetchAllActive()
      await loadArticles({
        feedId: feedFilter,
        isFavorite: favoritesOnly ? true : undefined
      })
    } finally {
      setFetching(false)
    }
  }

  const filteredArticles = showUnreadOnly
    ? articles.filter(a => !a.is_read)
    : articles

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
          {favoritesOnly ? 'STARRED ARTICLES' : 'ARTICLE FEED'}
        </div>
        <div className="flex items-center justify-between">
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '600',
            color: 'var(--text-primary)',
            letterSpacing: '-0.5px'
          }}>
            {favoritesOnly ? t('articles.favorites') : t('nav.sources')}
          </h2>
          {!favoritesOnly && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleFetchAll}
                disabled={fetching || feeds.length === 0}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, rgba(0, 230, 118, 0.15) 0%, rgba(0, 230, 118, 0.05) 100%)',
                  border: '1px solid rgba(0, 230, 118, 0.3)',
                  borderRadius: '6px',
                  color: '#00e676',
                  fontSize: '12px',
                  fontWeight: '500',
                  opacity: (fetching || feeds.length === 0) ? 0.5 : 1,
                  cursor: (fetching || feeds.length === 0) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {fetching ? '⏳ ' : '🔄 '}{fetching ? t('feeds.fetching') : t('feeds.fetchAll')}
              </button>
              <select
                value={feedFilter ?? ''}
                onChange={e => setFeedFilter(e.target.value ? Number(e.target.value) : undefined)}
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  cursor: 'pointer',
                  minWidth: '150px'
                }}
              >
                <option value="">{t('articles.all')}</option>
                {feeds.map(f => (
                  <option key={f.id} value={f.id}>{f.title || f.url}</option>
                ))}
              </select>
              <button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                style={{
                  padding: '8px 16px',
                  background: showUnreadOnly
                    ? 'linear-gradient(135deg, rgba(212, 168, 83, 0.15) 0%, rgba(212, 168, 83, 0.05) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${showUnreadOnly ? 'rgba(212, 168, 83, 0.3)' : 'var(--border-primary)'}`,
                  borderRadius: '6px',
                  color: showUnreadOnly ? '#d4a853' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                ● {t('articles.unread')}
              </button>
            </div>
          )}
        </div>
      </div>

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
      ) : filteredArticles.length === 0 ? (
        <div className="glass" style={{ 
          textAlign: 'center', 
          padding: '48px',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>
            {favoritesOnly ? '⭐' : '📰'}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {t('articles.noArticles')}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px' }}>
            {favoritesOnly ? 'Star articles to see them here' : 'Click "Fetch All" to load articles'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredArticles.map((article, index) => (
            <ArticleCard
              key={article.id}
              article={article}
              onClick={() => onArticleSelect(article.id)}
              style={{ animationDelay: `${index * 30}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
