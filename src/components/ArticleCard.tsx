import { useTranslation } from 'react-i18next'
import type { Article } from '../types'

interface ArticleCardProps {
  article: Article
  onClick: () => void
}

export function ArticleCard({ article, onClick }: ArticleCardProps) {
  const { t } = useTranslation()

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <div
      onClick={onClick}
      className={`bg-gray-800 rounded-lg p-4 border border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors ${
        !article.is_read ? 'border-l-4 border-l-blue-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={`font-medium flex-1 ${article.is_read ? 'text-gray-400' : 'text-white'}`}>
          {article.title}
        </h3>
        {article.is_favorite ? (
          <span className="text-yellow-400 shrink-0">★</span>
        ) : (
          <span className="text-gray-600 shrink-0">☆</span>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1">{formatDate(article.published_at)}</p>
    </div>
  )
}
