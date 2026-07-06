import { useState } from 'react'
import { NewsFeed } from './panels/NewsFeed'
import { MarketPulse } from './panels/MarketPulse'
import { AIBriefing } from './panels/AIBriefing'
import { OpportunityScanner } from './panels/OpportunityScanner'
import { SettingsPanel } from './panels/SettingsPanel'

type Panel = 'news' | 'pulse' | 'briefing' | 'opportunities' | 'settings'

export function TerminalLayout() {
  const [activePanel, setActivePanel] = useState<Panel>('news')
  const [showSettings, setShowSettings] = useState(false)

  const navItems = [
    { key: 'news' as Panel, icon: '📰', label: 'NEWS', shortcut: '1' },
    { key: 'pulse' as Panel, icon: '📊', label: 'PULSE', shortcut: '2' },
    { key: 'briefing' as Panel, icon: '🤖', label: 'AI BRIEF', shortcut: '3' },
    { key: 'opportunities' as Panel, icon: '🎯', label: 'ALPHA', shortcut: '4' },
  ]

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      background: 'var(--bg-primary)',
      overflow: 'hidden'
    }}>
      {/* Left Navigation Bar */}
      <nav style={{
        width: '56px',
        background: 'linear-gradient(180deg, #08080f 0%, #06060a 100%)',
        borderRight: '1px solid var(--border-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        flexShrink: 0
      }}>
        {/* Logo */}
        <div style={{
          width: '36px',
          height: '36px',
          background: 'linear-gradient(135deg, #d4a853 0%, #b8923a 100%)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: '0 0 15px rgba(212, 168, 83, 0.3)',
          cursor: 'pointer'
        }}>
          <span style={{ fontSize: '18px', fontWeight: '700', color: '#000' }}>M</span>
        </div>

        {/* Main Nav */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', padding: '0 8px' }}>
          {navItems.map(item => {
            const isActive = activePanel === item.key
            return (
              <button
                key={item.key}
                onClick={() => setActivePanel(item.key)}
                title={`${item.label} (${item.shortcut})`}
                style={{
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  background: isActive ? 'rgba(212, 168, 83, 0.1)' : 'transparent',
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
                    top: '8px',
                    bottom: '8px',
                    width: '2px',
                    background: '#d4a853',
                    borderRadius: '1px'
                  }} />
                )}
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span style={{ 
                  fontSize: '8px', 
                  fontFamily: 'JetBrains Mono, monospace',
                  color: isActive ? '#d4a853' : 'var(--text-muted)',
                  letterSpacing: '0.5px'
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
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: showSettings ? 'rgba(255,255,255,0.05)' : 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ⚙️
        </button>
      </nav>

      {/* Main Content Area */}
      <main style={{ 
        flex: 1, 
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Top Status Bar */}
        <header style={{
          height: '32px',
          background: 'rgba(0,0,0,0.3)',
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          flexShrink: 0
        }}>
          <div className="flex items-center gap-4">
            <span style={{ 
              fontSize: '11px', 
              fontWeight: '600',
              color: '#d4a853',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '1px'
            }}>
              MONEYANALYSIS
            </span>
            <div style={{ 
              width: '1px', 
              height: '16px', 
              background: 'var(--border-primary)' 
            }} />
            <span style={{ 
              fontSize: '10px', 
              color: 'var(--text-muted)',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              AI-POWERED TERMINAL
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="status-dot" style={{ background: 'var(--accent-green)', width: '5px', height: '5px' }} />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                LIVE
              </span>
            </div>
            <span style={{ 
              fontSize: '10px', 
              color: 'var(--text-muted)',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              {new Date().toLocaleString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit',
                hour12: false 
              })}
            </span>
          </div>
        </header>

        {/* Panel Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {showSettings ? (
            <SettingsPanel onClose={() => setShowSettings(false)} />
          ) : (
            <>
              {activePanel === 'news' && <NewsFeed />}
              {activePanel === 'pulse' && <MarketPulse />}
              {activePanel === 'briefing' && <AIBriefing />}
              {activePanel === 'opportunities' && <OpportunityScanner />}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
