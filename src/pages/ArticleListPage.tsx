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
  const { feeds, loadFeeds } = useFeedStore()
  const [feedFilter, setFeedFilter] = useState<number | undefined>(undefined)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  useEffect(() => {
    loadFeeds()
  }, [loadFeeds])

  useEffect(() => {
    loadArticles({
      feedId: feedFilter,
      isFavorite: favoritesOnly ? true : undefined
    })
  }, [loadArticles, feedFilter, favoritesOnly])

  const filteredArticles = showUnreadOnly
    ? articles.filter(a => !a.is_read)
    : articles

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">
          {favoritesOnly ? t('articles.favorites') : t('articles.title')}
        </h2>
        {!favoritesOnly && (
          <div className="flex items-center gap-3">
            <select
              value={feedFilter ?? ''}
              onChange={e => setFeedFilter(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">{t('articles.all')}</option>
              {feeds.map(f => (
                <option key={f.id} value={f.id}>{f.title || f.url}</option>
              ))}
            </select>
            <button
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                showUnreadOnly
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {t('articles.unread')}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">{t('articles.noArticles')}</div>
      ) : (
        <div className="space-y-3">
          {filteredArticles.map(article => (
            <ArticleCard
              key={article.id}
              article={article}
              onClick={() => onArticleSelect(article.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
