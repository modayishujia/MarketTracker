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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">{t('feeds.title')}</h2>
        <div className="flex gap-2">
          <button
            onClick={handleFetchAll}
            disabled={fetchingAll || feeds.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {fetchingAll ? t('feeds.fetching') : t('feeds.fetchAll')}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {showForm ? t('feeds.cancel') : t('feeds.add')}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200">
          {t('common.error')}: {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6">
          <FeedForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
      ) : feeds.length === 0 ? (
        <div className="text-center py-12 text-gray-500">{t('feeds.noFeeds')}</div>
      ) : (
        <div className="space-y-3">
          {feeds.map(feed => (
            <div
              key={feed.id}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-medium truncate">{feed.title || feed.url}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    feed.source_type === 'rss'
                      ? 'bg-orange-900/50 text-orange-300'
                      : 'bg-purple-900/50 text-purple-300'
                  }`}>
                    {feed.source_type === 'rss' ? t('feeds.typeRss') : t('feeds.typeDxtools')}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    feed.is_active
                      ? 'bg-green-900/50 text-green-300'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {feed.is_active ? t('feeds.active') : t('feeds.inactive')}
                  </span>
                </div>
                <p className="text-sm text-gray-400 truncate">{feed.url}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('feeds.lastFetched')}: {formatDate(feed.last_fetched_at)}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleFetchOne(feed.id)}
                  disabled={fetchingIds.has(feed.id)}
                  className="px-3 py-1.5 text-sm bg-green-600/80 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {fetchingIds.has(feed.id) ? t('feeds.fetching') : t('feeds.fetchNow')}
                </button>
                <button
                  onClick={() => handleDelete(feed.id)}
                  className="px-3 py-1.5 text-sm bg-red-600/80 text-white rounded hover:bg-red-600 transition-colors"
                >
                  {t('feeds.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
