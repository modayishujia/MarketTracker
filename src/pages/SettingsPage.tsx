import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../stores/settingsStore'
import { useFeedStore } from '../stores/feedStore'
import { FeedForm } from '../components/FeedForm'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const {
    llmConfig, fetchInterval, autoAnalyze, fontSize,
    loadSettings, saveLLMConfig, saveFetchInterval, saveAutoAnalyze, saveLanguage, saveFontSize, testConnection
  } = useSettingsStore()
  const { feeds, loading: feedsLoading, loadFeeds, addFeed, deleteFeed, fetchFeed, fetchAllActive } = useFeedStore()

  const [baseUrl, setBaseUrl] = useState(llmConfig.baseUrl)
  const [apiKey, setApiKey] = useState(llmConfig.apiKey)
  const [model, setModel] = useState(llmConfig.model)
  const [interval, setInterval] = useState(fetchInterval)
  const [auto, setAuto] = useState(autoAnalyze)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [showFeedForm, setShowFeedForm] = useState(false)
  const [fetchingIds, setFetchingIds] = useState<Set<number>>(new Set())
  const [fetchingAll, setFetchingAll] = useState(false)

  useEffect(() => { 
    loadSettings()
    loadFeeds()
  }, [loadSettings, loadFeeds])
  
  useEffect(() => {
    setBaseUrl(llmConfig.baseUrl)
    setApiKey(llmConfig.apiKey)
    setModel(llmConfig.model)
    setInterval(fetchInterval)
    setAuto(autoAnalyze)
  }, [llmConfig, fetchInterval, autoAnalyze])

  const handleSaveLLM = async () => {
    setSaving(true)
    await saveLLMConfig({ baseUrl, apiKey, model })
    setSaving(false)
  }

  const handleTest = async () => {
    setTestResult(null)
    await saveLLMConfig({ baseUrl, apiKey, model })
    const result = await testConnection()
    setTestResult(result)
  }

  const handleLanguageChange = async (lang: string) => {
    i18n.changeLanguage(lang)
    await saveLanguage(lang)
  }

  const handleFontSizeChange = async (size: 'small' | 'medium' | 'large') => {
    await saveFontSize(size)
  }

  const handleIntervalChange = async (value: string) => {
    const num = parseInt(value)
    if (!isNaN(num) && num > 0) {
      setInterval(num)
      await saveFetchInterval(num)
    }
  }

  const handleAutoAnalyzeChange = async (checked: boolean) => {
    setAuto(checked)
    await saveAutoAnalyze(checked)
  }

  const handleAddFeed = async (url: string, sourceType: 'rss' | 'dxtools') => {
    await addFeed(url, sourceType)
    setShowFeedForm(false)
  }

  const handleDeleteFeed = async (id: number) => {
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

  const cardStyle = {
    padding: '24px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-primary)',
    backdropFilter: 'blur(20px)'
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ 
          fontSize: '10px', 
          color: 'var(--text-muted)',
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          marginBottom: '8px'
        }}>
          Configuration
        </div>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600',
          color: 'var(--text-primary)',
          letterSpacing: '-0.5px'
        }}>
          {t('settings.title')}
        </h2>
      </div>

      {/* Feed Management Section */}
      <div style={cardStyle} className="animate-fadeIn">
        <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
          <div className="flex items-center gap-3">
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
              <span style={{ fontSize: '16px' }}>📡</span>
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>
                {t('feeds.title')}
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                RSS / DXTOOLS SOURCES
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleFetchAll}
              disabled={fetchingAll || feeds.length === 0}
              style={{
                padding: '8px 14px',
                background: 'linear-gradient(135deg, rgba(0, 230, 118, 0.15) 0%, rgba(0, 230, 118, 0.05) 100%)',
                border: '1px solid rgba(0, 230, 118, 0.3)',
                borderRadius: '6px',
                color: '#00e676',
                fontSize: '12px',
                fontWeight: '500',
                opacity: (fetchingAll || feeds.length === 0) ? 0.5 : 1,
                cursor: (fetchingAll || feeds.length === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              {fetchingAll ? '⏳' : '🔄'} {t('feeds.fetchAll')}
            </button>
            <button
              onClick={() => setShowFeedForm(!showFeedForm)}
              style={{
                padding: '8px 14px',
                background: showFeedForm 
                  ? 'linear-gradient(135deg, rgba(255, 82, 82, 0.15) 0%, rgba(255, 82, 82, 0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(212, 168, 83, 0.15) 0%, rgba(212, 168, 83, 0.05) 100%)',
                border: `1px solid ${showFeedForm ? 'rgba(255, 82, 82, 0.3)' : 'rgba(212, 168, 83, 0.3)'}`,
                borderRadius: '6px',
                color: showFeedForm ? '#ff5252' : '#d4a853',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              {showFeedForm ? '✕' : '+'} {showFeedForm ? t('feeds.cancel') : t('feeds.add')}
            </button>
          </div>
        </div>

        {showFeedForm && (
          <div style={{ marginBottom: '16px' }}>
            <FeedForm onSubmit={handleAddFeed} onCancel={() => setShowFeedForm(false)} />
          </div>
        )}

        {feedsLoading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
            {t('common.loading')}
          </div>
        ) : feeds.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '24px',
            color: 'var(--text-muted)',
            fontSize: '13px'
          }}>
            {t('feeds.noFeeds')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {feeds.map(feed => (
              <div
                key={feed.id}
                className="glass-hover"
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: '4px' }}>
                    <span style={{ 
                      fontSize: '13px', 
                      fontWeight: '500', 
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {feed.title || feed.url}
                    </span>
                    <span style={{
                      fontSize: '9px',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontFamily: 'JetBrains Mono, monospace',
                      background: feed.source_type === 'rss' ? 'rgba(255, 152, 0, 0.15)' : 'rgba(156, 39, 176, 0.15)',
                      color: feed.source_type === 'rss' ? '#ff9800' : '#ce93d8'
                    }}>
                      {feed.source_type.toUpperCase()}
                    </span>
                    <div className="status-dot" style={{ 
                      background: feed.is_active ? 'var(--accent-green)' : 'var(--text-muted)',
                      width: '5px',
                      height: '5px'
                    }} />
                  </div>
                  <p style={{ 
                    fontSize: '11px', 
                    color: 'var(--text-muted)',
                    fontFamily: 'JetBrains Mono, monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {feed.url}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleFetchOne(feed.id)}
                    disabled={fetchingIds.has(feed.id)}
                    style={{
                      padding: '5px 10px',
                      background: 'rgba(0, 212, 255, 0.1)',
                      border: '1px solid rgba(0, 212, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'var(--accent-cyan)',
                      fontSize: '11px',
                      cursor: fetchingIds.has(feed.id) ? 'not-allowed' : 'pointer',
                      opacity: fetchingIds.has(feed.id) ? 0.5 : 1
                    }}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => handleDeleteFeed(feed.id)}
                    style={{
                      padding: '5px 10px',
                      background: 'rgba(255, 82, 82, 0.1)',
                      border: '1px solid rgba(255, 82, 82, 0.2)',
                      borderRadius: '4px',
                      color: '#ff5252',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LLM Section */}
      <div style={{ ...cardStyle, marginTop: '16px' }} className="animate-fadeIn">
        <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 212, 255, 0.05) 100%)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '16px' }}>🤖</span>
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>
              {t('settings.llm')}
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              OPENAI COMPATIBLE API
            </p>
          </div>
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
              {t('settings.baseUrl')}
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(0, 212, 255, 0.5)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-primary)'}
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
              {t('settings.apiKey')}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-..."
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(0, 212, 255, 0.5)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-primary)'}
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
              {t('settings.model')}
            </label>
            <input
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="gpt-4o-mini"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(0, 212, 255, 0.5)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-primary)'}
            />
          </div>
          <div className="flex gap-3" style={{ marginTop: '8px' }}>
            <button
              onClick={handleSaveLLM}
              disabled={saving}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, rgba(212, 168, 83, 0.2) 0%, rgba(212, 168, 83, 0.1) 100%)',
                border: '1px solid rgba(212, 168, 83, 0.3)',
                borderRadius: '6px',
                color: '#d4a853',
                fontSize: '13px',
                fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.5 : 1
              }}
            >
              {saving ? '⏳ ' : '💾 '}{saving ? t('common.loading') : t('settings.save')}
            </button>
            <button
              onClick={handleTest}
              style={{
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-primary)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              🔗 {t('settings.testConnection')}
            </button>
            {testResult !== null && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                color: testResult.ok ? 'var(--accent-green)' : '#ff5252'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {testResult.ok ? '✓ CONNECTED' : '✕ FAILED'}
                </span>
                {testResult.error && (
                  <span style={{ fontSize: '11px', color: '#ff5252', opacity: 0.8 }}>
                    {testResult.error}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RSS Settings */}
      <div style={{ ...cardStyle, marginTop: '16px' }} className="animate-fadeIn">
        <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(0, 230, 118, 0.2) 0%, rgba(0, 230, 118, 0.05) 100%)',
            border: '1px solid rgba(0, 230, 118, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '16px' }}>⏱️</span>
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>
              RSS Settings
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              FETCH CONFIGURATION
            </p>
          </div>
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
              {t('settings.fetchInterval')}
            </label>
            <input
              type="number"
              value={interval}
              onChange={e => handleIntervalChange(e.target.value)}
              min={1}
              style={{ ...inputStyle, width: '120px' }}
              onFocus={e => e.target.style.borderColor = 'rgba(0, 230, 118, 0.5)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-primary)'}
            />
          </div>
          <div className="flex items-center gap-3">
            <label style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={auto}
                onChange={e => handleAutoAnalyzeChange(e.target.checked)}
                style={{ display: 'none' }}
              />
              <div style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                background: auto 
                  ? 'linear-gradient(135deg, rgba(212, 168, 83, 0.3) 0%, rgba(212, 168, 83, 0.2) 100%)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: `1px solid ${auto ? 'rgba(212, 168, 83, 0.5)' : 'var(--border-primary)'}`,
                position: 'relative',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: auto ? '#d4a853' : 'var(--text-muted)',
                  position: 'absolute',
                  top: '2px',
                  left: auto ? '22px' : '2px',
                  transition: 'all 0.3s ease',
                  boxShadow: auto ? '0 0 10px rgba(212, 168, 83, 0.5)' : 'none'
                }} />
              </div>
            </label>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {t('settings.autoAnalyze')}
            </span>
          </div>
        </div>
      </div>

      {/* Language */}
      <div style={{ ...cardStyle, marginTop: '16px', marginBottom: '32px' }} className="animate-fadeIn">
        <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(68, 138, 255, 0.2) 0%, rgba(68, 138, 255, 0.05) 100%)',
            border: '1px solid rgba(68, 138, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '16px' }}>🌐</span>
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>
              {t('settings.language')}
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              INTERFACE LANGUAGE
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleLanguageChange('zh')}
            style={{
              padding: '10px 24px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: i18n.language === 'zh'
                ? 'linear-gradient(135deg, rgba(212, 168, 83, 0.2) 0%, rgba(212, 168, 83, 0.1) 100%)'
                : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${i18n.language === 'zh' ? 'rgba(212, 168, 83, 0.3)' : 'var(--border-primary)'}`,
              color: i18n.language === 'zh' ? '#d4a853' : 'var(--text-secondary)'
            }}
          >
            中文
          </button>
          <button
            onClick={() => handleLanguageChange('en')}
            style={{
              padding: '10px 24px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: i18n.language === 'en'
                ? 'linear-gradient(135deg, rgba(212, 168, 83, 0.2) 0%, rgba(212, 168, 83, 0.1) 100%)'
                : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${i18n.language === 'en' ? 'rgba(212, 168, 83, 0.3)' : 'var(--border-primary)'}`,
              color: i18n.language === 'en' ? '#d4a853' : 'var(--text-secondary)'
            }}
          >
            English
          </button>
        </div>
      </div>

      {/* Font Size */}
      <div style={{ ...cardStyle, marginTop: '16px', marginBottom: '32px' }} className="animate-fadeIn">
        <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(94, 201, 138, 0.2) 0%, rgba(94, 201, 138, 0.05) 100%)',
            border: '1px solid rgba(94, 201, 138, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '16px' }}>🔤</span>
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>
              {t('settings.fontSize')}
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              FONT SIZE
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {[
            { key: 'small', label: t('settings.fontSizeSmall'), desc: '12px' },
            { key: 'medium', label: t('settings.fontSizeMedium'), desc: '14px' },
            { key: 'large', label: t('settings.fontSizeLarge'), desc: '16px' }
          ].map(option => (
            <button
              key={option.key}
              onClick={() => handleFontSizeChange(option.key as any)}
              style={{
                padding: '10px 24px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: fontSize === option.key
                  ? 'linear-gradient(135deg, rgba(94, 201, 138, 0.2) 0%, rgba(94, 201, 138, 0.1) 100%)'
                  : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${fontSize === option.key ? 'rgba(94, 201, 138, 0.3)' : 'var(--border-primary)'}`,
                color: fontSize === option.key ? 'var(--accent-green)' : 'var(--text-secondary)'
              }}
            >
              {option.label} ({option.desc})
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
