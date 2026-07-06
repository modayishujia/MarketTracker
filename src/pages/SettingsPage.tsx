import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../stores/settingsStore'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const {
    llmConfig, fetchInterval, autoAnalyze,
    loadSettings, saveLLMConfig, saveFetchInterval, saveAutoAnalyze, saveLanguage, testConnection
  } = useSettingsStore()

  const [baseUrl, setBaseUrl] = useState(llmConfig.baseUrl)
  const [apiKey, setApiKey] = useState(llmConfig.apiKey)
  const [model, setModel] = useState(llmConfig.model)
  const [interval, setInterval] = useState(fetchInterval)
  const [auto, setAuto] = useState(autoAnalyze)
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadSettings() }, [loadSettings])
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
    const result = await testConnection()
    setTestResult(result)
  }

  const handleLanguageChange = async (lang: string) => {
    i18n.changeLanguage(lang)
    await saveLanguage(lang)
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
    <div style={{ padding: '24px 32px', maxWidth: '800px' }}>
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

      {/* LLM Section */}
      <div style={cardStyle} className="animate-fadeIn">
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
                opacity: saving ? 0.5 : 1,
                transition: 'all 0.2s ease'
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
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🔗 {t('settings.testConnection')}
            </button>
            {testResult !== null && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                color: testResult ? 'var(--accent-green)' : '#ff5252'
              }}>
                {testResult ? '✓ CONNECTED' : '✕ FAILED'}
              </span>
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
            <span style={{ fontSize: '16px' }}>📡</span>
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>
              RSS Settings
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              FEED CONFIGURATION
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
      <div style={{ ...cardStyle, marginTop: '16px' }} className="animate-fadeIn">
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
    </div>
  )
}
