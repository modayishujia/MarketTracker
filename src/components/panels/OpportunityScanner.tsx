import { useState, useEffect } from 'react'

interface Opportunity {
  asset: string
  type: 'bullish' | 'bearish'
  confidence: number
  reasoning: string
  signals: string[]
  riskLevel: 'low' | 'medium' | 'high'
  mentions: number
}

export function OpportunityScanner() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [lastScan, setLastScan] = useState<Date | null>(null)

  useEffect(() => {
    // Auto-scan on mount if we have data
    autoScan()
  }, [])

  const autoScan = async () => {
    try {
      const analyses = await (window as any).electronAPI.analyses.getCount()
      if (analyses > 10) {
        scanOpportunities()
      }
    } catch {}
  }

  const scanOpportunities = async () => {
    setLoading(true)
    setOpportunities([])
    
    try {
      const analyses = await (window as any).electronAPI.analyses.getRecent(500)
      
      if (analyses.length === 0) {
        setOpportunities([])
        setScanned(true)
        setLoading(false)
        return
      }

      const assetMap = new Map<string, { 
        bullish: number; 
        bearish: number; 
        neutral: number;
        confidences: number[];
        recentSentiment: string;
        recentConfidence: number;
      }>()
      
      analyses.forEach((a: any, idx: number) => {
        try {
          const result = JSON.parse(a.result)
          result.assets?.forEach((asset: string) => {
            const existing = assetMap.get(asset) || { 
              bullish: 0, bearish: 0, neutral: 0, 
              confidences: [], recentSentiment: 'neutral', recentConfidence: 0
            }
            existing[result.sentiment as keyof typeof existing]++
            existing.confidences.push(result.confidence || 0.5)
            if (idx < 20) { // Recent analyses weigh more
              existing.recentSentiment = result.sentiment
              existing.recentConfidence = result.confidence || 0.5
            }
            assetMap.set(asset, existing)
          })
        } catch {}
      })

      const opps: Opportunity[] = []
      
      assetMap.forEach((data, asset) => {
        const total = data.bullish + data.bearish + data.neutral
        if (total < 2) return
        
        const avgConfidence = data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length
        const bullishRatio = data.bullish / total
        const bearishRatio = data.bearish / total
        
        // Strong bullish signal
        if (bullishRatio >= 0.55 && avgConfidence >= 0.55) {
          opps.push({
            asset,
            type: 'bullish',
            confidence: avgConfidence,
            reasoning: `${Math.round(bullishRatio * 100)}% bullish across ${total} analyses`,
            signals: [
              `${data.bullish} bullish signals`,
              `${Math.round(avgConfidence * 100)}% avg confidence`,
              `Latest: ${data.recentSentiment}`
            ],
            riskLevel: avgConfidence > 0.75 ? 'low' : avgConfidence > 0.6 ? 'medium' : 'high',
            mentions: total
          })
        }
        
        // Strong bearish signal
        if (bearishRatio >= 0.55 && avgConfidence >= 0.55) {
          opps.push({
            asset,
            type: 'bearish',
            confidence: avgConfidence,
            reasoning: `${Math.round(bearishRatio * 100)}% bearish across ${total} analyses`,
            signals: [
              `${data.bearish} bearish signals`,
              `${Math.round(avgConfidence * 100)}% avg confidence`,
              `Latest: ${data.recentSentiment}`
            ],
            riskLevel: avgConfidence > 0.75 ? 'low' : avgConfidence > 0.6 ? 'medium' : 'high',
            mentions: total
          })
        }
      })

      opps.sort((a, b) => b.confidence - a.confidence)
      
      setOpportunities(opps)
      setScanned(true)
      setLastScan(new Date())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const riskColors = {
    low: '#00e676',
    medium: '#ffd740',
    high: '#ff5252'
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
              fontSize: '8px', 
              color: 'var(--text-muted)',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '1.5px',
              marginBottom: '4px'
            }}>
              ALPHA SCANNER
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>
              Opportunity Detection
            </h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {lastScan && (
              <span style={{ 
                fontSize: '9px', 
                color: 'var(--text-muted)',
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                Last scan: {lastScan.toLocaleTimeString('en-US', { hour12: false })}
              </span>
            )}
            <button
              onClick={scanOpportunities}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: loading 
                  ? 'rgba(255,255,255,0.03)'
                  : 'linear-gradient(135deg, rgba(255, 64, 129, 0.15) 0%, rgba(255, 64, 129, 0.05) 100%)',
                border: `1px solid ${loading ? 'var(--border-primary)' : 'rgba(255, 64, 129, 0.25)'}`,
                borderRadius: '4px',
                color: loading ? 'var(--text-muted)' : '#ff4081',
                fontSize: '11px',
                fontWeight: '500',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {loading ? (
                <>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <div className="thinking-dot" style={{ width: '3px', height: '3px', background: '#ff4081' }} />
                    <div className="thinking-dot" style={{ width: '3px', height: '3px', background: '#ff4081' }} />
                    <div className="thinking-dot" style={{ width: '3px', height: '3px', background: '#ff4081' }} />
                  </div>
                  SCANNING
                </>
              ) : (
                <>🎯 SCAN</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {opportunities.length > 0 && (
        <div style={{
          padding: '10px 20px',
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex',
          gap: '20px',
          background: 'rgba(0,0,0,0.1)'
        }}>
          <div>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>SIGNALS</span>
            <span style={{ fontSize: '12px', fontWeight: '600', fontFamily: 'JetBrains Mono, monospace', marginLeft: '8px', color: '#ff4081' }}>
              {opportunities.length}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>BULLISH</span>
            <span style={{ fontSize: '12px', fontWeight: '600', fontFamily: 'JetBrains Mono, monospace', marginLeft: '8px', color: '#00e676' }}>
              {opportunities.filter(o => o.type === 'bullish').length}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>BEARISH</span>
            <span style={{ fontSize: '12px', fontWeight: '600', fontFamily: 'JetBrains Mono, monospace', marginLeft: '8px', color: '#ff5252' }}>
              {opportunities.filter(o => o.type === 'bearish').length}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="scroll-area" style={{ flex: 1, padding: '16px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ 
              width: '48px',
              height: '48px',
              margin: '0 auto 20px',
              borderRadius: '50%',
              border: '2px solid var(--border-primary)',
              borderTopColor: '#ff4081',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ color: '#ff4081', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
              Scanning for alpha...
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
              Analyzing sentiment patterns across {opportunities.length || '...'} assets
            </div>
          </div>
        ) : opportunities.length === 0 && scanned ? (
          <div style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.3 }}>🔍</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>
              No strong signals detected
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', maxWidth: '280px', margin: '0 auto' }}>
              Analyze more articles to build sufficient data for signal detection
            </div>
          </div>
        ) : opportunities.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {opportunities.map((opp, idx) => (
              <div
                key={opp.asset}
                className="glass-hover"
                style={{
                  padding: '14px 16px',
                  borderRadius: '6px',
                  animation: `fadeIn 0.15s ease-out ${idx * 0.03}s both`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '6px',
                      background: opp.type === 'bullish' ? 'rgba(0, 230, 118, 0.08)' : 'rgba(255, 82, 82, 0.08)',
                      border: `1px solid ${opp.type === 'bullish' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 82, 82, 0.15)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '10px',
                      fontWeight: '600',
                      color: opp.type === 'bullish' ? '#00e676' : '#ff5252'
                    }}>
                      {opp.asset.substring(0, 3)}
                    </div>
                    <div>
                      <div style={{ 
                        fontSize: '13px', 
                        fontWeight: '600',
                        fontFamily: 'JetBrains Mono, monospace'
                      }}>
                        {opp.asset}
                      </div>
                      <div style={{ 
                        fontSize: '9px', 
                        color: opp.type === 'bullish' ? '#00e676' : '#ff5252',
                        fontFamily: 'JetBrains Mono, monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {opp.type} SIGNAL · {opp.mentions} mentions
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      padding: '3px 8px',
                      borderRadius: '3px',
                      background: `${riskColors[opp.riskLevel]}08`,
                      border: `1px solid ${riskColors[opp.riskLevel]}20`,
                      fontSize: '8px',
                      fontFamily: 'JetBrains Mono, monospace',
                      color: riskColors[opp.riskLevel],
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {opp.riskLevel} risk
                    </div>
                    <div style={{
                      padding: '3px 8px',
                      borderRadius: '3px',
                      background: 'rgba(212, 168, 83, 0.08)',
                      border: '1px solid rgba(212, 168, 83, 0.15)',
                      fontSize: '10px',
                      fontFamily: 'JetBrains Mono, monospace',
                      color: '#d4a853',
                      fontWeight: '600'
                    }}>
                      {Math.round(opp.confidence * 100)}%
                    </div>
                  </div>
                </div>

                {/* Confidence Bar */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ 
                    height: '3px', 
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '2px'
                  }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${opp.confidence * 100}%`,
                      background: opp.type === 'bullish' 
                        ? 'linear-gradient(90deg, #00e676, #00e67660)' 
                        : 'linear-gradient(90deg, #ff5252, #ff525260)',
                      borderRadius: '2px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>

                {/* Reasoning */}
                <p style={{ 
                  fontSize: '11px', 
                  color: 'var(--text-secondary)',
                  lineHeight: '1.4',
                  marginBottom: '8px'
                }}>
                  {opp.reasoning}
                </p>

                {/* Signals */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {opp.signals.map((signal, i) => (
                    <span key={i} style={{
                      padding: '2px 6px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '2px',
                      fontSize: '9px',
                      color: 'var(--text-muted)',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}>
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.3 }}>🎯</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>
              Alpha Scanner
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', maxWidth: '280px', margin: '0 auto' }}>
              Detect trading opportunities by analyzing sentiment patterns across your feed
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
