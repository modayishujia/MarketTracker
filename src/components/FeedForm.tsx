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

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-primary)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'JetBrains Mono, monospace',
    transition: 'border-color 0.2s ease'
  }

  return (
    <form 
      onSubmit={handleSubmit} 
      style={{
        padding: '24px',
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-primary)',
        backdropFilter: 'blur(20px)'
      }}
    >
      <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, rgba(212, 168, 83, 0.2) 0%, rgba(212, 168, 83, 0.05) 100%)',
          border: '1px solid rgba(212, 168, 83, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '16px' }}>+</span>
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>
          {t('feeds.add')}
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '12px', 
            color: 'var(--text-secondary)',
            marginBottom: '6px',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            {t('feeds.url')}
          </label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'rgba(212, 168, 83, 0.5)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-primary)'}
            required
          />
        </div>
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '12px', 
            color: 'var(--text-secondary)',
            marginBottom: '6px',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            {t('feeds.type')}
          </label>
          <select
            value={sourceType}
            onChange={e => setSourceType(e.target.value as 'rss' | 'dxtools')}
            style={{
              ...inputStyle,
              cursor: 'pointer'
            }}
          >
            <option value="rss">{t('feeds.typeRss')}</option>
            <option value="dxtools">{t('feeds.typeDxtools')}</option>
          </select>
        </div>
        <div className="flex gap-3 justify-end" style={{ marginTop: '8px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-primary)',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {t('feeds.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting || !url.trim()}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, rgba(212, 168, 83, 0.2) 0%, rgba(212, 168, 83, 0.1) 100%)',
              border: '1px solid rgba(212, 168, 83, 0.3)',
              borderRadius: '6px',
              color: '#d4a853',
              fontSize: '13px',
              fontWeight: '500',
              cursor: (submitting || !url.trim()) ? 'not-allowed' : 'pointer',
              opacity: (submitting || !url.trim()) ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {submitting ? '⏳ ' : '💾 '}{submitting ? t('feeds.fetching') : t('feeds.save')}
          </button>
        </div>
      </div>
    </form>
  )
}
