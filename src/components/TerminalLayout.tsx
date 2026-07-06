import { useState, useEffect } from 'react'
import { NewsFeed } from './panels/NewsFeed'
import { MarketPulse } from './panels/MarketPulse'
import { AIBriefing } from './panels/AIBriefing'
import { OpportunityScanner } from './panels/OpportunityScanner'
import { SettingsPanel } from './panels/SettingsPanel'

type Panel = 'news' | 'pulse' | 'briefing' | 'opportunities' | 'settings'

export function TerminalLayout() {
  const [activePanel, setActivePanel] = useState<Panel>('news')
  const [showSettings, setShowSettings] = useState(false)
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

  const loadStats = async () => {
    try {
      const articles = await (window as any).electronAPI.articles.getCount()
      const analyses = await (window as any).electronAPI.analyses.getCount()
      setArticleCount(articles)
      setAnalysisCount(analyses)
    } catch {}
  }

  const navItems = [
    { key: 'news' as Panel, icon: '📰', label: 'FEED', desc: 'News Stream' },
    { key: 'pulse' as Panel, icon: '📊', label: 'PULSE', desc: 'Sentiment' },
    { key: 'briefing' as Panel, icon: '🤖', label: 'BRIEF', desc: 'AI Report' },
    { key: 'opportunities' as Panel, icon: '🎯', label: 'ALPHA', desc: 'Signals' },
  ]

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      overflow: 'hidden'
    }}>
      {/* Top Ticker Bar */}
      <div style={{
        height: '28px',
        background: 'linear-gradient(90deg, #0a0a14 0%, #0e0e1a 50%, #0a0a14 100%)',
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Logo + Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '18px',
              height: '18px',
              background: 'linear-gradient(135deg, #d4a853 0%, #b8923a 100%)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: '700',
              color: '#000'
            }}>M</div>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: '600',
              color: '#d4a853',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '1.5px'
            }}>
              MONEYANALYSIS
            </span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'var(--border-primary)' }} />

          <span style={{ 
            fontSize: '9px', 
            color: 'var(--text-muted)',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '1px'
          }}>
            AI-POWERED TERMINAL
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>ARTICLES</span>
              <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontFamily: 'JetBrains Mono, monospace', fontWeight: '500' }}>
                {articleCount}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>ANALYSES</span>
              <span style={{ fontSize: '11px', color: '#d4a853', fontFamily: 'JetBrains Mono, monospace', fontWeight: '500' }}>
                {analysisCount}
              </span>
            </div>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'var(--border-primary)' }} />

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="status-dot" style={{ background: 'var(--accent-green)', width: '5px', height: '5px' }} />
            <span style={{ fontSize: '9px', color: 'var(--accent-green)', fontFamily: 'JetBrains Mono, monospace' }}>LIVE</span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'var(--border-primary)' }} />

          {/* Time */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              fontSize: '12px', 
              color: 'var(--text-primary)',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: '500',
              lineHeight: '1'
            }}>
              {formatTime(currentTime)}
            </div>
            <div style={{ 
              fontSize: '9px', 
              color: 'var(--text-muted)',
              fontFamily: 'JetBrains Mono, monospace',
              lineHeight: '1'
            }}>
              {formatDate(currentTime)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Navigation */}
        <nav style={{
          width: '64px',
          background: 'linear-gradient(180deg, #08080f 0%, #06060a 100%)',
          borderRight: '1px solid var(--border-primary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px 0',
          flexShrink: 0
        }}>
          {/* Nav Items */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', padding: '0 8px' }}>
            {navItems.map(item => {
              const isActive = activePanel === item.key && !showSettings
              return (
                <button
                  key={item.key}
                  onClick={() => { setActivePanel(item.key); setShowSettings(false) }}
                  title={item.desc}
                  style={{
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    background: isActive ? 'rgba(212, 168, 83, 0.08)' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: '10px',
                      bottom: '10px',
                      width: '2px',
                      background: '#d4a853',
                      borderRadius: '1px'
                    }} />
                  )}
                  <span style={{ fontSize: '18px', opacity: isActive ? 1 : 0.6 }}>{item.icon}</span>
                  <span style={{ 
                    fontSize: '8px', 
                    fontFamily: 'JetBrains Mono, monospace',
                    color: isActive ? '#d4a853' : 'var(--text-muted)',
                    letterSpacing: '0.5px',
                    fontWeight: isActive ? '600' : '400'
                  }}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              width: '48px',
              height: '40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              background: showSettings ? 'rgba(255,255,255,0.05)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '16px', opacity: showSettings ? 1 : 0.6 }}>⚙️</span>
            <span style={{ 
              fontSize: '7px', 
              color: 'var(--text-muted)',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              CONFIG
            </span>
          </button>
        </nav>

        {/* Panel Content */}
        <main style={{ flex: 1, overflow: 'hidden' }}>
          {showSettings ? (
            <SettingsPanel onClose={() => setShowSettings(false)} />
          ) : (
            <>
              {activePanel === 'news' && <NewsFeed onStatsUpdate={loadStats} />}
              {activePanel === 'pulse' && <MarketPulse />}
              {activePanel === 'briefing' && <AIBriefing />}
              {activePanel === 'opportunities' && <OpportunityScanner />}
            </>
          )}
        </main>
      </div>

      {/* Bottom Status Bar */}
      <div style={{
        height: '24px',
        background: 'rgba(0,0,0,0.4)',
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
            {articleCount} articles loaded
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            Powered by AI
          </span>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
          </span>
        </div>
      </div>
    </div>
  )
}
