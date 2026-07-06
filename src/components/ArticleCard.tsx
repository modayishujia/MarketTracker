import { useTranslation } from 'react-i18next'
import type { Article } from '../types'

interface ArticleCardProps {
  article: Article
  onClick: () => void
  style?: React.CSSProperties
}

export function ArticleCard({ article, onClick, style }: ArticleCardProps) {
  const { t } = useTranslation()

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffHours < 48) return 'Yesterday'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div
      onClick={onClick}
      className="glass glass-hover animate-fadeIn"
      style={{
        padding: '16px 20px',
        borderRadius: '10px',
        cursor: 'pointer',
        borderLeft: article.is_read ? '3px solid transparent' : '3px solid #d4a853',
        opacity: article.is_read ? 0.7 : 1,
        transition: 'all 0.2s ease',
        ...style
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: article.is_read ? '400' : '500',
            color: article.is_read ? 'var(--text-secondary)' : 'var(--text-primary)',
            lineHeight: '1.4',
            marginBottom: '8px'
          }}>
            {article.title}
          </h3>
          <div className="flex items-center gap-4">
            <span style={{ 
              fontSize: '11px', 
              color: 'var(--text-muted)',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              {formatDate(article.published_at)}
            </span>
            {article.feed_id && (
              <span style={{ 
                fontSize: '10px', 
                color: 'var(--accent-cyan)',
                fontFamily: 'JetBrains Mono, monospace',
                opacity: 0.7
              }}>
                FEED #{article.feed_id}
              </span>
            )}
          </div>
        </div>
        <div style={{ 
          flexShrink: 0,
          color: article.is_favorite ? '#d4a853' : 'var(--text-muted)',
          fontSize: '16px',
          opacity: article.is_favorite ? 1 : 0.3
        }}>
          {article.is_favorite ? '★' : '☆'}
        </div>
      </div>
    </div>
  )
}
