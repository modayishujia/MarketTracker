import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface PulseAsset {
  asset: string
  count: number
  bullish: number
  bearish: number
  neutral: number
  avgConfidence: number
  sentiment: 'bullish' | 'bearish' | 'neutral'
}

interface PulseData {
  total: number
  bullish: number
  bearish: number
  neutral: number
  avgConfidence: number
  overallSentiment: 'bullish' | 'bearish' | 'neutral'
  assets: PulseAsset[]
  recentTrend: { date: string; bullish: number; bearish: number; neutral: number }[]
}

export function MarketPulse() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState<PulseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ processed: number; total: number; success: number } | null>(null)

  useEffect(() => {
    loadPulse()
    // Listen for batch analysis events
    const api = (window as any).electronAPI
    api.batchAnalysis.status().then((s: any) => {
      if (s.isAnalyzing) setBatchRunning(true)
    })
  }, [])

  const loadPulse = async () => {
    try {
      const result = await (window as any).electronAPI.analyses.getPulseData()
      setData(result)
    } catch {}
    setLoading(false)
  }

  const handleBatchAnalyze = async () => {
    setBatchRunning(true)
    setBatchProgress(null)
    try {
      const articles = await (window as any).electronAPI.analyses.getUnanalyzed(200)
      if (articles.length === 0) {
        setBatchRunning(false)
        return
      }
      const ids = articles.map((a: any) => a.id)
      setBatchProgress({ processed: 0, total: ids.length, success: 0 })

      // Process in chunks to show progress
      const chunkSize = 10
      let processed = 0
      let success = 0
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize)
        const result = await (window as any).electronAPI.batchAnalysis.start(chunk)
        if (result.ok) {
          processed += chunk.length
          success += result.queued || 0
          setBatchProgress({ processed, total: ids.length, success })
        }
        // Wait for chunk to complete
        await new Promise(r => setTimeout(r, chunk.length * 600))
      }

      await loadPulse()
    } catch {}
    setBatchRunning(false)
  }

  const getSentimentColor = (s: string) => {
    if (s === 'bullish') return 'var(--accent-green)'
    if (s === 'bearish') return 'var(--accent-red)'
    return 'var(--accent-gold)'
  }

  const getSentimentLabel = (s: string) => {
    if (s === 'bullish') return i18n.language === 'zh' ? '看涨' : 'BULLISH'
    if (s === 'bearish') return i18n.language === 'zh' ? '看跌' : 'BEARISH'
    return i18n.language === 'zh' ? '中性' : 'NEUTRAL'
  }

  const pct = (n: number, total: number) => total > 0 ? Math.round(n / total * 100) : 0

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <div className="thinking-dot" />
          <div className="thinking-dot" />
          <div className="thinking-dot" />
        </div>
      </div>
    )
  }

  if (!data || data.total === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <div style={{ fontSize: '48px', opacity: 0.15 }}>📊</div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {i18n.language === 'zh' ? '暂无情绪数据' : 'No sentiment data'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          {i18n.language === 'zh' ? '批量分析文章以生成市场情绪' : 'Batch analyze articles to generate market pulse'}
        </div>
        <button
          onClick={handleBatchAnalyze}
          disabled={batchRunning}
          style={{
            padding: '10px 24px',
            background: 'linear-gradient(135deg, rgba(212, 168, 83, 0.15) 0%, rgba(212, 168, 83, 0.05) 100%)',
            border: '1px solid rgba(212, 168, 83, 0.25)',
            borderRadius: '6px',
            color: 'var(--accent-gold)',
            fontSize: '13px',
            fontWeight: '500',
            cursor: batchRunning ? 'not-allowed' : 'pointer',
            opacity: batchRunning ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {batchRunning ? (
            <><div className="thinking-dot" style={{ width: '4px', height: '4px' }} /> {i18n.language === 'zh' ? '分析中...' : 'Analyzing...'}</>
          ) : (
            <>🤖 {i18n.language === 'zh' ? '开始批量分析' : 'Start Batch Analyze'}</>
          )}
        </button>
        {batchProgress && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            {batchProgress.processed}/{batchProgress.total}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          fontSize: '10px', color: 'var(--text-muted)',
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: '2px',
          textTransform: 'uppercase', marginBottom: '8px'
        }}>
          {t('pulse.subtitle')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            {t('pulse.title')}
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleBatchAnalyze}
              disabled={batchRunning}
              style={{
                padding: '7px 14px',
                background: batchRunning ? 'var(--accent-gold-dim)' : 'linear-gradient(135deg, rgba(212, 168, 83, 0.15) 0%, rgba(212, 168, 83, 0.05) 100%)',
                border: `1px solid ${batchRunning ? 'var(--border-accent)' : 'rgba(212, 168, 83, 0.25)'}`,
                borderRadius: '5px',
                color: batchRunning ? 'var(--accent-gold)' : 'var(--accent-gold)',
                fontSize: '11px',
                fontWeight: '500',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: batchRunning ? 'not-allowed' : 'pointer',
                opacity: batchRunning ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {batchRunning ? (
                <><div className="thinking-dot" style={{ width: '4px', height: '4px' }} /> {i18n.language === 'zh' ? '分析中...' : 'Analyzing...'}</>
              ) : (
                <>🤖 {i18n.language === 'zh' ? '批量分析' : 'Batch Analyze'}</>
              )}
            </button>
            <button onClick={loadPulse} style={{
              padding: '7px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
              borderRadius: '5px', color: 'var(--text-secondary)', fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer'
            }}>↻ {i18n.language === 'zh' ? '刷新' : 'Refresh'}</button>
          </div>
        </div>
        {/* Batch Progress */}
        {batchProgress && (
          <div style={{
            marginTop: '12px', padding: '10px 14px',
            background: 'var(--accent-gold-dim)', border: '1px solid var(--border-accent)',
            borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${Math.round(batchProgress.processed / batchProgress.total * 100)}%`,
                  background: 'var(--accent-gold)', borderRadius: '2px', transition: 'width 0.3s'
                }} />
              </div>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--accent-gold)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
              {batchProgress.processed}/{batchProgress.total}
            </span>
          </div>
        )}
      </div>

      {/* Top Row: Gauge + Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Overall Sentiment Gauge */}
        <div style={{
          padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
          borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
        }}>
          <div style={{
            fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '1px', textTransform: 'uppercase'
          }}>
            {t('pulse.overallMood')}
          </div>
          <div style={{
            width: '140px', height: '140px', borderRadius: '50%',
            background: `conic-gradient(${getSentimentColor(data.overallSentiment)} ${pct(data.overallSentiment === 'bullish' ? data.bullish : data.overallSentiment === 'bearish' ? data.bearish : data.neutral, data.total) * 3.6}deg, var(--bg-secondary) 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              width: '110px', height: '110px', borderRadius: '50%', background: 'var(--bg-card)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{
                fontSize: '20px', fontWeight: '800', color: getSentimentColor(data.overallSentiment),
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                {getSentimentLabel(data.overallSentiment)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                {Math.round(data.avgConfidence * 100)}%
              </div>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            {t('pulse.confidence')} · {data.total} {i18n.language === 'zh' ? '篇分析' : 'analyses'}
          </div>
        </div>

        {/* Distribution */}
        <div style={{
          padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
          borderRadius: '10px'
        }}>
          <div style={{
            fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '20px'
          }}>
            {i18n.language === 'zh' ? '情绪分布' : 'SENTIMENT DISTRIBUTION'}
          </div>
          {[
            { key: 'bullish', label: t('pulse.bullish'), count: data.bullish, color: 'var(--accent-green)' },
            { key: 'neutral', label: t('pulse.neutral'), count: data.neutral, color: 'var(--accent-gold)' },
            { key: 'bearish', label: t('pulse.bearish'), count: data.bearish, color: 'var(--accent-red)' }
          ].map(item => (
            <div key={item.key} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontSize: '12px', color: item.color, fontFamily: 'JetBrains Mono, monospace', fontWeight: '600' }}>
                  {item.count} ({pct(item.count, data.total)}%)
                </span>
              </div>
              <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct(item.count, data.total)}%`,
                  background: item.color, borderRadius: '3px', transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
          ))}
          {/* Ratio Bar */}
          <div style={{ height: '8px', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginTop: '8px' }}>
            <div style={{ width: `${pct(data.bullish, data.total)}%`, background: 'var(--accent-green)' }} />
            <div style={{ width: `${pct(data.neutral, data.total)}%`, background: 'var(--accent-gold)' }} />
            <div style={{ width: `${pct(data.bearish, data.total)}%`, background: 'var(--accent-red)' }} />
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div style={{
        padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
        borderRadius: '10px', marginBottom: '16px'
      }}>
        <div style={{
          fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px'
        }}>
          {i18n.language === 'zh' ? '14 日趋势' : '14-DAY TREND'}
        </div>
        <div style={{ height: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.recentTrend} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="gradBullish" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5ec98a" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#5ec98a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradBearish" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e05555" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#e05555" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}
                tickFormatter={v => v.substring(5)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
                  borderRadius: '6px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace'
                }}
                labelStyle={{ color: 'var(--text-muted)' }}
              />
              <Area type="monotone" dataKey="bullish" stroke="#5ec98a" fill="url(#gradBullish)" strokeWidth={2} />
              <Area type="monotone" dataKey="bearish" stroke="#e05555" fill="url(#gradBearish)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--accent-green)', fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '2px', background: 'var(--accent-green)', display: 'inline-block' }} /> {t('pulse.bullish')}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--accent-red)', fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '2px', background: 'var(--accent-red)', display: 'inline-block' }} /> {t('pulse.bearish')}
          </span>
        </div>
      </div>

      {/* Assets Table */}
      {data.assets.length > 0 && (
        <div style={{
          padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
          borderRadius: '10px'
        }}>
          <div style={{
            fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px'
          }}>
            {i18n.language === 'zh' ? '热门资产情绪' : 'ASSET SENTIMENT'} ({data.assets.length})
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                {[
                  i18n.language === 'zh' ? '资产' : 'Asset',
                  t('pulse.mentions'),
                  t('pulse.trend'),
                  i18n.language === 'zh' ? '看涨' : 'Bull',
                  i18n.language === 'zh' ? '看跌' : 'Bear',
                  t('pulse.confidence')
                ].map(h => (
                  <th key={h} style={{
                    padding: '8px 12px', fontSize: '10px', color: 'var(--text-muted)',
                    fontFamily: 'JetBrains Mono, monospace', textAlign: 'left',
                    fontWeight: '500', letterSpacing: '0.5px', textTransform: 'uppercase'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.assets.map((asset, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: getSentimentColor(asset.sentiment)
                      }} />
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {asset.asset}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {asset.count}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                      {[...Array(Math.min(asset.count, 8))].map((_, j) => (
                        <div key={j} style={{
                          width: '4px', height: '12px', borderRadius: '2px',
                          background: j < asset.bullish ? 'var(--accent-green)' : j < asset.bullish + asset.neutral ? 'var(--accent-gold)' : 'var(--accent-red)',
                          opacity: 0.7
                        }} />
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--accent-green)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {asset.bullish}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--accent-red)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {asset.bearish}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '40px', height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${Math.round(asset.avgConfidence * 100)}%`,
                          background: getSentimentColor(asset.sentiment), borderRadius: '2px'
                        }} />
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {Math.round(asset.avgConfidence * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
