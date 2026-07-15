import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../stores/settingsStore'
import { useFeedStore } from '../../stores/feedStore'
import { FeedForm } from '../FeedForm'

interface Props {
  onClose: () => void
}

export function SettingsPanel({ onClose }: Props) {
  const { t, i18n } = useTranslation()
  const { 
    llmConfig, fetchInterval, autoAnalyze, language, theme,
    saveLLMConfig, saveFetchInterval, saveAutoAnalyze, saveLanguage, saveTheme, testConnection 
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
  const [activeTab, setActiveTab] = useState<'llm' | 'feeds' | 'general' | 'prompt' | 'mcp'>('llm')
  const [customPrompt, setCustomPrompt] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadFeeds()
    const saved = (window as any).electronAPI?.settings?.get
    if (saved) {
      saved('customPrompt').then((v: string | undefined) => {
        if (v) setCustomPrompt(v)
      })
    }
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

  const handleSavePrompt = async () => {
    await (window as any).electronAPI.settings.set('customPrompt', customPrompt)
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

  const tabs = [
    { key: 'llm' as const, icon: '🤖', label: t('settings.tabAI') },
    { key: 'feeds' as const, icon: '📡', label: t('settings.tabFeeds') },
    { key: 'prompt' as const, icon: '✏️', label: t('settings.tabPrompt') },
    { key: 'mcp' as const, icon: '🔗', label: 'MCP' },
    { key: 'general' as const, icon: '⚙️', label: t('settings.tabGeneral') }
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-primary)',
        background: 'var(--bg-secondary)',
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
            {t('settings.configLabel')}
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '600' }}>{t('settings.title')}</h2>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            borderRadius: '4px',
            color: 'var(--text-secondary)',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          ✕ {t('common.close')}
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-primary)',
        background: 'var(--bg-secondary)'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 16px',
              background: activeTab === tab.key ? 'var(--accent-gold-dim)' : 'transparent',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent-gold)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--accent-gold)' : 'var(--text-muted)',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              cursor: 'pointer'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="scroll-area" style={{ flex: 1, padding: '20px' }}>
        {/* AI Model */}
        {activeTab === 'llm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', marginBottom: '6px' }}>
                {t('settings.apiBaseUrl')}
              </label>
              <input type="text" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent-cyan)'} onBlur={e => e.target.style.borderColor = 'var(--border-primary)'} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', marginBottom: '6px' }}>
                {t('settings.apiKey')}
              </label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent-cyan)'} onBlur={e => e.target.style.borderColor = 'var(--border-primary)'} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', marginBottom: '6px' }}>
                {t('settings.model')}
              </label>
              <input type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="gpt-4o-mini" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent-cyan)'} onBlur={e => e.target.style.borderColor = 'var(--border-primary)'} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button onClick={handleSaveLLM} disabled={saving} style={{
                padding: '10px 20px', background: 'var(--accent-gold-dim)', border: '1px solid var(--border-accent)',
                borderRadius: '6px', color: 'var(--accent-gold)', fontSize: '12px', fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1
              }}>
                {saving ? `⏳ ${t('common.loading')}` : `💾 ${t('settings.save')}`}
              </button>
              <button onClick={handleTest} style={{
                padding: '10px 20px', background: 'var(--bg-card)',
                border: '1px solid var(--border-primary)', borderRadius: '6px',
                color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer'
              }}>
                🔗 {t('settings.testConnection')}
              </button>
            </div>
            {testResult && (
              <div style={{
                padding: '10px 14px',
                background: testResult.ok ? 'rgba(94,201,138,0.08)' : 'rgba(224,85,85,0.08)',
                border: `1px solid ${testResult.ok ? 'rgba(94,201,138,0.2)' : 'rgba(224,85,85,0.2)'}`,
                borderRadius: '4px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace',
                color: testResult.ok ? 'var(--accent-green)' : 'var(--accent-red)'
              }}>
                {testResult.ok ? `✓ ${t('settings.connectionSuccess')}` : `✕ ${testResult.error}`}
              </div>
            )}
          </div>
        )}

        {/* Feeds */}
        {activeTab === 'feeds' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                {feeds.length} {t('settings.feedsConfigured')}
              </span>
              <button onClick={() => setShowFeedForm(!showFeedForm)} style={{
                padding: '6px 14px',
                background: showFeedForm ? 'rgba(224,85,85,0.1)' : 'var(--accent-gold-dim)',
                border: `1px solid ${showFeedForm ? 'rgba(224,85,85,0.2)' : 'var(--border-accent)'}`,
                borderRadius: '4px', color: showFeedForm ? 'var(--accent-red)' : 'var(--accent-gold)',
                fontSize: '11px', cursor: 'pointer'
              }}>
                {showFeedForm ? `✕ ${t('common.cancel')}` : `+ ${t('settings.addFeed')}`}
              </button>
            </div>
            {showFeedForm && (
              <div style={{ marginBottom: '16px' }}>
                <FeedForm onSubmit={async (url, type) => { await addFeed(url, type); setShowFeedForm(false) }} onCancel={() => setShowFeedForm(false)} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {feeds.map(feed => (
                <div key={feed.id} className="glass-hover" style={{
                  padding: '10px 14px', borderRadius: '6px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '500' }}>{feed.title}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{feed.url}</div>
                  </div>
                  <button onClick={() => deleteFeed(feed.id)} style={{
                    padding: '4px 10px', background: 'rgba(224,85,85,0.1)',
                    border: '1px solid rgba(224,85,85,0.2)', borderRadius: '3px',
                    color: 'var(--accent-red)', fontSize: '10px', cursor: 'pointer'
                  }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Prompt */}
        {activeTab === 'prompt' && (
          <div style={{ maxWidth: '600px' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: '500' }}>
                {t('settings.customPromptTitle')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.6' }}>
                {t('settings.customPromptDesc')}
              </div>
              <textarea
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder={t('settings.customPromptPlaceholder')}
                style={{
                  width: '100%', minHeight: '160px', padding: '14px',
                  background: 'var(--bg-primary)', border: '1px solid var(--border-primary)',
                  borderRadius: '8px', color: 'var(--text-primary)',
                  fontSize: '13px', lineHeight: '1.7', resize: 'vertical', fontFamily: 'inherit'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-purple)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-primary)'}
              />
            </div>
            <button onClick={handleSavePrompt} style={{
              padding: '10px 20px', background: 'rgba(160,128,208,0.1)',
              border: '1px solid rgba(160,128,208,0.2)', borderRadius: '6px',
              color: 'var(--accent-purple)', fontSize: '12px', fontWeight: '500', cursor: 'pointer'
            }}>
              💾 {t('settings.save')}
            </button>
          </div>
        )}

        {/* General */}
        {activeTab === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px' }}>
            {/* Language */}
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', marginBottom: '10px' }}>
                {t('settings.language')}
              </label>
              <div className="flex gap-2">
                <button onClick={() => { i18n.changeLanguage('zh'); saveLanguage('zh') }} style={{
                  padding: '8px 20px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease',
                  background: language === 'zh' ? 'var(--accent-gold-dim)' : 'var(--bg-card)',
                  border: `1px solid ${language === 'zh' ? 'var(--border-accent)' : 'var(--border-primary)'}`,
                  color: language === 'zh' ? 'var(--accent-gold)' : 'var(--text-secondary)'
                }}>中文</button>
                <button onClick={() => { i18n.changeLanguage('en'); saveLanguage('en') }} style={{
                  padding: '8px 20px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease',
                  background: language === 'en' ? 'var(--accent-gold-dim)' : 'var(--bg-card)',
                  border: `1px solid ${language === 'en' ? 'var(--border-accent)' : 'var(--border-primary)'}`,
                  color: language === 'en' ? 'var(--accent-gold)' : 'var(--text-secondary)'
                }}>English</button>
              </div>
            </div>

            {/* Theme */}
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', marginBottom: '10px' }}>
                {t('settings.theme')}
              </label>
              <div className="flex gap-2">
                <button onClick={() => saveTheme('dark')} style={{
                  padding: '8px 20px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease',
                  background: theme === 'dark' ? 'var(--accent-gold-dim)' : 'var(--bg-card)',
                  border: `1px solid ${theme === 'dark' ? 'var(--border-accent)' : 'var(--border-primary)'}`,
                  color: theme === 'dark' ? 'var(--accent-gold)' : 'var(--text-secondary)'
                }}>🌙 {t('settings.dark')}</button>
                <button onClick={() => saveTheme('light')} style={{
                  padding: '8px 20px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease',
                  background: theme === 'light' ? 'var(--accent-gold-dim)' : 'var(--bg-card)',
                  border: `1px solid ${theme === 'light' ? 'var(--border-accent)' : 'var(--border-primary)'}`,
                  color: theme === 'light' ? 'var(--accent-gold)' : 'var(--text-secondary)'
                }}>☀️ {t('settings.light')}</button>
              </div>
            </div>

            {/* Fetch Interval */}
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', marginBottom: '6px' }}>
                {t('settings.fetchInterval')}
              </label>
              <input type="number" value={interval} onChange={e => { setInterval(Number(e.target.value)); saveFetchInterval(Number(e.target.value)) }} min={1}
                style={{ ...inputStyle, width: '120px' }} />
            </div>

            {/* Auto Analyze */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div onClick={() => { setAuto(!auto); saveAutoAnalyze(!auto) }} style={{
                width: '40px', height: '22px', borderRadius: '11px',
                background: auto ? 'var(--accent-gold-dim)' : 'var(--bg-elevated)',
                border: `1px solid ${auto ? 'var(--border-accent)' : 'var(--border-primary)'}`,
                position: 'relative', cursor: 'pointer', transition: 'all 0.2s ease'
              }}>
                <div style={{
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: auto ? 'var(--accent-gold)' : 'var(--text-muted)',
                  position: 'absolute', top: '2px', left: auto ? '20px' : '2px', transition: 'all 0.2s ease'
                }} />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('settings.autoAnalyze')}</span>
            </div>
          </div>
        )}

        {/* MCP Tab */}
        {activeTab === 'mcp' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'auto', flex: 1 }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                MCP Server
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                {i18n.language === 'zh'
                  ? 'MarketTracker 提供本地 MCP 服务，可被 OpenClaw、Claude Desktop、Cursor 等 AI 客户端连接，直接查询市场数据和分析结果。'
                  : 'MarketTracker provides a local MCP server that AI clients like OpenClaw, Claude Desktop, and Cursor can connect to for querying market data and analysis results.'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', marginBottom: '6px' }}>
                {i18n.language === 'zh' ? '连接地址' : 'Endpoint'}
              </div>
              <div style={{
                padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)',
                borderRadius: '6px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px',
                color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <span>http://localhost:19877</span>
                <button onClick={() => {
                  navigator.clipboard.writeText('http://localhost:19877')
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }} style={{
                  padding: '4px 10px', background: copied ? '#22c55e22' : 'var(--surface)',
                  border: `1px solid ${copied ? '#22c55e' : 'var(--border)'}`,
                  borderRadius: '4px', color: copied ? '#22c55e' : 'var(--text-muted)', fontSize: '10px', cursor: 'pointer'
                }}>{copied ? '✓' : 'Copy'}</button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', marginBottom: '6px' }}>
                {i18n.language === 'zh' ? '客户端配置' : 'Client Config'}
              </div>
              <div style={{
                padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)',
                borderRadius: '6px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px',
                color: 'var(--text-secondary)', lineHeight: '1.6', position: 'relative'
              }}>
                <div style={{ color: 'var(--accent-gold)' }}>{`"mcpServers": {`}</div>
                <div style={{ paddingLeft: '16px', color: 'var(--accent-gold)' }}>{`"markettracker": {`}</div>
                <div style={{ paddingLeft: '32px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>"url"</span>: <span style={{ color: '#22c55e' }}>"http://localhost:19877"</span>
                </div>
                <div style={{ paddingLeft: '16px', color: 'var(--accent-gold)' }}>{`}`}</div>
                <div style={{ color: 'var(--accent-gold)' }}>{`}`}</div>
                <button onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify({ mcpServers: { markettracker: { url: 'http://localhost:19877' } } }, null, 2))
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }} style={{
                  position: 'absolute', top: '8px', right: '8px', padding: '4px 10px',
                  background: copied ? '#22c55e22' : 'var(--surface)', border: `1px solid ${copied ? '#22c55e' : 'var(--border)'}`,
                  borderRadius: '4px', color: copied ? '#22c55e' : 'var(--text-muted)', fontSize: '10px', cursor: 'pointer'
                }}>{copied ? '✓' : 'Copy'}</button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', marginBottom: '8px' }}>
                {i18n.language === 'zh' ? '可用工具' : 'Available Tools'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  { name: 'list_articles', desc: i18n.language === 'zh' ? '查询文章列表（支持筛选）' : 'List articles with filters' },
                  { name: 'get_article', desc: i18n.language === 'zh' ? '获取文章详情和 AI 分析' : 'Get article detail + AI analysis' },
                  { name: 'search_articles', desc: i18n.language === 'zh' ? '全文搜索文章' : 'Full-text search articles' },
                  { name: 'get_analyses', desc: i18n.language === 'zh' ? '获取 AI 分析结果' : 'Get AI analysis results' },
                  { name: 'get_market_pulse', desc: i18n.language === 'zh' ? '市场情绪概览' : 'Market sentiment overview' },
                  { name: 'list_signals', desc: i18n.language === 'zh' ? '交易信号列表' : 'Trading signals list' },
                  { name: 'get_company_detail', desc: i18n.language === 'zh' ? '公司详情（产品+信号+文章）' : 'Company detail (products+signals+articles)' },
                  { name: 'list_companies', desc: i18n.language === 'zh' ? '已追踪公司列表' : 'Tracked companies list' },
                  { name: 'list_feeds', desc: i18n.language === 'zh' ? '已订阅 RSS 源' : 'Subscribed RSS feeds' },
                  { name: 'list_feed_sources', desc: i18n.language === 'zh' ? '可订阅的 RSS 源' : 'Available RSS sources' },
                  { name: 'get_stats', desc: i18n.language === 'zh' ? '系统统计概览' : 'System statistics overview' },
                ].map(tool => (
                  <div key={tool.name} style={{
                    padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)',
                    borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '10px'
                  }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--accent-gold)', minWidth: '160px' }}>{tool.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tool.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
