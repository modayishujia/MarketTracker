import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface SentimentData {
  asset: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  mentions: number
  trend: 'up' | 'down' | 'stable'
}

export function MarketPulse() {
  const { t } = useTranslation()
  const [sentiments, setSentiments] = useState<SentimentData[]>([])
  const [loading, setLoading] = useState(true)
  const [overallMood, setOverallMood] = useState<'bullish' | 'bearish' | 'neutral'>('neutral')

  useEffect(() => {
    loadSentimentData()
  }, [])

  const loadSentimentData = async () => {
    try {
      const analyses = await (window as any).electronAPI.analyses.getRecent(500)
      const assetMap = new Map<string, { sentiments: string[], confidences: number[] }>()
      
      analyses.forEach((a: any) => {
        try {
          const result = JSON.parse(a.result)
          result.assets?.forEach((asset: string) => {
            const existing = assetMap.get(asset) || { sentiments: [], confidences: [] }
            existing.sentiments.push(result.sentiment)
            existing.confidences.push(result.confidence || 0.5)
            assetMap.set(asset, existing)
          })
        } catch {}
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
            trend: counts.bullish > counts.bearish ? 'up' : counts.bearish > counts.bullish ? 'down' : 'stable'
          }
        })
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 30)

      setSentiments(data)

      // Calculate overall mood
      const total = { bullish: 0, bearish: 0, neutral: 0 }
      data.forEach(d => { total[d.sentiment]++ })
      const mood = Object.entries(total).sort(([,a],[,b]) => b - a)[0][0] as any
      setOverallMood(mood)
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

  const sentimentEmoji = {
    bullish: '🟢',
    bearish: '🔴',
    neutral: '🟡'
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
              MARKET PULSE
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>
              Sentiment Analysis
            </h2>
          </div>
          
          {/* Overall Mood Indicator */}
          <div style={{
            padding: '12px 20px',
            background: `${sentimentColors[overallMood]}10`,
            border: `1px solid ${sentimentColors[overallMood]}30`,
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>
              {sentimentEmoji[overallMood]}
            </div>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '600',
              color: sentimentColors[overallMood],
              fontFamily: 'JetBrains Mono, monospace',
              textTransform: 'uppercase'
            }}>
              {overallMood}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
              OVERALL MOOD
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="scroll-area" style={{ flex: 1, padding: '16px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '12px' }}>
              <div className="thinking-dot" />
              <div className="thinking-dot" />
              <div className="thinking-dot" />
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Analyzing market sentiment...
            </div>
          </div>
        ) : sentiments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📊</div>
            <div style={{ fontSize: '13px', marginBottom: '8px' }}>No sentiment data</div>
            <div style={{ fontSize: '11px' }}>Analyze articles to build market pulse</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sentiments.map((item, idx) => (
              <div
                key={item.asset}
                className="glass-hover"
                style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  animation: `fadeIn 0.15s ease-out ${idx * 0.03}s both`
                }}
              >
                {/* Asset Icon */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  background: `${sentimentColors[item.sentiment]}10`,
                  border: `1px solid ${sentimentColors[item.sentiment]}25`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: sentimentColors[item.sentiment]
                }}>
                  {item.asset.substring(0, 3)}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      fontSize: '13px', 
                      fontWeight: '500',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}>
                      {item.asset}
                    </span>
                    <span style={{ 
                      fontSize: '9px',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      background: `${sentimentColors[item.sentiment]}15`,
                      color: sentimentColors[item.sentiment],
                      fontFamily: 'JetBrains Mono, monospace',
                      textTransform: 'uppercase',
                      fontWeight: '500'
                    }}>
                      {item.sentiment}
                    </span>
                  </div>
                  <div style={{ 
                    fontSize: '10px', 
                    color: 'var(--text-muted)',
                    fontFamily: 'JetBrains Mono, monospace',
                    marginTop: '2px'
                  }}>
                    {item.mentions} mentions · {Math.round(item.confidence * 100)}% confidence
                  </div>
                </div>

                {/* Trend Arrow */}
                <div style={{ 
                  fontSize: '18px',
                  color: sentimentColors[item.sentiment]
                }}>
                  {item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
