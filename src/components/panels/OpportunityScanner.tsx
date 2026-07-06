import { useState } from 'react'

interface Opportunity {
  asset: string
  type: 'bullish' | 'bearish'
  confidence: number
  reasoning: string
  signals: string[]
  riskLevel: 'low' | 'medium' | 'high'
}

export function OpportunityScanner() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(false)
  const [scanned, setScanned] = useState(false)

  const scanOpportunities = async () => {
    setLoading(true)
    setOpportunities([])
    
    try {
      const analyses = await (window as any).electronAPI.analyses.getRecent(200)
      
      if (analyses.length === 0) {
        setOpportunities([])
        setScanned(true)
        setLoading(false)
        return
      }

      // Aggregate sentiment data
      const assetMap = new Map<string, { 
        bullish: number; 
        bearish: number; 
        neutral: number;
        confidences: number[];
        recentSentiment: string;
      }>()
      
      analyses.forEach((a: any) => {
        try {
          const result = JSON.parse(a.result)
          result.assets?.forEach((asset: string) => {
            const existing = assetMap.get(asset) || { 
              bullish: 0, bearish: 0, neutral: 0, 
              confidences: [], recentSentiment: 'neutral'
            }
            existing[result.sentiment as keyof typeof existing]++
            existing.confidences.push(result.confidence || 0.5)
            existing.recentSentiment = result.sentiment
            assetMap.set(asset, existing)
          })
        } catch {}
      })

      // Find strong signals
      const opps: Opportunity[] = []
      
      assetMap.forEach((data, asset) => {
        const total = data.bullish + data.bearish + data.neutral
        if (total < 3) return // Need enough data
        
        const avgConfidence = data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length
        const bullishRatio = data.bullish / total
        const bearishRatio = data.bearish / total
        
        // Strong bullish signal
        if (bullishRatio > 0.6 && avgConfidence > 0.6) {
          opps.push({
            asset,
            type: 'bullish',
            confidence: avgConfidence,
            reasoning: `${Math.round(bullishRatio * 100)}% bullish sentiment across ${total} analyses`,
            signals: [
              `${data.bullish} bullish signals`,
              `${Math.round(avgConfidence * 100)}% avg confidence`,
              `Recent: ${data.recentSentiment}`
            ],
            riskLevel: avgConfidence > 0.8 ? 'low' : avgConfidence > 0.65 ? 'medium' : 'high'
          })
        }
        
        // Strong bearish signal
        if (bearishRatio > 0.6 && avgConfidence > 0.6) {
          opps.push({
            asset,
            type: 'bearish',
            confidence: avgConfidence,
            reasoning: `${Math.round(bearishRatio * 100)}% bearish sentiment across ${total} analyses`,
            signals: [
              `${data.bearish} bearish signals`,
              `${Math.round(avgConfidence * 100)}% avg confidence`,
              `Recent: ${data.recentSentiment}`
            ],
            riskLevel: avgConfidence > 0.8 ? 'low' : avgConfidence > 0.65 ? 'medium' : 'high'
          })
        }
      })

      // Sort by confidence
      opps.sort((a, b) => b.confidence - a.confidence)
      
      setOpportunities(opps)
      setScanned(true)
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
              fontSize: '9px', 
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
          
          <button
            onClick={scanOpportunities}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: loading 
                ? 'rgba(255,255,255,0.03)'
                : 'linear-gradient(135deg, rgba(255, 64, 129, 0.2) 0%, rgba(255, 64, 129, 0.1) 100%)',
              border: `1px solid ${loading ? 'var(--border-primary)' : 'rgba(255, 64, 129, 0.3)'}`,
              borderRadius: '6px',
              color: loading ? 'var(--text-muted)' : '#ff4081',
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
                  <div className="thinking-dot" style={{ width: '4px', height: '4px', background: '#ff4081' }} />
                  <div className="thinking-dot" style={{ width: '4px', height: '4px', background: '#ff4081' }} />
                  <div className="thinking-dot" style={{ width: '4px', height: '4px', background: '#ff4081' }} />
                </div>
                SCANNING
              </>
            ) : (
              <>🎯 SCAN FOR ALPHA</>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="scroll-area" style={{ flex: 1, padding: '16px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '8px', 
              marginBottom: '20px' 
            }}>
              <div className="thinking-dot" style={{ width: '10px', height: '10px', background: '#ff4081' }} />
              <div className="thinking-dot" style={{ width: '10px', height: '10px', background: '#ff4081' }} />
              <div className="thinking-dot" style={{ width: '10px', height: '10px', background: '#ff4081' }} />
            </div>
            <div style={{ color: '#ff4081', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Scanning for opportunities...
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
              Analyzing sentiment patterns and confidence levels
            </div>
          </div>
        ) : opportunities.length === 0 && scanned ? (
          <div style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🔍</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
              No strong signals detected
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', maxWidth: '300px', margin: '0 auto' }}>
              Analyze more articles to build enough data for opportunity detection
            </div>
          </div>
        ) : opportunities.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Summary */}
            <div style={{
              padding: '12px 16px',
              background: 'rgba(255, 64, 129, 0.06)',
              border: '1px solid rgba(255, 64, 129, 0.15)',
              borderRadius: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Detected <strong style={{ color: '#ff4081' }}>{opportunities.length}</strong> potential opportunities
              </span>
              <span style={{ 
                fontSize: '10px', 
                color: 'var(--text-muted)',
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                Based on sentiment analysis
              </span>
            </div>

            {/* Opportunities */}
            {opportunities.map((opp, idx) => (
              <div
                key={opp.asset}
                className="glass-hover"
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  animation: `fadeIn 0.2s ease-out ${idx * 0.05}s both`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '6px',
                      background: opp.type === 'bullish' ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 82, 82, 0.1)',
                      border: `1px solid ${opp.type === 'bullish' ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 82, 82, 0.2)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: opp.type === 'bullish' ? '#00e676' : '#ff5252'
                    }}>
                      {opp.asset.substring(0, 3)}
                    </div>
                    <div>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '600',
                        fontFamily: 'JetBrains Mono, monospace'
                      }}>
                        {opp.asset}
                      </div>
                      <div style={{ 
                        fontSize: '10px', 
                        color: opp.type === 'bullish' ? '#00e676' : '#ff5252',
                        fontFamily: 'JetBrains Mono, monospace',
                        textTransform: 'uppercase'
                      }}>
                        {opp.type} SIGNAL
                      </div>
                    </div>
                  </div>

                  <div style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    background: `${riskColors[opp.riskLevel]}10`,
                    border: `1px solid ${riskColors[opp.riskLevel]}25`,
                    fontSize: '9px',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: riskColors[opp.riskLevel],
                    textTransform: 'uppercase'
                  }}>
                    {opp.riskLevel} risk
                  </div>
                </div>

                {/* Confidence Bar */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Confidence</span>
                    <span style={{ 
                      fontSize: '10px', 
                      color: 'var(--text-primary)',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}>
                      {Math.round(opp.confidence * 100)}%
                    </span>
                  </div>
                  <div style={{ 
                    height: '4px', 
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '2px'
                  }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${opp.confidence * 100}%`,
                      background: opp.type === 'bullish' 
                        ? 'linear-gradient(90deg, #00e676, #00e67680)' 
                        : 'linear-gradient(90deg, #ff5252, #ff525280)',
                      borderRadius: '2px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>

                {/* Reasoning */}
                <p style={{ 
                  fontSize: '12px', 
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5',
                  marginBottom: '10px'
                }}>
                  {opp.reasoning}
                </p>

                {/* Signals */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {opp.signals.map((signal, i) => (
                    <span key={i} style={{
                      padding: '3px 8px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '3px',
                      fontSize: '10px',
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
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🎯</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
              Alpha Scanner
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', maxWidth: '300px', margin: '0 auto' }}>
              Scan your analyzed articles to detect potential trading opportunities based on sentiment patterns
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
