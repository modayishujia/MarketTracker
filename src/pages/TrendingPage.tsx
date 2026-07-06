import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Article, AnalysisResult } from '../types'

interface TrendingTopic {
  asset: string
  count: number
  sentiment: 'bullish' | 'bearish' | 'neutral'
  recentArticles: Article[]
}

export function TrendingPage() {
  const { t } = useTranslation()
  const [topics, setTopics] = useState<TrendingTopic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTrendingTopics()
  }, [])

  const loadTrendingTopics = async () => {
    try {
      const analyses = await (window as any).electronAPI.analyses.getRecent(200)
      const assetMap = new Map<string, { count: number; sentiments: string[] }>()
      
      analyses.forEach((a: any) => {
        try {
          const result: AnalysisResult = JSON.parse(a.result)
          result.assets?.forEach(asset => {
            const existing = assetMap.get(asset) || { count: 0, sentiments: [] }
            existing.count++
            if (result.sentiment) existing.sentiments.push(result.sentiment)
            assetMap.set(asset, existing)
          })
        } catch {}
      })

      const trending: TrendingTopic[] = Array.from(assetMap.entries())
        .map(([asset, data]) => {
          const sentimentCounts = { bullish: 0, bearish: 0, neutral: 0 }
          data.sentiments.forEach(s => {
            if (s in sentimentCounts) sentimentCounts[s as keyof typeof sentimentCounts]++
          })
          const dominantSentiment = Object.entries(sentimentCounts)
            .sort(([,a], [,b]) => b - a)[0][0] as 'bullish' | 'bearish' | 'neutral'
          
          return {
            asset,
            count: data.count,
            sentiment: dominantSentiment,
            recentArticles: []
          }
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)

      setTopics(trending)
    } catch (error) {
      console.error('Failed to load trending topics:', error)
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
    bullish: 'Bullish',
    bearish: 'Bearish',
    neutral: 'Neutral'
  }

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          fontSize: '10px', 
          color: 'var(--text-muted)',
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          marginBottom: '8px'
        }}>
          Hot Topics Discovery
        </div>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600',
          color: 'var(--text-primary)',
          letterSpacing: '-0.5px'
        }}>
          🔥 热点发现
        </h2>
        <p style={{ 
          fontSize: '13px', 
          color: 'var(--text-secondary)',
          marginTop: '8px'
        }}>
          基于情绪分析自动识别市场热点资产和主题
        </p>
      </div>

      {loading ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '48px',
          color: 'var(--text-muted)'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
          Loading trending topics...
        </div>
      ) : topics.length === 0 ? (
        <div className="glass" style={{ 
          textAlign: 'center', 
          padding: '48px',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🔥</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            暂无热点数据
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px' }}>
            分析更多文章后，热点将自动出现
          </div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {topics.map((topic, index) => (
            <div
              key={topic.asset}
              className="glass glass-hover animate-fadeIn"
              style={{
                padding: '20px',
                borderRadius: '12px',
                animationDelay: `${index * 50}ms`
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: `linear-gradient(135deg, ${sentimentColors[topic.sentiment]}20 0%, ${sentimentColors[topic.sentiment]}05 100%)`,
                    border: `1px solid ${sentimentColors[topic.sentiment]}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px'
                  }}>
                    {topic.asset.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ 
                      fontSize: '16px', 
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}>
                      {topic.asset}
                    </h3>
                    <div style={{ 
                      fontSize: '11px', 
                      color: 'var(--text-muted)',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}>
                      {topic.count} mentions
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: '10px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: `${sentimentColors[topic.sentiment]}15`,
                  color: sentimentColors[topic.sentiment],
                  border: `1px solid ${sentimentColors[topic.sentiment]}30`,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: '500'
                }}>
                  {sentimentLabels[topic.sentiment]}
                </div>
              </div>

              {/* Sentiment Bar */}
              <div style={{ 
                height: '4px', 
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '8px'
              }}>
                <div style={{ 
                  height: '100%', 
                  width: `${Math.min(topic.count * 10, 100)}%`,
                  background: `linear-gradient(90deg, ${sentimentColors[topic.sentiment]}, ${sentimentColors[topic.sentiment]}80)`,
                  borderRadius: '2px',
                  transition: 'width 0.5s ease'
                }} />
              </div>

              <div style={{ 
                fontSize: '11px', 
                color: 'var(--text-muted)',
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                Trend Score: {(topic.count * 10).toFixed(0)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
