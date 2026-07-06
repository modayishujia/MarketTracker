import { useTranslation } from 'react-i18next'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { t } = useTranslation()
  
  const navItems = [
    { key: 'sources', icon: '📰', label: t('nav.sources') },
    { key: 'sentiment', icon: '📊', label: t('nav.sentiment') },
    { key: 'trending', icon: '🔥', label: t('nav.trending') },
    { key: 'settings', icon: '⚙️', label: t('nav.settings') }
  ]

  return (
    <aside 
      className="flex flex-col"
      style={{ 
        width: '220px',
        background: 'linear-gradient(180deg, rgba(12, 12, 20, 0.98) 0%, rgba(8, 8, 16, 0.98) 100%)',
        borderRight: '1px solid var(--border-primary)'
      }}
    >
      {/* Logo Area */}
      <div 
        className="p-5"
        style={{ 
          borderBottom: '1px solid var(--border-primary)',
          background: 'linear-gradient(180deg, rgba(212, 168, 83, 0.05) 0%, transparent 100%)'
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #d4a853 0%, #b8923a 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(212, 168, 83, 0.3)'
            }}
          >
            <span style={{ fontSize: '16px' }}>📈</span>
          </div>
          <div>
            <h1 style={{ 
              fontSize: '15px', 
              fontWeight: '600',
              color: 'var(--text-primary)',
              lineHeight: '1.2'
            }}>
              MoneyAnalysis
            </h1>
            <div style={{ 
              fontSize: '10px', 
              color: 'var(--text-muted)',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginTop: '2px'
            }}>
              v1.0.0
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        {navItems.map(item => {
          const isActive = currentPage === item.key
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className="w-full flex items-center gap-3 rounded-lg mb-1 transition-all duration-200"
              style={{
                padding: '12px 14px',
                background: isActive 
                  ? 'linear-gradient(90deg, rgba(212, 168, 83, 0.15) 0%, rgba(212, 168, 83, 0.05) 100%)'
                  : 'transparent',
                borderLeft: isActive ? '2px solid #d4a853' : '2px solid transparent',
                color: isActive ? '#d4a853' : 'var(--text-secondary)',
              }}
            >
              <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>
                {item.icon}
              </span>
              <span style={{ 
                fontSize: '13px', 
                fontWeight: isActive ? '500' : '400',
                letterSpacing: '0.3px'
              }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Status Bar */}
      <div 
        className="p-4"
        style={{ 
          borderTop: '1px solid var(--border-primary)',
          background: 'rgba(0, 0, 0, 0.2)'
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="status-dot" style={{ background: 'var(--accent-green)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            System Online
          </span>
        </div>
        <div style={{ 
          fontSize: '10px', 
          color: 'var(--text-muted)',
          fontFamily: 'JetBrains Mono, monospace'
        }}>
          {new Date().toLocaleDateString('zh-CN')}
        </div>
      </div>
    </aside>
  )
}
