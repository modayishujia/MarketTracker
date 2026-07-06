import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface FeedFormProps {
  onSubmit: (url: string, sourceType: 'rss' | 'dxtools') => Promise<void>
  onCancel: () => void
}

export function FeedForm({ onSubmit, onCancel }: FeedFormProps) {
  const { t } = useTranslation()
  const [url, setUrl] = useState('')
  const [sourceType, setSourceType] = useState<'rss' | 'dxtools'>('rss')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    setSubmitting(true)
    try {
      await onSubmit(url.trim(), sourceType)
      setUrl('')
      setSourceType('rss')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-white font-semibold mb-3">{t('feeds.add')}</h3>
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('feeds.url')}</label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">{t('feeds.type')}</label>
          <select
            value={sourceType}
            onChange={e => setSourceType(e.target.value as 'rss' | 'dxtools')}
            className="bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="rss">{t('feeds.typeRss')}</option>
            <option value="dxtools">{t('feeds.typeDxtools')}</option>
          </select>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-300 hover:text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            {t('feeds.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting || !url.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? t('feeds.fetching') : t('feeds.save')}
          </button>
        </div>
      </div>
    </form>
  )
}
