import { useState } from 'react'

export function AIBriefing() {
  const [briefing, setBriefing] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedScope, setSelectedScope] = useState<'daily' | 'sector' | 'custom'>('daily')

  const generateBriefing = async () => {
    setLoading(true)
    setBriefing(null)
    
    try {
      const articles = await (window as any).electronAPI.articles.getAll({ limit: 50 })
      
      if (articles.length === 0) {
        setBriefing({ error: 'No articles available. Fetch some articles first.' })
        return
      }

      const articleSummaries = articles.slice(0, 20).map((a: any) => ({
        title: a.title,
        content: (a.content || '').substring(0, 300)
      }))

      const result = await (window as any).electronAPI.llm.generateReport(articleSummaries)
      setBriefing(result)
    } catch (err: any) {
      setBriefing({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-primary)',
        background: 'rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ 
              fontSize: '9px', 
              color: 'var(--text-muted)',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '1.5px',
              marginBottom: '4px'
            }}>
              AI INTELLIGENCE
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>
              Market Briefing
            </h2>
          </div>
          
          <button
            onClick={generateBriefing}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: loading 
                ? 'rgba(255,255,255,0.03)'
                : 'linear-gradient(135deg, rgba(212, 168, 83, 0.2) 0%, rgba(212, 168, 83, 0.1) 100%)',
              border: `1px solid ${loading ? 'var(--border-primary)' : 'rgba(212, 168, 83, 0.3)'}`,
              borderRadius: '6px',
              color: loading ? 'var(--text-muted)' : '#d4a853',
              fontSize: '12px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div className="thinking-dot" style={{ width: '4px', height: '4px' }} />
                  <div className="thinking-dot" style={{ width: '4px', height: '4px' }} />
                  <div className="thinking-dot" style={{ width: '4px', height: '4px' }} />
                </div>
                GENERATING
              </>
            ) : (
              <>🤖 GENERATE BRIEFING</>
            )}
          </button>
        </div>

        {/* Scope Selector */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          {(['daily', 'sector', 'custom'] as const).map(scope => (
            <button
              key={scope}
              onClick={() => setSelectedScope(scope)}
              style={{
                padding: '6px 14px',
                background: selectedScope === scope ? 'rgba(212, 168, 83, 0.1)' : 'transparent',
                border: `1px solid ${selectedScope === scope ? 'rgba(212, 168, 83, 0.3)' : 'var(--border-primary)'}`,
                borderRadius: '4px',
                color: selectedScope === scope ? '#d4a853' : 'var(--text-muted)',
                fontSize: '10px',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              {scope === 'daily' ? '📅 Daily' : scope === 'sector' ? '📊 Sector' : '✏️ Custom'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="scroll-area" style={{ flex: 1, padding: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '8px', 
              marginBottom: '20px' 
            }}>
              <div className="thinking-dot" style={{ width: '10px', height: '10px' }} />
              <div className="thinking-dot" style={{ width: '10px', height: '10px' }} />
              <div className="thinking-dot" style={{ width: '10px', height: '10px' }} />
            </div>
            <div style={{ color: '#d4a853', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              AI is analyzing market data...
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
              Processing articles, extracting insights, generating briefing
            </div>
          </div>
        ) : briefing?.error ? (
          <div style={{
            padding: '20px',
            background: 'rgba(255, 82, 82, 0.08)',
            border: '1px solid rgba(255, 82, 82, 0.2)',
            borderRadius: '8px',
            color: '#ff5252',
            fontSize: '13px'
          }}>
            ⚠️ {briefing.error}
          </div>
        ) : briefing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Title */}
            <div>
              <div style={{ 
                fontSize: '9px', 
                color: 'var(--text-muted)',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '1px',
                marginBottom: '8px'
              }}>
                BRIEFING TITLE
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#d4a853' }}>
                {briefing.title}
              </h3>
            </div>

            {/* Executive Summary */}
            <div>
              <div style={{ 
                fontSize: '9px', 
                color: 'var(--text-muted)',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '1px',
                marginBottom: '10px'
              }}>
                EXECUTIVE SUMMARY
              </div>
              <div style={{
                padding: '16px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-primary)',
                borderRadius: '6px',
                borderLeft: '3px solid #d4a853'
              }}>
                <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
                  {briefing.summary}
                </p>
              </div>
            </div>

            {/* Key Themes */}
            {briefing.keyThemes?.length > 0 && (
              <div>
                <div style={{ 
                  fontSize: '9px', 
                  color: 'var(--text-muted)',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '1px',
                  marginBottom: '10px'
                }}>
                  KEY THEMES
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {briefing.keyThemes.map((theme: string, i: number) => (
                    <span key={i} style={{
                      padding: '6px 14px',
                      background: 'rgba(0, 212, 255, 0.06)',
                      border: '1px solid rgba(0, 212, 255, 0.15)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: 'var(--accent-cyan)'
                    }}>
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Market Outlook */}
            {briefing.marketOutlook && (
              <div>
                <div style={{ 
                  fontSize: '9px', 
                  color: 'var(--text-muted)',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '1px',
                  marginBottom: '10px'
                }}>
                  MARKET OUTLOOK
                </div>
                <div style={{
                  padding: '16px',
                  background: 'rgba(0, 230, 118, 0.04)',
                  border: '1px solid rgba(0, 230, 118, 0.1)',
                  borderRadius: '6px'
                }}>
                  <p style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
                    {briefing.marketOutlook}
                  </p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{
              padding: '12px 16px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ 
                fontSize: '10px', 
                color: 'var(--text-muted)',
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                Based on {briefing.articlesAnalyzed || '?'} articles
              </span>
              <span style={{ 
                fontSize: '10px', 
                color: 'var(--text-muted)',
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                Generated {new Date().toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🤖</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
              AI Market Briefing
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', maxWidth: '300px', margin: '0 auto' }}>
              Click "Generate Briefing" to have AI analyze your feed and produce a comprehensive market summary
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
