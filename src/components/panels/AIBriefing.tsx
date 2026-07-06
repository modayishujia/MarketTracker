import { useState, useEffect, useRef } from 'react'

export function AIBriefing() {
  const [briefing, setBriefing] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedScope, setSelectedScope] = useState<'daily' | 'sector' | 'custom'>('daily')
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [history, setHistory] = useState<any[]>([])
  const contentRef = useRef<HTMLDivElement>(null)

  const generateBriefing = async () => {
    setLoading(true)
    setBriefing(null)
    setProgress(0)
    setStatusText('Fetching articles...')
    
    try {
      const articles = await (window as any).electronAPI.articles.getAll({ limit: 50 })
      
      if (articles.length === 0) {
        setBriefing({ error: 'No articles available. Sync your feeds first.' })
        setLoading(false)
        return
      }

      setProgress(20)
      setStatusText(`Processing ${articles.length} articles...`)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 5
        })
      }, 200)

      setProgress(40)
      setStatusText('AI is analyzing market trends...')

      const articleSummaries = articles.slice(0, 25).map((a: any) => ({
        title: a.title,
        content: (a.content || '').substring(0, 400)
      }))

      setProgress(60)
      setStatusText('Generating insights...')

      const result = await (window as any).electronAPI.llm.generateReport(articleSummaries)
      
      clearInterval(progressInterval)
      setProgress(100)
      setStatusText('Complete')

      if (!result.error) {
        setBriefing(result)
        setHistory(prev => [{
          ...result,
          timestamp: new Date(),
          articleCount: articles.length
        }, ...prev].slice(0, 5))
      } else {
        setBriefing(result)
      }
    } catch (err: any) {
      setBriefing({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const sentimentColors = {
    bullish: '#00e676',
    bearish: '#ff5252',
    neutral: '#ffd740'
  }

  return (
    <div style={{ height: '100%', display: 'flex' }}>
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-primary)',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ 
                fontSize: '8px', 
                color: '#d4a853',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '1.5px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ 
                  width: '4px', 
                  height: '4px', 
                  borderRadius: '50%', 
                  background: '#d4a853',
                  display: 'inline-block'
                }} />
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
                padding: '10px 24px',
                background: loading 
                  ? 'rgba(255,255,255,0.03)'
                  : 'linear-gradient(135deg, rgba(212, 168, 83, 0.2) 0%, rgba(212, 168, 83, 0.05) 100%)',
                border: `1px solid ${loading ? 'var(--border-primary)' : 'rgba(212, 168, 83, 0.3)'}`,
                borderRadius: '6px',
                color: loading ? 'var(--text-muted)' : '#d4a853',
                fontSize: '12px',
                fontWeight: '600',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                letterSpacing: '0.5px',
                transition: 'all 0.2s ease'
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
                <>🤖 GENERATE</>
              )}
            </button>
          </div>

          {/* Scope Selector */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
            {([
              { key: 'daily', label: '📅 DAILY BRIEF', desc: 'Full market overview' },
              { key: 'sector', label: '📊 SECTOR', desc: 'Industry analysis' },
              { key: 'custom', label: '✏️ CUSTOM', desc: 'Specific topics' }
            ] as const).map(scope => (
              <button
                key={scope.key}
                onClick={() => setSelectedScope(scope.key)}
                title={scope.desc}
                style={{
                  padding: '6px 12px',
                  background: selectedScope === scope.key ? 'rgba(212, 168, 83, 0.08)' : 'transparent',
                  border: `1px solid ${selectedScope === scope.key ? 'rgba(212, 168, 83, 0.2)' : 'var(--border-primary)'}`,
                  borderRadius: '3px',
                  color: selectedScope === scope.key ? '#d4a853' : 'var(--text-muted)',
                  fontSize: '9px',
                  fontFamily: 'JetBrains Mono, monospace',
                  cursor: 'pointer',
                  letterSpacing: '0.5px'
                }}
              >
                {scope.label}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        {loading && (
          <div style={{
            height: '2px',
            background: 'var(--border-primary)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #d4a853, #d4a85380)',
              transition: 'width 0.3s ease',
              boxShadow: '0 0 8px rgba(212, 168, 83, 0.5)'
            }} />
          </div>
        )}

        {/* Status */}
        {loading && (
          <div style={{
            padding: '8px 20px',
            background: 'rgba(0,0,0,0.15)',
            borderBottom: '1px solid var(--border-primary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ 
              fontSize: '10px', 
              color: 'var(--text-muted)',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              {statusText}
            </span>
            <span style={{ 
              fontSize: '10px', 
              color: '#d4a853',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              {progress}%
            </span>
          </div>
        )}

        {/* Content */}
        <div ref={contentRef} className="scroll-area" style={{ flex: 1, padding: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 40px' }}>
              <div style={{ 
                width: '56px',
                height: '56px',
                margin: '0 auto 24px',
                borderRadius: '50%',
                background: 'rgba(212, 168, 83, 0.05)',
                border: '2px solid rgba(212, 168, 83, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '2px solid var(--border-primary)',
                  borderTopColor: '#d4a853',
                  animation: 'spin 1s linear infinite'
                }} />
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{ color: '#d4a853', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                AI is analyzing market data...
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', maxWidth: '280px', margin: '0 auto' }}>
                Processing articles, extracting key themes, and generating comprehensive market intelligence
              </div>
            </div>
          ) : briefing?.error ? (
            <div style={{
              padding: '20px',
              background: 'rgba(255, 82, 82, 0.06)',
              border: '1px solid rgba(255, 82, 82, 0.15)',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '13px', color: '#ff5252', fontWeight: '500', marginBottom: '6px' }}>
                ⚠️ Generation Failed
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {briefing.error}
              </div>
            </div>
          ) : briefing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
              {/* Title */}
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, rgba(212, 168, 83, 0.06) 0%, rgba(212, 168, 83, 0.02) 100%)',
                border: '1px solid rgba(212, 168, 83, 0.15)',
                borderRadius: '8px'
              }}>
                <div style={{ 
                  fontSize: '8px', 
                  color: 'var(--text-muted)',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '1.5px',
                  marginBottom: '10px'
                }}>
                  BRIEFING TITLE
                </div>
                <h3 style={{ 
                  fontSize: '22px', 
                  fontWeight: '600', 
                  color: '#d4a853',
                  lineHeight: '1.3'
                }}>
                  {briefing.title}
                </h3>
                <div style={{ 
                  fontSize: '10px', 
                  color: 'var(--text-muted)',
                  fontFamily: 'JetBrains Mono, monospace',
                  marginTop: '12px'
                }}>
                  Generated {new Date().toLocaleString()} · {briefing.articlesAnalyzed || '?'} articles analyzed
                </div>
              </div>

              {/* Executive Summary */}
              <div>
                <div style={{ 
                  fontSize: '8px', 
                  color: 'var(--text-muted)',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '1.5px',
                  marginBottom: '10px'
                }}>
                  EXECUTIVE SUMMARY
                </div>
                <div style={{
                  padding: '18px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  borderLeft: '3px solid #d4a853'
                }}>
                  <p style={{ 
                    fontSize: '14px', 
                    lineHeight: '1.8', 
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {briefing.summary}
                  </p>
                </div>
              </div>

              {/* Key Themes */}
              {briefing.keyThemes?.length > 0 && (
                <div>
                  <div style={{ 
                    fontSize: '8px', 
                    color: 'var(--text-muted)',
                    fontFamily: 'JetBrains Mono, monospace',
                    letterSpacing: '1.5px',
                    marginBottom: '10px'
                  }}>
                    KEY THEMES ({briefing.keyThemes.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {briefing.keyThemes.map((theme: string, i: number) => (
                      <div key={i} style={{
                        padding: '8px 14px',
                        background: 'rgba(0, 212, 255, 0.04)',
                        border: '1px solid rgba(0, 212, 255, 0.12)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: 'var(--accent-cyan)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span style={{ 
                          width: '4px', 
                          height: '4px', 
                          borderRadius: '50%', 
                          background: 'var(--accent-cyan)',
                          opacity: 0.6
                        }} />
                        {theme}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Market Outlook */}
              {briefing.marketOutlook && (
                <div>
                  <div style={{ 
                    fontSize: '8px', 
                    color: 'var(--text-muted)',
                    fontFamily: 'JetBrains Mono, monospace',
                    letterSpacing: '1.5px',
                    marginBottom: '10px'
                  }}>
                    MARKET OUTLOOK
                  </div>
                  <div style={{
                    padding: '18px',
                    background: 'rgba(0, 230, 118, 0.03)',
                    border: '1px solid rgba(0, 230, 118, 0.1)',
                    borderRadius: '6px'
                  }}>
                    <p style={{ 
                      fontSize: '13px', 
                      lineHeight: '1.8', 
                      color: 'var(--text-secondary)',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {briefing.marketOutlook}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 40px' }}>
              <div style={{ 
                width: '64px',
                height: '64px',
                margin: '0 auto 20px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(212, 168, 83, 0.1) 0%, rgba(212, 168, 83, 0.02) 100%)',
                border: '1px solid rgba(212, 168, 83, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px'
              }}>
                🤖
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: '500', marginBottom: '8px' }}>
                AI Market Briefing
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', maxWidth: '320px', margin: '0 auto', lineHeight: '1.6' }}>
                Generate comprehensive market intelligence powered by AI analysis of your news feed
              </div>
              <button
                onClick={generateBriefing}
                style={{
                  marginTop: '24px',
                  padding: '12px 28px',
                  background: 'linear-gradient(135deg, rgba(212, 168, 83, 0.15) 0%, rgba(212, 168, 83, 0.05) 100%)',
                  border: '1px solid rgba(212, 168, 83, 0.25)',
                  borderRadius: '6px',
                  color: '#d4a853',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                🤖 Generate First Briefing
              </button>
            </div>
          )}
        </div>
      </div>

      {/* History Sidebar */}
      {history.length > 0 && (
        <div style={{
          width: '200px',
          borderLeft: '1px solid var(--border-primary)',
          background: 'rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '12px',
            borderBottom: '1px solid var(--border-primary)',
            fontSize: '8px',
            color: 'var(--text-muted)',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '1px'
          }}>
            RECENT BRIEFINGS
          </div>
          <div className="scroll-area" style={{ flex: 1, padding: '8px' }}>
            {history.map((item, idx) => (
              <div
                key={idx}
                className="glass-hover"
                style={{
                  padding: '10px',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  cursor: 'pointer'
                }}
                onClick={() => setBriefing(item)}
              >
                <div style={{ 
                  fontSize: '10px', 
                  fontWeight: '500',
                  color: 'var(--text-secondary)',
                  marginBottom: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {item.title?.substring(0, 30)}...
                </div>
                <div style={{ 
                  fontSize: '8px', 
                  color: 'var(--text-muted)',
                  fontFamily: 'JetBrains Mono, monospace'
                }}>
                  {item.timestamp?.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
