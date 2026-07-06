import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { SentimentChart } from '../components/SentimentChart'
import { AssetFrequencyChart } from '../components/AssetFrequencyChart'
import { SentimentPieChart } from '../components/SentimentPieChart'
import type { Analysis, AnalysisResult, ReportResult } from '../types'

export function DashboardPage() {
  const { t } = useTranslation()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)
  const [report, setReport] = useState<ReportResult | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)

  useEffect(() => {
    loadAnalyses()
  }, [])

  async function loadAnalyses() {
    try {
      setLoading(true)
      const data = await window.electronAPI.analyses.getRecent(200)
      setAnalyses(data)
    } catch (err) {
      console.error('Failed to load analyses:', err)
    } finally {
      setLoading(false)
    }
  }

  function parseResult(analysis: Analysis): AnalysisResult | null {
    try {
      return JSON.parse(analysis.result) as AnalysisResult
    } catch {
      return null
    }
  }

  const sentimentAnalyses = useMemo(() => {
    return analyses.filter((a) => a.analysis_type === 'sentiment')
  }, [analyses])

  const sentimentData = useMemo(() => {
    const dateMap = new Map<string, { bullish: number; bearish: number; neutral: number }>()
    for (const analysis of sentimentAnalyses) {
      const result = parseResult(analysis)
      if (!result) continue
      const date = analysis.created_at.slice(0, 10)
      const entry = dateMap.get(date) || { bullish: 0, bearish: 0, neutral: 0 }
      entry[result.sentiment]++
      dateMap.set(date, entry)
    }
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }))
  }, [sentimentAnalyses])

  const assetData = useMemo(() => {
    const assetMap = new Map<string, number>()
    for (const analysis of sentimentAnalyses) {
      const result = parseResult(analysis)
      if (!result?.assets) continue
      for (const asset of result.assets) {
        assetMap.set(asset, (assetMap.get(asset) || 0) + 1)
      }
    }
    return Array.from(assetMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([asset, count]) => ({ asset, count }))
  }, [sentimentAnalyses])

  const sentimentPieData = useMemo(() => {
    let bullish = 0
    let bearish = 0
    let neutral = 0
    for (const analysis of sentimentAnalyses) {
      const result = parseResult(analysis)
      if (!result) continue
      if (result.sentiment === 'bullish') bullish++
      else if (result.sentiment === 'bearish') bearish++
      else neutral++
    }
    return [
      { name: t('dashboard.bullish'), value: bullish },
      { name: t('dashboard.bearish'), value: bearish },
      { name: t('dashboard.neutral'), value: neutral },
    ]
  }, [sentimentAnalyses, t])

  const hasData = sentimentAnalyses.length > 0

  async function handleGenerateReport() {
    try {
      setReportLoading(true)
      setReportError(null)
      setReport(null)
      const recentAnalyses = analyses.slice(0, 20)
      const articles: { title: string; content: string }[] = []
      for (const analysis of recentAnalyses) {
        try {
          const article = await window.electronAPI.articles.getById(analysis.article_id)
          if (article) {
            articles.push({ title: article.title, content: article.content || '' })
          }
        } catch {
          // skip missing articles
        }
      }
      if (articles.length === 0) {
        setReportError(t('dashboard.noArticlesForReport'))
        return
      }
      const result = await window.electronAPI.llm.generateReport(articles)
      setReport(result)
    } catch (err) {
      setReportError((err as Error).message)
    } finally {
      setReportLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-gray-400">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white">{t('dashboard.title')}</h2>

      {!hasData ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">{t('dashboard.noData')}</p>
          <p className="text-gray-500 mt-2">{t('dashboard.noDataHint')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.sentimentTrend')}</h3>
              <SentimentChart data={sentimentData} />
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.assetFrequency')}</h3>
              <AssetFrequencyChart data={assetData} />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.sentimentDistribution')}</h3>
            <SentimentPieChart data={sentimentPieData} />
          </div>
        </>
      )}

      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.generateReport')}</h3>
        <button
          onClick={handleGenerateReport}
          disabled={reportLoading || analyses.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {reportLoading ? t('dashboard.generating') : t('dashboard.generateReportButton')}
        </button>
        {reportError && (
          <p className="mt-3 text-red-400">{reportError}</p>
        )}
        {report && (
          <div className="mt-4 bg-gray-700 rounded p-4 space-y-3">
            <h4 className="text-white font-semibold">{report.title}</h4>
            <p className="text-gray-300">{report.summary}</p>
            {report.keyThemes.length > 0 && (
              <div>
                <span className="text-gray-400 text-sm">{t('dashboard.keyThemes')}: </span>
                <span className="text-gray-300 text-sm">{report.keyThemes.join(', ')}</span>
              </div>
            )}
            <div>
              <span className="text-gray-400 text-sm">{t('dashboard.marketOutlook')}: </span>
              <span className="text-gray-300 text-sm">{report.marketOutlook}</span>
            </div>
            <div className="text-gray-500 text-xs">
              {t('dashboard.articlesAnalyzed', { count: report.articlesAnalyzed })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
