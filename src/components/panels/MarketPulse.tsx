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

interface IntelReport {
  executiveSummary: string
  keyThemes: string[]
  sentimentAssessment: { overall: string; strength: string; reasoning: string }
  hotTopics: { topic: string; impact: string; relevance: string }[]
  sectorRotation: { inflow: string[]; outflow: string[]; reasoning: string }
  riskEvents: { event: string; impact: string; timeframe: string }[]
  contrarianSignals: { signal: string; direction: string; conviction: string }[]
  tradingImplications: { action: string; target: string; reasoning: string }[]
  riskWarning: string
}

const IMPACT_COLORS: Record<string, string> = {
  positive: '#22c55e', negative: '#ef4444', neutral: '#a1a1aa',
  high: '#ef4444', medium: '#f59e0b', low: '#6b7280'
}

export function MarketPulse() {
  const { t, i18n } = useTranslation()
  const api = (window as any).electronAPI

  const [data, setData] = useState<PulseData | null>(null)
  const [intel, setIntel] = useState<IntelReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [intelLoading, setIntelLoading] = useState(false)
  const [intelError, setIntelError] = useState<string | null>(null)
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ processed: number; total: number } | null>(null)
  const [scanRunning, setScanRunning] = useState(false)
  const [scanProgress, setScanProgress] = useState('')
  const [activeSection, setActiveSection] = useState<'overview' | 'intel' | 'assets'>('overview')

  useEffect(() => {
    loadPulse()
  }, [])

  const loadPulse = async () => {
    try {
      const result = await api.analyses.getPulseData()
      setData(result)
    } catch {}
    setLoading(false)
  }

  const handleGenerateIntel = async () => {
    setIntelLoading(true)
    setIntelError(null)
    try {
      // 1. Fetch web data
      const webData = await api.websearch.market()
      // 2. Generate intelligence
      const result = await api.llm.marketIntelligence(webData)
      if (result.error) {
        setIntelError(result.error)
      } else {
        setIntel(result.data)
      }
    } catch (e: any) {
      setIntelError(e.message || 'Failed')
    }
    setIntelLoading(false)
  }

  const handleScanRecent = async () => {
    setScanRunning(true)
    setScanProgress(i18n.language === 'zh' ? '同步信息源...' : 'Syncing feeds...')
    try {
      await api.feeds.syncAll()
      setScanProgress(i18n.language === 'zh' ? '获取文章...' : 'Fetching articles...')
      const articles = await api.articles.getAll({ limit: 50 })
      if (articles.length === 0) { setScanRunning(false); return }

      const ids = articles.map((a: any) => a.id)
      setBatchProgress({ processed: 0, total: ids.length })
      const chunkSize = 10
      let processed = 0
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize)
        await api.batchAnalysis.start(chunk)
        processed += chunk.length
        setBatchProgress({ processed, total: ids.length })
        setScanProgress(i18n.language === 'zh' ? `分析 ${processed}/${ids.length}` : `Analyzed ${processed}/${ids.length}`)
        await new Promise(r => setTimeout(r, chunk.length * 600))
      }
      await loadPulse()
    } catch {}
    setScanRunning(false)
    setScanProgress('')
    setBatchProgress(null)
  }

  const handleBatchAnalyze = async () => {
    setBatchRunning(true)
    try {
      const articles = await api.analyses.getUnanalyzed(200)
      if (articles.length === 0) { setBatchRunning(false); return }
      const ids = articles.map((a: any) => a.id)
      setBatchProgress({ processed: 0, total: ids.length })
      const chunkSize = 10
      let processed = 0
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize)
        await api.batchAnalysis.start(chunk)
        processed += chunk.length
        setBatchProgress({ processed, total: ids.length })
        await new Promise(r => setTimeout(r, chunk.length * 600))
      }
      await loadPulse()
    } catch {}
    setBatchRunning(false)
    setBatchProgress(null)
  }

  const getSentimentColor = (s: string) => {
    if (s === 'bullish') return '#22c55e'
    if (s === 'bearish') return '#ef4444'
    return '#a1a1aa'
  }

  const pct = (n: number, total: number) => total > 0 ? Math.round(n / total * 100) : 0

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <div className="thinking-dots"><span /><span /><span /></div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{t('pulse.title')}</span>
        <div style={{ flex: 1 }} />
        {/* Tab buttons */}
        {(['overview', 'intel', 'assets'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveSection(tab)} style={{
            padding: '3px 10px',
            background: activeSection === tab ? 'var(--accent-gold-dim)' : 'transparent',
            border: `1px solid ${activeSection === tab ? 'var(--border-accent)' : 'var(--border)'}`,
            borderRadius: '4px', color: activeSection === tab ? 'var(--accent-gold)' : 'var(--text-muted)',
            fontSize: '11px', cursor: 'pointer'
          }}>
            {tab === 'overview' ? (i18n.language === 'zh' ? '概览' : 'Overview')
              : tab === 'intel' ? (i18n.language === 'zh' ? '情报' : 'Intel')
              : (i18n.language === 'zh' ? '资产' : 'Assets')}
          </button>
        ))}
        <div style={{ width: '1px', height: '18px', background: 'var(--border)' }} />
        <button onClick={handleScanRecent} disabled={scanRunning || batchRunning} style={{
          padding: '3px 10px', background: scanRunning ? 'var(--surface)' : 'var(--accent-gold-dim)',
          border: `1px solid ${scanRunning ? 'var(--border)' : 'var(--border-accent)'}`,
          borderRadius: '4px', color: scanRunning ? 'var(--text-muted)' : 'var(--accent-gold)',
          fontSize: '11px', cursor: scanRunning ? 'default' : 'pointer'
        }}>{scanRunning ? '...' : (i18n.language === 'zh' ? '扫描' : 'Scan')}</button>
        <button onClick={handleBatchAnalyze} disabled={batchRunning || scanRunning} style={{
          padding: '3px 10px', background: 'transparent',
          border: '1px solid var(--border)', borderRadius: '4px',
          color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer'
        }}>{i18n.language === 'zh' ? '批量分析' : 'Batch'}</button>
        <button onClick={loadPulse} style={{
          padding: '3px 8px', background: 'transparent',
          border: '1px solid var(--border)', borderRadius: '4px',
          color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer'
        }}>↻</button>
      </div>

      {/* Progress bar */}
      {batchProgress && (
        <div style={{ height: '3px', background: 'var(--border)', flexShrink: 0 }}>
          <div style={{
            height: '100%', width: `${Math.round(batchProgress.processed / batchProgress.total * 100)}%`,
            background: 'var(--accent-gold)', transition: 'width 0.3s'
          }} />
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {!data || data.total === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '13px' }}>{i18n.language === 'zh' ? '暂无情绪数据，点击"扫描"开始' : 'No data. Click "Scan" to start'}</div>
          </div>
        ) : activeSection === 'overview' ? (
          <OverviewSection data={data} getSentimentColor={getSentimentColor} pct={pct} i18n={i18n} />
        ) : activeSection === 'intel' ? (
          <IntelSection
            intel={intel} loading={intelLoading} error={intelError}
            onGenerate={handleGenerateIntel} i18n={i18n}
          />
        ) : (
          <AssetsSection data={data} getSentimentColor={getSentimentColor} pct={pct} i18n={i18n} />
        )}
      </div>
    </div>
  )
}

function OverviewSection({ data, getSentimentColor, pct, i18n }: {
  data: PulseData; getSentimentColor: (s: string) => string; pct: (n: number, t: number) => number; i18n: any
}) {
  const sentimentLabel = data.overallSentiment === 'bullish' ? 'BULLISH' : data.overallSentiment === 'bearish' ? 'BEARISH' : 'NEUTRAL'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Top stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
        {[
          { label: i18n.language === 'zh' ? '总分析' : 'Total', value: data.total, color: 'var(--text-primary)' },
          { label: 'Bullish', value: data.bullish, color: '#22c55e' },
          { label: 'Bearish', value: data.bearish, color: '#ef4444' },
          { label: 'Neutral', value: data.neutral, color: '#a1a1aa' },
          { label: i18n.language === 'zh' ? '置信度' : 'Confidence', value: `${Math.round(data.avgConfidence * 100)}%`, color: 'var(--accent-gold)' }
        ].map(s => (
          <div key={s.label} style={{
            padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '6px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'JetBrains Mono, monospace' }}>{s.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Overall sentiment + distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
        <div style={{
          padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
        }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            {i18n.language === 'zh' ? '整体情绪' : 'OVERALL'}
          </div>
          <div style={{
            fontSize: '24px', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
            color: getSentimentColor(data.overallSentiment)
          }}>{sentimentLabel}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {pct(data.overallSentiment === 'bullish' ? data.bullish : data.overallSentiment === 'bearish' ? data.bearish : data.neutral, data.total)}%
          </div>
        </div>
        <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginBottom: '12px' }}>
            {i18n.language === 'zh' ? '情绪分布' : 'DISTRIBUTION'}
          </div>
          {[
            { key: 'bullish', label: 'Bullish', count: data.bullish, color: '#22c55e' },
            { key: 'neutral', label: 'Neutral', count: data.neutral, color: '#a1a1aa' },
            { key: 'bearish', label: 'Bearish', count: data.bearish, color: '#ef4444' }
          ].map(item => (
            <div key={item.key} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontSize: '11px', color: item.color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                  {item.count} ({pct(item.count, data.total)}%)
                </span>
              </div>
              <div style={{ height: '5px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct(item.count, data.total)}%`, background: item.color, borderRadius: '3px', transition: 'width 0.5s' }} />
              </div>
            </div>
          ))}
          <div style={{ height: '6px', borderRadius: '3px', overflow: 'hidden', display: 'flex', marginTop: '4px' }}>
            <div style={{ width: `${pct(data.bullish, data.total)}%`, background: '#22c55e' }} />
            <div style={{ width: `${pct(data.neutral, data.total)}%`, background: '#a1a1aa' }} />
            <div style={{ width: `${pct(data.bearish, data.total)}%`, background: '#ef4444' }} />
          </div>
        </div>

        {/* Trend chart */}
        <div style={{
          padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '6px'
        }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginBottom: '12px' }}>
            {i18n.language === 'zh' ? '14 日趋势' : '14-DAY TREND'}
          </div>
          <div style={{ height: '160px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.recentTrend} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="gBull" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gBear" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#71717a', fontFamily: 'JetBrains Mono, monospace' }}
                  tickFormatter={v => v.substring(5)} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }} />
                <Area type="monotone" dataKey="bullish" stroke="#22c55e" fill="url(#gBull)" strokeWidth={2} />
                <Area type="monotone" dataKey="bearish" stroke="#ef4444" fill="url(#gBear)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '6px' }}>
            <span style={{ fontSize: '10px', color: '#22c55e', fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '2px', background: '#22c55e', display: 'inline-block' }} /> Bullish
            </span>
            <span style={{ fontSize: '10px', color: '#ef4444', fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '2px', background: '#ef4444', display: 'inline-block' }} /> Bearish
            </span>
          </div>
        </div>
      </div>

      {/* Top assets quick view */}
      {data.assets.length > 0 && (
        <div style={{
          padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '6px'
        }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginBottom: '10px', letterSpacing: '0.5px' }}>
            {i18n.language === 'zh' ? '热门资产' : 'TOP ASSETS'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {data.assets.slice(0, 12).map((a, i) => (
              <div key={i} style={{
                padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: getSentimentColor(a.sentiment) }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{a.asset}</span>
                <span style={{ fontSize: '10px', color: getSentimentColor(a.sentiment), fontFamily: 'JetBrains Mono, monospace' }}>
                  {a.bullish}B/{a.bearish}Be/{a.neutral}N
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function IntelSection({ intel, loading, error, onGenerate, i18n }: {
  intel: IntelReport | null; loading: boolean; error: string | null; onGenerate: () => void; i18n: any
}) {
  const zh = i18n.language === 'zh'

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
        <div className="thinking-dots"><span /><span /><span /></div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {zh ? '正在搜索网络热点并生成分析...' : 'Searching web and generating analysis...'}
        </div>
      </div>
    )
  }

  if (!intel) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
        {error && (
          <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', fontSize: '12px', color: '#ef4444', maxWidth: '400px', textAlign: 'center' }}>
            {error}
          </div>
        )}
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px', lineHeight: '1.6' }}>
          {zh ? '结合本地情绪数据和网络实时热点，生成专业级市场情报' : 'Combine local sentiment with real-time web intelligence for professional market analysis'}
        </div>
        <button onClick={onGenerate} style={{
          padding: '10px 28px', background: 'var(--accent-gold-dim)', border: '1px solid var(--border-accent)',
          borderRadius: '6px', color: 'var(--accent-gold)', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
        }}>
          {zh ? '生成市场情报' : 'Generate Intelligence'}
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Executive Summary */}
      <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', marginBottom: '8px' }}>
          {zh ? '摘要' : 'EXECUTIVE SUMMARY'}
        </div>
        <div style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-primary)' }}>{intel.executiveSummary}</div>
      </div>

      {/* Sentiment + Key Themes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', marginBottom: '10px' }}>
            {zh ? '情绪评估' : 'SENTIMENT'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: getSentimentColor(intel.sentimentAssessment.overall) }}>
              {intel.sentimentAssessment.overall?.toUpperCase()}
            </span>
            <span style={{ padding: '2px 8px', background: `${getSentimentColor(intel.sentimentAssessment.overall)}18`, border: `1px solid ${getSentimentColor(intel.sentimentAssessment.overall)}40`, borderRadius: '10px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: getSentimentColor(intel.sentimentAssessment.overall) }}>
              {intel.sentimentAssessment.strength?.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: '12px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>{intel.sentimentAssessment.reasoning}</div>
        </div>
        <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', marginBottom: '10px' }}>
            {zh ? '关键主题' : 'KEY THEMES'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {intel.keyThemes?.map((theme, i) => (
              <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', paddingLeft: '12px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, top: '6px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-gold)' }} />
                {theme}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hot Topics */}
      {intel.hotTopics?.length > 0 && (
        <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', marginBottom: '10px' }}>
            {zh ? '实时热点' : 'HOT TOPICS'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {intel.hotTopics.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ padding: '1px 6px', background: `${IMPACT_COLORS[t.impact]}18`, border: `1px solid ${IMPACT_COLORS[t.impact]}40`, borderRadius: '3px', fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', color: IMPACT_COLORS[t.impact], flexShrink: 0, marginTop: '2px' }}>
                  {t.impact?.toUpperCase()}
                </span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.topic}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{t.relevance}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sector Rotation + Risk */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {intel.sectorRotation && (
          <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', marginBottom: '10px' }}>
              {zh ? '板块轮动' : 'SECTOR ROTATION'}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', color: '#22c55e', fontFamily: 'JetBrains Mono, monospace', marginBottom: '4px' }}>
                {zh ? '资金流入 ↑' : 'INFLOW ↑'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {intel.sectorRotation.inflow?.map((s, i) => (
                  <span key={i} style={{ padding: '2px 8px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '3px', fontSize: '11px', color: '#22c55e' }}>{s}</span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#ef4444', fontFamily: 'JetBrains Mono, monospace', marginBottom: '4px' }}>
                {zh ? '资金流出 ↓' : 'OUTFLOW ↓'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {intel.sectorRotation.outflow?.map((s, i) => (
                  <span key={i} style={{ padding: '2px 8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '3px', fontSize: '11px', color: '#ef4444' }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        )}
        {intel.riskEvents?.length > 0 && (
          <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', marginBottom: '10px' }}>
              {zh ? '风险事件' : 'RISK EVENTS'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {intel.riskEvents.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ padding: '1px 6px', background: `${IMPACT_COLORS[r.impact]}18`, border: `1px solid ${IMPACT_COLORS[r.impact]}40`, borderRadius: '3px', fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', color: IMPACT_COLORS[r.impact] }}>
                    {r.impact?.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', flex: 1 }}>{r.event}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>{r.timeframe}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contrarian + Trading */}
      {intel.contrarianSignals?.length > 0 && (
        <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', marginBottom: '10px' }}>
            {zh ? '逆向信号' : 'CONTRARIAN SIGNALS'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {intel.contrarianSignals.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ padding: '2px 8px', background: c.direction === 'long' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${c.direction === 'long' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '3px', fontSize: '10px', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: c.direction === 'long' ? '#22c55e' : '#ef4444' }}>
                  {c.direction?.toUpperCase()}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', flex: 1 }}>{c.signal}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{c.conviction}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trading Implications */}
      {intel.tradingImplications?.length > 0 && (
        <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', marginBottom: '10px' }}>
            {zh ? '交易建议' : 'TRADING IMPLICATIONS'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {intel.tradingImplications.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ padding: '2px 10px', background: t.action === 'buy' ? 'rgba(34,197,94,0.12)' : t.action === 'sell' ? 'rgba(239,68,68,0.12)' : 'var(--bg)', border: `1px solid ${t.action === 'buy' ? 'rgba(34,197,94,0.3)' : t.action === 'sell' ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`, borderRadius: '4px', fontSize: '11px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: t.action === 'buy' ? '#22c55e' : t.action === 'sell' ? '#ef4444' : 'var(--text-primary)', flexShrink: 0 }}>
                  {t.action?.toUpperCase()}
                </span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.target}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{t.reasoning}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Warning */}
      {intel.riskWarning && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '6px' }}>
          <div style={{ fontSize: '10px', color: '#ef4444', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', marginBottom: '6px' }}>
            {zh ? '风险提示' : 'RISK WARNING'}
          </div>
          <div style={{ fontSize: '12px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>{intel.riskWarning}</div>
        </div>
      )}

      {/* Regenerate button */}
      <div style={{ textAlign: 'center', padding: '8px' }}>
        <button onClick={onGenerate} style={{
          padding: '6px 20px', background: 'transparent', border: '1px solid var(--border)',
          borderRadius: '4px', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer'
        }}>{zh ? '重新生成' : 'Regenerate'}</button>
      </div>
    </div>
  )
}

function AssetsSection({ data, getSentimentColor, pct, i18n }: {
  data: PulseData; getSentimentColor: (s: string) => string; pct: (n: number, t: number) => number; i18n: any
}) {
  return (
    <div style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px', marginBottom: '12px' }}>
        {i18n.language === 'zh' ? '资产情绪详情' : 'ASSET SENTIMENT DETAIL'} ({data.assets.length})
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {[i18n.language === 'zh' ? '资产' : 'Asset', i18n.language === 'zh' ? '提及' : 'Mentions', 'Bullish', 'Bearish', 'Neutral', i18n.language === 'zh' ? '置信度' : 'Confidence'].map(h => (
              <th key={h} style={{ padding: '8px 10px', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'left', fontWeight: 500, letterSpacing: '0.5px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.assets.map((a, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: getSentimentColor(a.sentiment) }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{a.asset}</span>
                </div>
              </td>
              <td style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>{a.count}</td>
              <td style={{ padding: '8px 10px', fontSize: '11px', color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>{a.bullish}</td>
              <td style={{ padding: '8px 10px', fontSize: '11px', color: '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>{a.bearish}</td>
              <td style={{ padding: '8px 10px', fontSize: '11px', color: '#a1a1aa', fontFamily: 'JetBrains Mono, monospace' }}>{a.neutral}</td>
              <td style={{ padding: '8px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '40px', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round(a.avgConfidence * 100)}%`, background: getSentimentColor(a.sentiment), borderRadius: '2px' }} />
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{Math.round(a.avgConfidence * 100)}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
