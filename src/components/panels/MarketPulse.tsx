import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface SentimentData {
  asset: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  mentions: number
  trend: 'up' | 'down' | 'stable'
  bullishCount: number
  bearishCount: number
  neutralCount: number
}

export function MarketPulse() {
  const { t } = useTranslation()
  const [sentiments, setSentiments] = useState<SentimentData[]>([])
  const [loading, setLoading] = useState(true)
  const [overallMood, setOverallMood] = useState<'bullish' | 'bearish' | 'neutral'>('neutral')
  const [stats, setStats] = useState({ total: 0, bullish: 0, bearish: 0, neutral: 0 })

  useEffect(() => {
    loadSentimentData()
  }, [])

  const loadSentimentData = async () => {
    try {
      const analyses = await (window as any).electronAPI.analyses.getRecent(500)
      const assetMap = new Map<string, { sentiments: string[], confidences: number[] }>()
      
      let totalBullish = 0, totalBearish = 0, totalNeutral = 0
      
      analyses.forEach((a: any) => {
        try {
          const result = JSON.parse(a.result)
          if (result.sentiment === 'bullish') totalBullish++
          else if (result.sentiment === 'bearish') totalBearish++
          else totalNeutral++
          
          result.assets?.forEach((asset: string) => {
            const existing = assetMap.get(asset) || { sentiments: [], confidences: [] }
            existing.sentiments.push(result.sentiment)
            existing.confidences.push(result.confidence || 0.5)
            assetMap.set(asset, existing)
          })
        } catch {}
      })

      setStats({ 
        total: analyses.length, 
        bullish: totalBullish, 
        bearish: totalBearish, 
        neutral: totalNeutral 
      })

      const data: SentimentData[] = Array.from(assetMap.entries())
        .map(([asset, d]) => {
          const counts = { bullish: 0, bearish: 0, neutral: 0 }
          d.sentiments.forEach(s => {
            if (s in counts) counts[s as keyof typeof counts]++
          })
          const dominant = Object.entries(counts).sort(([,a],[,b]) => b - a)[0][0] as any
          const avgConfidence = d.confidences.reduce((a, b) => a + b, 0) / d.confidences.length
          
          return {
            asset,
            sentiment: dominant,
            confidence: avgConfidence,
            mentions: d.sentiments.length,
            trend: counts.bullish > counts.bearish ? 'up' : counts.bearish > counts.bullish ? 'down' : 'stable',
            bullishCount: counts.bullish,
            bearishCount: counts.bearish,
            neutralCount: counts.neutral
          }
        })
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 25)

      setSentiments(data)

      // Calculate overall mood
      if (totalBullish > totalBearish && totalBullish > totalNeutral) setOverallMood('bullish')
      else if (totalBearish > totalBullish && totalBearish > totalNeutral) setOverallMood('bearish')
      else setOverallMood('neutral')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const sentimentColors = {
    bullish: '#00e676',
    bearish: '#ff5252',
    neutral: '#ffd740'
  }

  const sentimentLabels = {
    bullish: 'BULLISH',
    bearish: 'BEARISH',
    neutral: 'NEUTRAL'
  }

  const sentimentIcons = {
    bullish: '▲',
    bearish: '▼',
    neutral: '◆'
  }

  const getSentimentBar = (item: SentimentData) => {
    const total = item.bullishCount + item.bearishCount + item.neutralCount
    if (total === 0) return null
    const bullWidth = (item.bullishCount / total) * 100
    const bearWidth = (item.bearishCount / total) * 100
    const neutWidth = (item.neutralCount / total) * 100
    
    return (
      <div style={{ 
        display: 'flex', 
        height: '3px', 
        borderRadius: '2px', 
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.03)',
        marginTop: '4px'
      }}>
        <div style={{ width: `${bullWidth}%`, background: '#00e676' }} />
        <div style={{ width: `${bearWidth}%`, background: '#ff5252' }} />
        <div style={{ width: `${neutWidth}%`, background: '#ffd740' }} />
      </div>
    )
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
              MARKET PULSE
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>
              Sentiment Analysis
            </h2>
          </div>
          
          {/* Overall Mood Indicator */}
          <div style={{
            padding: '12px 20px',
            background: `${sentimentColors[overallMood]}08`,
            border: `1px solid ${sentimentColors[overallMood]}20`,
            borderRadius: '8px',
            textAlign: 'center',
            minWidth: '100px'
          }}>
            <div style={{ 
              fontSize: '20px',
              color: sentimentColors[overallMood],
              marginBottom: '4px'
            }}>
              {sentimentIcons[overallMood]}
            </div>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: '700',
              color: sentimentColors[overallMood],
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '1px'
            }}>
              {sentimentLabels[overallMood]}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
              OVERALL MOOD
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex',
        gap: '24px',
        background: 'rgba(0,0,0,0.1)'
      }}>
        <div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginBottom: '2px' }}>TOTAL</div>
          <div style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'JetBrains Mono, monospace' }}>{stats.total}</div>
        </div>
        <div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginBottom: '2px' }}>BULLISH</div>
          <div style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'JetBrains Mono, monospace', color: '#00e676' }}>{stats.bullish}</div>
        </div>
        <div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginBottom: '2px' }}>BEARISH</div>
          <div style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'JetBrains Mono, monospace', color: '#ff5252' }}>{stats.bearish}</div>
        </div>
        <div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginBottom: '2px' }}>NEUTRAL</div>
          <div style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'JetBrains Mono, monospace', color: '#ffd740' }}>{stats.neutral}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Sentiment Ratio Bar */}
          {stats.total > 0 && (
            <div style={{ width: '120px' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginBottom: '4px', textAlign: 'right' }}>
                RATIO
              </div>
              <div style={{ 
                display: 'flex', 
                height: '6px', 
                borderRadius: '3px', 
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.03)'
              }}>
                <div style={{ width: `${(stats.bullish / stats.total) * 100}%`, background: '#00e676' }} />
                <div style={{ width: `${(stats.bearish / stats.total) * 100}%`, background: '#ff5252' }} />
                <div style={{ width: `${(stats.neutral / stats.total) * 100}%`, background: '#ffd740' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="scroll-area" style={{ flex: 1, padding: '12px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ 
              width: '40px',
              height: '40px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              border: '2px solid var(--border-primary)',
              borderTopColor: '#d4a853',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Analyzing market sentiment...</div>
          </div>
        ) : sentiments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.3 }}>📊</div>
            <div style={{ fontSize: '13px', marginBottom: '4px' }}>No sentiment data</div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>Analyze articles to build market pulse</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Column Headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px 60px 60px 40px',
              gap: '8px',
              padding: '6px 12px',
              fontSize: '8px',
              color: 'var(--text-muted)',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '1px'
            }}>
              <span>ASSET</span>
              <span>SENTIMENT</span>
              <span style={{ textAlign: 'right' }}>CONF</span>
              <span style={{ textAlign: 'right' }}>MENTIONS</span>
              <span style={{ textAlign: 'center' }}>TREND</span>
            </div>

            {sentiments.map((item, idx) => (
              <div
                key={item.asset}
                className="glass-hover"
                style={{
                  padding: '10px 12px',
                  borderRadius: '4px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 60px 60px 40px',
                  gap: '8px',
                  alignItems: 'center',
                  animation: `fadeIn 0.1s ease-out ${idx * 0.02}s both`
                }}
              >
                {/* Asset */}
                <div>
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: '500',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}>
                    {item.asset}
                  </div>
                  {getSentimentBar(item)}
                </div>

                {/* Sentiment Badge */}
                <div style={{
                  padding: '3px 8px',
                  borderRadius: '3px',
                  background: `${sentimentColors[item.sentiment]}10`,
                  border: `1px solid ${sentimentColors[item.sentiment]}25`,
                  fontSize: '9px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: sentimentColors[item.sentiment],
                  fontWeight: '600',
                  textAlign: 'center',
                  letterSpacing: '0.5px'
                }}>
                  {sentimentLabels[item.sentiment]}
                </div>

                {/* Confidence */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    fontSize: '11px', 
                    fontFamily: 'JetBrains Mono, monospace',
                    color: item.confidence > 0.7 ? 'var(--text-primary)' : 'var(--text-muted)'
                  }}>
                    {Math.round(item.confidence * 100)}%
                  </span>
                </div>

                {/* Mentions */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    fontSize: '11px', 
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--text-secondary)'
                  }}>
                    {item.mentions}
                  </span>
                </div>

                {/* Trend */}
                <div style={{ 
                  textAlign: 'center',
                  fontSize: '14px',
                  color: sentimentColors[item.sentiment],
                  fontWeight: '600'
                }}>
                  {sentimentIcons[item.sentiment]}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
