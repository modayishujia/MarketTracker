import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { NewsFeed } from './panels/NewsFeed'
import { MarketPulse } from './panels/MarketPulse'
import { AIBriefing } from './panels/AIBriefing'
import { OpportunityScanner } from './panels/OpportunityScanner'
import { SettingsPanel } from './panels/SettingsPanel'
import { useSettingsStore } from '../stores/settingsStore'

type Panel = 'feed' | 'pulse' | 'brief' | 'alpha' | 'settings'

export function TerminalLayout() {
  const { t, i18n } = useTranslation()
  const { language, theme, autoAnalyze, saveLanguage, saveTheme, saveAutoAnalyze } = useSettingsStore()
  const [activePanel, setActivePanel] = useState<Panel>('feed')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [articleCount, setArticleCount] = useState(0)
  const [analysisCount, setAnalysisCount] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    if (language) {
      i18n.changeLanguage(language)
    }
  }, [language, i18n])

  const loadStats = async () => {
    try {
      const articles = await (window as any).electronAPI.articles.getCount()
      const analyses = await (window as any).electronAPI.analyses.getCount()
      setArticleCount(articles)
      setAnalysisCount(analyses)
    } catch {}
  }

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    await saveTheme(newTheme)
  }

  const toggleAuto = async () => {
    await saveAutoAnalyze(!autoAnalyze)
  }

  const navItems = [
    { key: 'feed' as Panel, icon: '📰', label: t('nav.feed') },
    { key: 'pulse' as Panel, icon: '📊', label: t('nav.pulse') },
    { key: 'brief' as Panel, icon: '🤖', label: t('nav.brief') },
    { key: 'alpha' as Panel, icon: '🎯', label: t('nav.alpha') },
  ]

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      overflow: 'hidden'
    }}>
      {/* Top Bar */}
      <div style={{
        height: '36px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '22px',
              height: '22px',
              background: 'linear-gradient(135deg, var(--accent-gold) 0%, #a08030 100%)',
              borderRadius: '5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '700',
              color: '#fff',
              boxShadow: 'var(--glow-gold)'
            }}>M</div>
            <div>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: '600',
                color: 'var(--accent-gold)',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '1px'
              }}>
                {t('app.title').toUpperCase()}
              </span>
              <span style={{ 
                fontSize: '8px', 
                color: 'var(--text-muted)',
                marginLeft: '8px',
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                {t('app.subtitle')}
              </span>
            </div>
          </div>

          <div style={{ width: '1px', height: '18px', background: 'var(--border-primary)' }} />

          {/* Stats */}
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                {t('feed.articles').toUpperCase()}
              </span>
              <span style={{ 
                fontSize: '12px', 
                color: 'var(--accent-cyan)', 
                fontFamily: 'JetBrains Mono, monospace', 
                fontWeight: '600' 
              }}>
                {articleCount}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                AI
              </span>
              <span style={{ 
                fontSize: '12px', 
                color: 'var(--accent-gold)', 
                fontFamily: 'JetBrains Mono, monospace', 
                fontWeight: '600' 
              }}>
                {analysisCount}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              padding: '4px 10px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-primary)',
              borderRadius: '3px',
              color: 'var(--text-secondary)',
              fontSize: '10px',
              fontFamily: 'JetBrains Mono, monospace',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ fontSize: '12px' }}>{theme === 'dark' ? '🌙' : '☀️'}</span>
            {theme === 'dark' ? 'DARK' : 'LIGHT'}
          </button>

          <div style={{ width: '1px', height: '18px', background: 'var(--border-primary)' }} />

          {/* AUTO Toggle */}
          <button
            onClick={toggleAuto}
            style={{
              padding: '4px 10px',
              background: autoAnalyze
                ? 'var(--accent-green-dim)'
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${autoAnalyze ? 'rgba(94, 201, 138, 0.3)' : 'var(--border-primary)'}`,
              borderRadius: '3px',
              color: autoAnalyze ? 'var(--accent-green)' : 'var(--text-muted)',
              fontSize: '10px',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              letterSpacing: '0.5px'
            }}
          >
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: autoAnalyze ? 'var(--accent-green)' : 'var(--text-muted)',
              animation: autoAnalyze ? 'pulse 2s infinite' : 'none'
            }} />
            AUTO
          </button>

          <div style={{ width: '1px', height: '18px', background: 'var(--border-primary)' }} />

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="status-dot" style={{ background: 'var(--accent-green)', width: '5px', height: '5px' }} />
            <span style={{ fontSize: '9px', color: 'var(--accent-green)', fontFamily: 'JetBrains Mono, monospace' }}>LIVE</span>
          </div>

          <div style={{ width: '1px', height: '18px', background: 'var(--border-primary)' }} />

          {/* Time */}
          <span style={{ 
            fontSize: '12px', 
            color: 'var(--text-primary)',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: '500'
          }}>
            {formatTime(currentTime)}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Nav */}
        <nav style={{
          width: '72px',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-primary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '20px 0',
          flexShrink: 0
        }}>
          {/* Nav Items */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', padding: '0 10px' }}>
            {navItems.map(item => {
              const isActive = activePanel === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => setActivePanel(item.key)}
                  style={{
                    width: '52px',
                    height: '52px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    background: isActive ? 'var(--accent-gold-dim)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: '12px',
                      bottom: '12px',
                      width: '3px',
                      background: 'var(--accent-gold)',
                      borderRadius: '0 2px 2px 0'
                    }} />
                  )}
                  <span style={{ fontSize: '20px', opacity: isActive ? 1 : 0.5 }}>{item.icon}</span>
                  <span style={{ 
                    fontSize: '9px', 
                    fontFamily: 'JetBrains Mono, monospace',
                    color: isActive ? 'var(--accent-gold)' : 'var(--text-muted)',
                    fontWeight: isActive ? '600' : '400',
                    letterSpacing: '0.3px'
                  }}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Settings */}
          <button
            onClick={() => setActivePanel(activePanel === 'settings' ? 'feed' : 'settings')}
            style={{
              width: '52px',
              height: '44px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              background: activePanel === 'settings' ? 'var(--accent-gold-dim)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '18px', opacity: activePanel === 'settings' ? 1 : 0.5 }}>⚙️</span>
            <span style={{ 
              fontSize: '8px', 
              color: 'var(--text-muted)',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              {t('nav.settings')}
            </span>
          </button>
        </nav>

        {/* Panel Content */}
        <main style={{ flex: 1, overflow: 'hidden' }}>
          {activePanel === 'settings' ? (
            <SettingsPanel onClose={() => setActivePanel('feed')} />
          ) : (
            <>
              {activePanel === 'feed' && <NewsFeed onStatsUpdate={loadStats} />}
              {activePanel === 'pulse' && <MarketPulse />}
              {activePanel === 'brief' && <AIBriefing />}
              {activePanel === 'alpha' && <OpportunityScanner />}
            </>
          )}
        </main>
      </div>

      {/* Bottom Bar */}
      <div style={{
        height: '22px',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            v1.0.0
          </span>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            {t('feed.articles')}: {articleCount}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            AI-Powered
          </span>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            {currentTime.toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US')}
          </span>
        </div>
      </div>
    </div>
  )
}
