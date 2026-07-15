import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface BriefingItem {
  id: number
  title: string
  briefing_type: string
  summary: string | null
  articles_count: number
  created_at: string
}

interface BriefingDetail extends BriefingItem {
  content_html: string
}

export function AIBriefing() {
  const { t, i18n } = useTranslation()
  const api = (window as any).electronAPI

  const [briefings, setBriefings] = useState<BriefingItem[]>([])
  const [selected, setSelected] = useState<BriefingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<string>('')

  useEffect(() => {
    loadList()
    // Listen for progress events
    api.briefings?.list && api.onBriefingProgress?.((data: any) => {
      const stageLabels: Record<string, string> = {
        collecting: i18n.language === 'zh' ? '收集数据...' : 'Collecting data...',
        searching: i18n.language === 'zh' ? '搜索网络热点...' : 'Searching web...',
        generating: i18n.language === 'zh' ? 'AI 生成报告...' : 'Generating report...',
        saving: i18n.language === 'zh' ? '保存中...' : 'Saving...',
        done: i18n.language === 'zh' ? '完成' : 'Done'
      }
      setProgress(stageLabels[data.stage] || data.stage)
    })
  }, [])

  const loadList = async () => {
    try {
      const list = await api.briefings.list(50)
      setBriefings(list)
    } catch {}
    setLoading(false)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setProgress(i18n.language === 'zh' ? '开始生成...' : 'Starting...')
    try {
      const result = await api.briefings.generate()
      if (result.error) {
        setProgress(result.error)
      } else {
        setProgress(i18n.language === 'zh' ? '完成' : 'Done')
        await loadList()
        // Auto-load the new briefing
        if (result.id) {
          const detail = await api.briefings.get(result.id)
          if (detail) setSelected(detail)
        }
      }
    } catch (e: any) {
      setProgress(e.message || 'Failed')
    }
    setTimeout(() => { setGenerating(false); setProgress('') }, 2000)
  }

  const handleSelect = async (id: number) => {
    try {
      const detail = await api.briefings.get(id)
      if (detail) setSelected(detail)
    } catch {}
  }

  const handleDelete = async (id: number) => {
    await api.briefings.delete(id)
    setBriefings(prev => prev.filter(b => b.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const formatTime = (dt: string) => {
    const d = new Date(dt)
    return d.toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

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
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{t('brief.title')}</span>
        <span style={{
          padding: '1px 8px', background: 'var(--accent-gold-dim)', border: '1px solid var(--border-accent)',
          borderRadius: '10px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-gold)'
        }}>{briefings.length}</span>
        <div style={{ flex: 1 }} />
        {progress && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            {progress}
          </span>
        )}
        <button onClick={handleGenerate} disabled={generating} style={{
          padding: '4px 14px',
          background: generating ? 'var(--surface)' : 'var(--accent-gold-dim)',
          border: `1px solid ${generating ? 'var(--border)' : 'var(--border-accent)'}`,
          borderRadius: '4px',
          color: generating ? 'var(--text-muted)' : 'var(--accent-gold)',
          fontSize: '11px', fontWeight: 600, cursor: generating ? 'default' : 'pointer'
        }}>
          {generating ? '...' : (i18n.language === 'zh' ? '生成简报' : 'Generate')}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* History List */}
        <div style={{ width: '260px', borderRight: '1px solid var(--border)', overflow: 'auto', flexShrink: 0 }}>
          {briefings.length === 0 ? (
            <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              {i18n.language === 'zh' ? '暂无简报，点击"生成简报"开始' : 'No briefings yet'}
            </div>
          ) : briefings.map(b => (
            <div key={b.id} onClick={() => handleSelect(b.id)} style={{
              padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
              background: selected?.id === b.id ? 'var(--surface)' : 'transparent'
            }}
            onMouseEnter={e => { if (selected?.id !== b.id) e.currentTarget.style.background = 'var(--surface)' }}
            onMouseLeave={e => { if (selected?.id !== b.id) e.currentTarget.style.background = 'transparent' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {b.title}
              </div>
              {b.summary && (
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: '4px' }}>
                  {b.summary}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {formatTime(b.created_at)}
                </span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {b.articles_count} {i18n.language === 'zh' ? '篇' : 'articles'}
                </span>
                <button onClick={e => { e.stopPropagation(); handleDelete(b.id) }} style={{
                  marginLeft: 'auto', padding: '0 4px', background: 'transparent', border: 'none',
                  color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer'
                }}>x</button>
              </div>
            </div>
          ))}
        </div>

        {/* Report Viewer */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {selected ? (
            <div>
              <div style={{
                padding: '10px 16px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{selected.title}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {formatTime(selected.created_at)}
                </span>
              </div>
              <iframe
                sandbox="allow-same-origin"
                style={{ width: '100%', height: 'calc(100% - 42px)', border: 'none', background: '#0b0b14' }}
                srcDoc={selected.content_html}
              />
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              {i18n.language === 'zh' ? '选择简报查看' : 'Select a briefing'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
