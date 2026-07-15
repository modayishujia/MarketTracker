import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface SignalData {
  id: number
  company_id: number
  signal_type: string
  grade: string
  score: number
  reasoning: string
  evidence: string
  status: string
  created_at: string
  company_name?: string
  ticker?: string | null
  sector?: string | null
}

interface CompanyData {
  id: number
  name: string
  ticker: string | null
  sector: string | null
  description: string | null
}

interface ProductData {
  id: number
  company_id: number
  name: string
  category: string | null
  description: string | null
  keywords: string | null
  company_name?: string
  ticker?: string | null
}

interface ArticleData {
  id: number
  title: string
  title_zh: string | null
  url: string
  published_at: string | null
  sentiment: string | null
  confidence: number | null
  summary: string | null
}

const GRADE_COLORS: Record<string, string> = {
  S: '#ff4444',
  A: '#ff8800',
  B: '#ffcc00',
  C: '#888888'
}

const SENTIMENT_COLORS: Record<string, string> = {
  bullish: '#22c55e',
  bearish: '#ef4444',
  neutral: '#a1a1aa'
}

export function OpportunityScanner() {
  const { t, i18n } = useTranslation()
  const api = (window as any).electronAPI

  const [signals, setSignals] = useState<SignalData[]>([])
  const [companies, setCompanies] = useState<CompanyData[]>([])
  const [products, setProducts] = useState<ProductData[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'signals' | 'companies'>('signals')
  const [selectedSignal, setSelectedSignal] = useState<SignalData | null>(null)
  const [signalArticles, setSignalArticles] = useState<ArticleData[]>([])
  const [signalProducts, setSignalProducts] = useState<ProductData[]>([])
  const [gradeFilter, setGradeFilter] = useState<string>('all')

  const [showAddCompany, setShowAddCompany] = useState(false)
  const [newCompany, setNewCompany] = useState({ name: '', ticker: '', sector: '', description: '' })
  const [showAddProduct, setShowAddProduct] = useState<number | null>(null)
  const [newProduct, setNewProduct] = useState({ name: '', category: '', description: '', keywords: '' })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [s, c, p] = await Promise.all([
        api.signals.getActive(100),
        api.companies.getAll(),
        api.products.getAll()
      ])
      setSignals(s)
      setCompanies(c)
      setProducts(p)
    } catch {}
    setLoading(false)
  }

  const loadSignalDetail = async (signal: SignalData) => {
    setSelectedSignal(signal)
    try {
      const [articles, prods] = await Promise.all([
        api.signals.getCompanyArticles(signal.company_id, 30),
        api.signals.getCompanyProducts(signal.company_id)
      ])
      setSignalArticles(articles)
      setSignalProducts(prods)
    } catch {}
  }

  const handleScan = async () => {
    setScanning(true)
    setScanResult(null)
    try {
      const result = await api.signals.scan()
      if (result.ok) {
        setScanResult(`${result.scanned} ${i18n.language === 'zh' ? '篇' : 'articles'}, ${result.signals} ${i18n.language === 'zh' ? '新信号' : 'new'}`)
        const s = await api.signals.getActive(100)
        setSignals(s)
      }
    } catch {}
    setScanning(false)
    setTimeout(() => setScanResult(null), 5000)
  }

  const handleDismissSignal = async (id: number) => {
    await api.signals.dismiss(id)
    setSignals(prev => prev.filter(s => s.id !== id))
    if (selectedSignal?.id === id) setSelectedSignal(null)
  }

  const handleAddCompany = async () => {
    if (!newCompany.name.trim()) return
    const c = await api.companies.add(newCompany.name, newCompany.ticker || undefined, newCompany.sector || undefined, newCompany.description || undefined)
    setCompanies(prev => [...prev, c])
    setNewCompany({ name: '', ticker: '', sector: '', description: '' })
    setShowAddCompany(false)
  }

  const handleDeleteCompany = async (id: number) => {
    await api.companies.delete(id)
    setCompanies(prev => prev.filter(c => c.id !== id))
    setProducts(prev => prev.filter(p => p.company_id !== id))
  }

  const handleAddProduct = async (companyId: number) => {
    if (!newProduct.name.trim()) return
    const p = await api.products.add(companyId, newProduct.name, newProduct.category || undefined, newProduct.description || undefined, newProduct.keywords || undefined)
    setProducts(prev => [...prev, { ...p, company_name: companies.find(c => c.id === companyId)?.name }])
    setNewProduct({ name: '', category: '', description: '', keywords: '' })
    setShowAddProduct(null)
  }

  const handleDeleteProduct = async (id: number) => {
    await api.products.delete(id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  const filteredSignals = gradeFilter === 'all' ? signals : signals.filter(s => s.grade === gradeFilter)

  const formatTime = (dt: string | null) => {
    if (!dt) return '-'
    const d = new Date(dt)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
  }

  const formatDate = (dt: string | null) => {
    if (!dt) return '-'
    return new Date(dt).toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })
  }

  // Parse signal evidence into structured data
  const parseEvidence = (evidence: string) => {
    const lines = evidence.split('\n')
    const data: Record<string, string> = {}
    for (const line of lines) {
      const idx = line.indexOf(':')
      if (idx > 0) data[line.substring(0, idx).trim()] = line.substring(idx + 1).trim()
    }
    return data
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
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{t('alpha.title')}</span>
        <span style={{
          padding: '1px 8px', background: 'var(--accent-gold-dim)', border: '1px solid var(--border-accent)',
          borderRadius: '10px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-gold)'
        }}>{signals.length}</span>
        <button onClick={handleScan} disabled={scanning} style={{
          padding: '3px 10px', background: scanning ? 'var(--surface)' : 'var(--accent-gold-dim)',
          border: `1px solid ${scanning ? 'var(--border)' : 'var(--border-accent)'}`, borderRadius: '4px',
          color: scanning ? 'var(--text-muted)' : 'var(--accent-gold)', fontSize: '11px', cursor: scanning ? 'default' : 'pointer'
        }}>{scanning ? '...' : (i18n.language === 'zh' ? '扫描' : 'Scan')}</button>
        {scanResult && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{scanResult}</span>}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: '2px' }}>
          {(['signals', 'companies'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '3px 10px', background: activeTab === tab ? 'var(--accent-gold-dim)' : 'transparent',
              border: `1px solid ${activeTab === tab ? 'var(--border-accent)' : 'var(--border)'}`, borderRadius: '4px',
              color: activeTab === tab ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '11px', cursor: 'pointer'
            }}>{tab === 'signals' ? (i18n.language === 'zh' ? '信号' : 'Signals') : (i18n.language === 'zh' ? '公司库' : 'Companies')}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {activeTab === 'signals' ? (
          <>
            {/* Signal List */}
            <div style={{ width: '280px', overflow: 'auto', borderRight: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ padding: '6px 8px', display: 'flex', gap: '3px', borderBottom: '1px solid var(--border)' }}>
                {['all', 'S', 'A', 'B', 'C'].map(g => (
                  <button key={g} onClick={() => setGradeFilter(g)} style={{
                    padding: '1px 8px', background: gradeFilter === g ? (g === 'all' ? 'var(--surface)' : `${GRADE_COLORS[g]}22`) : 'transparent',
                    border: `1px solid ${gradeFilter === g ? (g === 'all' ? 'var(--border)' : GRADE_COLORS[g]) : 'var(--border)'}`,
                    borderRadius: '10px', color: gradeFilter === g ? (g === 'all' ? 'var(--text-primary)' : GRADE_COLORS[g]) : 'var(--text-muted)',
                    fontSize: '10px', fontWeight: 600, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace'
                  }}>{g === 'all' ? (i18n.language === 'zh' ? '全部' : 'All') : g}</button>
                ))}
              </div>
              {filteredSignals.length === 0 ? (
                <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  {i18n.language === 'zh' ? '暂无信号' : 'No signals'}
                </div>
              ) : filteredSignals.map(signal => (
                <div key={signal.id} onClick={() => loadSignalDetail(signal)} style={{
                  padding: '8px 10px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: selectedSignal?.id === signal.id ? 'var(--surface)' : 'transparent'
                }}
                onMouseEnter={e => { if (selectedSignal?.id !== signal.id) e.currentTarget.style.background = 'var(--surface)' }}
                onMouseLeave={e => { if (selectedSignal?.id !== signal.id) e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{
                      width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: GRADE_COLORS[signal.grade], fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                      border: `1px solid ${GRADE_COLORS[signal.grade]}`, borderRadius: '3px'
                    }}>{signal.grade}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{signal.company_name}</span>
                    {signal.ticker && <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{signal.ticker}</span>}
                    <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{formatTime(signal.created_at)}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {signal.reasoning.substring(0, 50)}
                  </div>
                </div>
              ))}
            </div>

            {/* Signal Detail */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {selectedSignal ? (
                <div style={{ padding: '16px 20px' }}>
                  {/* Company Header */}
                  <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedSignal.company_name}</span>
                      {selectedSignal.ticker && <span style={{ fontSize: '13px', color: 'var(--accent-gold)', fontFamily: 'JetBrains Mono, monospace' }}>{selectedSignal.ticker}</span>}
                      {selectedSignal.sector && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedSignal.sector}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {i18n.language === 'zh' ? '信号等级' : 'Grade'}: <span style={{ color: GRADE_COLORS[selectedSignal.grade], fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{selectedSignal.grade}</span>
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {i18n.language === 'zh' ? '评分' : 'Score'}: <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{selectedSignal.score.toFixed(1)}</span>
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {i18n.language === 'zh' ? '类型' : 'Type'}: {selectedSignal.signal_type}
                      </span>
                      <button onClick={() => handleDismissSignal(selectedSignal.id)} style={{
                        marginLeft: 'auto', padding: '2px 10px', background: 'transparent',
                        border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer'
                      }}>{i18n.language === 'zh' ? '忽略' : 'Dismiss'}</button>
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {i18n.language === 'zh' ? '分析' : 'Analysis'}
                    </div>
                    <div style={{ fontSize: '12px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
                      {selectedSignal.reasoning}
                    </div>
                  </div>

                  {/* Evidence Summary */}
                  {(() => {
                    const ev = parseEvidence(selectedSignal.evidence)
                    return (
                      <div style={{
                        marginBottom: '14px', padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px',
                        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px'
                      }}>
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>{i18n.language === 'zh' ? '文章数' : 'Articles'}</div>
                          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{ev['Articles'] || ev['文章数'] || '-'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: '#22c55e', marginBottom: '2px' }}>Bullish</div>
                          <div style={{ fontSize: '16px', fontWeight: 600, color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>{ev['Bullish'] || '0'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: '#ef4444', marginBottom: '2px' }}>Bearish</div>
                          <div style={{ fontSize: '16px', fontWeight: 600, color: '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>{ev['Bearish'] || '0'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>Neutral</div>
                          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{ev['Neutral'] || '0'}</div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Products */}
                  {signalProducts.length > 0 && (
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {i18n.language === 'zh' ? '关联产品' : 'Products'} ({signalProducts.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {signalProducts.map(p => (
                          <span key={p.id} style={{
                            padding: '2px 8px', background: 'var(--surface)', border: '1px solid var(--border)',
                            borderRadius: '3px', fontSize: '11px', color: 'var(--text-secondary)'
                          }}>
                            {p.name}
                            {p.keywords && <span style={{ color: 'var(--text-muted)', marginLeft: '4px', fontSize: '10px' }}>({p.keywords})</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related Articles */}
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {i18n.language === 'zh' ? '相关文章' : 'Articles'} ({signalArticles.length})
                    </div>
                    <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                      {signalArticles.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                          {i18n.language === 'zh' ? '暂无相关文章' : 'No articles'}
                        </div>
                      ) : signalArticles.map((article, idx) => (
                        <div key={article.id} style={{
                          padding: '8px 12px',
                          borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                          display: 'flex', alignItems: 'flex-start', gap: '10px'
                        }}>
                          {/* Sentiment indicator */}
                          <span style={{
                            width: '6px', height: '6px', borderRadius: '50%', marginTop: '5px', flexShrink: 0,
                            background: article.sentiment ? SENTIMENT_COLORS[article.sentiment] || 'var(--text-muted)' : 'var(--text-muted)'
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-primary)', marginBottom: '2px', lineHeight: '1.4' }}>
                              {article.title_zh || article.title}
                            </div>
                            {article.summary && (
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {article.summary}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: '2px' }}>
                            {article.sentiment && (
                              <span style={{
                                padding: '0 5px', fontSize: '9px', fontWeight: 600, borderRadius: '2px',
                                color: SENTIMENT_COLORS[article.sentiment],
                                background: `${SENTIMENT_COLORS[article.sentiment]}18`,
                                border: `1px solid ${SENTIMENT_COLORS[article.sentiment]}30`,
                                fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase'
                              }}>{article.sentiment}</span>
                            )}
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                              {formatDate(article.published_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  {i18n.language === 'zh' ? '选择信号查看详情' : 'Select a signal'}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Companies Tab */
          <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
            <button onClick={() => setShowAddCompany(!showAddCompany)} style={{
              width: '100%', padding: '8px', marginBottom: '12px', background: 'var(--surface)',
              border: '1px dashed var(--border)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer'
            }}>+ {i18n.language === 'zh' ? '添加公司' : 'Add Company'}</button>

            {showAddCompany && (
              <div style={{ padding: '12px', marginBottom: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                <input placeholder={i18n.language === 'zh' ? '公司名称' : 'Company Name'} value={newCompany.name} onChange={e => setNewCompany(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '6px 8px', marginBottom: '6px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                <input placeholder={i18n.language === 'zh' ? '股票代码' : 'Ticker'} value={newCompany.ticker} onChange={e => setNewCompany(prev => ({ ...prev, ticker: e.target.value }))}
                  style={{ width: '100%', padding: '6px 8px', marginBottom: '6px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                <input placeholder={i18n.language === 'zh' ? '行业' : 'Sector'} value={newCompany.sector} onChange={e => setNewCompany(prev => ({ ...prev, sector: e.target.value }))}
                  style={{ width: '100%', padding: '6px 8px', marginBottom: '6px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={handleAddCompany} style={{ flex: 1, padding: '6px', background: 'var(--accent-gold-dim)', border: '1px solid var(--border-accent)', borderRadius: '4px', color: 'var(--accent-gold)', fontSize: '11px', cursor: 'pointer' }}>{i18n.language === 'zh' ? '保存' : 'Save'}</button>
                  <button onClick={() => setShowAddCompany(false)} style={{ flex: 1, padding: '6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}>{i18n.language === 'zh' ? '取消' : 'Cancel'}</button>
                </div>
              </div>
            )}

            {companies.map(company => (
              <div key={company.id} style={{ marginBottom: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{company.name}</span>
                  {company.ticker && <span style={{ fontSize: '11px', color: 'var(--accent-gold)', fontFamily: 'JetBrains Mono, monospace' }}>{company.ticker}</span>}
                  {company.sector && <span style={{ padding: '1px 6px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '3px', fontSize: '10px', color: 'var(--text-muted)' }}>{company.sector}</span>}
                  <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>{products.filter(p => p.company_id === company.id).length} {i18n.language === 'zh' ? '产品' : 'products'}</span>
                  <button onClick={() => setShowAddProduct(showAddProduct === company.id ? null : company.id)} style={{ padding: '2px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer' }}>+</button>
                  <button onClick={() => handleDeleteCompany(company.id)} style={{ padding: '2px 6px', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>x</button>
                </div>
                {showAddProduct === company.id && (
                  <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
                    <input placeholder={i18n.language === 'zh' ? '产品名称' : 'Product Name'} value={newProduct.name} onChange={e => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                      style={{ width: '100%', padding: '5px 8px', marginBottom: '4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-primary)', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }} />
                    <input placeholder={i18n.language === 'zh' ? '关键词 (逗号分隔)' : 'Keywords (comma sep)'} value={newProduct.keywords} onChange={e => setNewProduct(prev => ({ ...prev, keywords: e.target.value }))}
                      style={{ width: '100%', padding: '5px 8px', marginBottom: '4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-primary)', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => handleAddProduct(company.id)} style={{ flex: 1, padding: '4px', background: 'var(--accent-gold-dim)', border: '1px solid var(--border-accent)', borderRadius: '3px', color: 'var(--accent-gold)', fontSize: '10px', cursor: 'pointer' }}>{i18n.language === 'zh' ? '添加' : 'Add'}</button>
                      <button onClick={() => setShowAddProduct(null)} style={{ flex: 1, padding: '4px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer' }}>{i18n.language === 'zh' ? '取消' : 'Cancel'}</button>
                    </div>
                  </div>
                )}
                {products.filter(p => p.company_id === company.id).map(product => (
                  <div key={product.id} style={{ padding: '6px 12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{product.name}</span>
                    {product.keywords && <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{product.keywords}</span>}
                    <button onClick={() => handleDeleteProduct(product.id)} style={{ marginLeft: 'auto', padding: '0 4px', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}>x</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
