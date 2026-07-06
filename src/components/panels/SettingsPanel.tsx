import { useState, useEffect } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useFeedStore } from '../../stores/feedStore'
import { FeedForm } from '../FeedForm'

interface Props {
  onClose: () => void
}

export function SettingsPanel({ onClose }: Props) {
  const { 
    llmConfig, fetchInterval, autoAnalyze,
    saveLLMConfig, saveFetchInterval, saveAutoAnalyze, testConnection 
  } = useSettingsStore()
  const { feeds, loadFeeds, addFeed, deleteFeed } = useFeedStore()

  const [baseUrl, setBaseUrl] = useState(llmConfig.baseUrl)
  const [apiKey, setApiKey] = useState(llmConfig.apiKey)
  const [model, setModel] = useState(llmConfig.model)
  const [interval, setInterval] = useState(fetchInterval)
  const [auto, setAuto] = useState(autoAnalyze)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [showFeedForm, setShowFeedForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'llm' | 'feeds' | 'general'>('llm')

  useEffect(() => {
    loadFeeds()
  }, [])

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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-primary)',
        background: 'rgba(0,0,0,0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ 
            fontSize: '9px', 
            color: 'var(--text-muted)',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '1.5px',
            marginBottom: '4px'
          }}>
            CONFIGURATION
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Settings</h2>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-primary)',
            borderRadius: '4px',
            color: 'var(--text-secondary)',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-primary)',
        background: 'rgba(0,0,0,0.1)'
      }}>
        {(['llm', 'feeds', 'general'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              background: activeTab === tab ? 'rgba(212, 168, 83, 0.05)' : 'transparent',
              borderBottom: activeTab === tab ? '2px solid #d4a853' : '2px solid transparent',
              color: activeTab === tab ? '#d4a853' : 'var(--text-muted)',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              textTransform: 'uppercase',
              cursor: 'pointer'
            }}
          >
            {tab === 'llm' ? '🤖 AI Model' : tab === 'feeds' ? '📡 Feeds' : '⚙️ General'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="scroll-area" style={{ flex: 1, padding: '20px' }}>
        {activeTab === 'llm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '10px', 
                color: 'var(--text-muted)',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.5px',
                marginBottom: '6px'
              }}>
                API BASE URL
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'rgba(0, 212, 255, 0.4)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-primary)'}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '10px', 
                color: 'var(--text-muted)',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.5px',
                marginBottom: '6px'
              }}>
                API KEY
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-..."
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'rgba(0, 212, 255, 0.4)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-primary)'}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '10px', 
                color: 'var(--text-muted)',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.5px',
                marginBottom: '6px'
              }}>
                MODEL
              </label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="gpt-4o-mini"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'rgba(0, 212, 255, 0.4)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-primary)'}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={handleSaveLLM}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, rgba(212, 168, 83, 0.2) 0%, rgba(212, 168, 83, 0.1) 100%)',
                  border: '1px solid rgba(212, 168, 83, 0.3)',
                  borderRadius: '6px',
                  color: '#d4a853',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.5 : 1
                }}
              >
                {saving ? '⏳ Saving...' : '💾 Save'}
              </button>
              <button
                onClick={handleTest}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                🔗 Test Connection
              </button>
            </div>
            {testResult && (
              <div style={{
                padding: '10px 14px',
                background: testResult.ok ? 'rgba(0, 230, 118, 0.08)' : 'rgba(255, 82, 82, 0.08)',
                border: `1px solid ${testResult.ok ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 82, 82, 0.2)'}`,
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                color: testResult.ok ? '#00e676' : '#ff5252'
              }}>
                {testResult.ok ? '✓ Connection successful' : `✕ ${testResult.error}`}
              </div>
            )}
          </div>
        )}

        {activeTab === 'feeds' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ 
                fontSize: '11px', 
                color: 'var(--text-muted)',
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                {feeds.length} FEEDS CONFIGURED
              </span>
              <button
                onClick={() => setShowFeedForm(!showFeedForm)}
                style={{
                  padding: '6px 14px',
                  background: showFeedForm 
                    ? 'rgba(255, 82, 82, 0.1)' 
                    : 'linear-gradient(135deg, rgba(212, 168, 83, 0.15) 0%, rgba(212, 168, 83, 0.05) 100%)',
                  border: `1px solid ${showFeedForm ? 'rgba(255, 82, 82, 0.2)' : 'rgba(212, 168, 83, 0.2)'}`,
                  borderRadius: '4px',
                  color: showFeedForm ? '#ff5252' : '#d4a853',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                {showFeedForm ? '✕ Cancel' : '+ Add Feed'}
              </button>
            </div>

            {showFeedForm && (
              <div style={{ marginBottom: '16px' }}>
                <FeedForm onSubmit={async (url, type) => { await addFeed(url, type); setShowFeedForm(false) }} onCancel={() => setShowFeedForm(false)} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {feeds.map(feed => (
                <div
                  key={feed.id}
                  className="glass-hover"
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '500' }}>{feed.title}</div>
                    <div style={{ 
                      fontSize: '10px', 
                      color: 'var(--text-muted)',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}>
                      {feed.url}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteFeed(feed.id)}
                    style={{
                      padding: '4px 10px',
                      background: 'rgba(255, 82, 82, 0.1)',
                      border: '1px solid rgba(255, 82, 82, 0.2)',
                      borderRadius: '3px',
                      color: '#ff5252',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '10px', 
                color: 'var(--text-muted)',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.5px',
                marginBottom: '6px'
              }}>
                FETCH INTERVAL (MINUTES)
              </label>
              <input
                type="number"
                value={interval}
                onChange={e => { setInterval(Number(e.target.value)); saveFetchInterval(Number(e.target.value)) }}
                min={1}
                style={{ ...inputStyle, width: '120px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                onClick={() => { setAuto(!auto); saveAutoAnalyze(!auto) }}
                style={{
                  width: '40px',
                  height: '22px',
                  borderRadius: '11px',
                  background: auto ? 'rgba(212, 168, 83, 0.3)' : 'rgba(255,255,255,0.1)',
                  border: `1px solid ${auto ? 'rgba(212, 168, 83, 0.5)' : 'var(--border-primary)'}`,
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: auto ? '#d4a853' : 'var(--text-muted)',
                  position: 'absolute',
                  top: '2px',
                  left: auto ? '20px' : '2px',
                  transition: 'all 0.2s ease'
                }} />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Auto-analyze new articles
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
