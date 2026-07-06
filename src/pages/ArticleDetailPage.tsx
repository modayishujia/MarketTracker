import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useArticleStore } from '../stores/articleStore'
import { useAnalysisStore } from '../stores/analysisStore'
import { InsightPanel } from '../components/InsightPanel'
import { SentimentPanel } from '../components/SentimentPanel'
import { NotesPanel } from '../components/NotesPanel'
import { ReportPanel } from '../components/ReportPanel'
import type { AnalysisResult, ReportResult } from '../types'

interface ArticleDetailPageProps {
  articleId: number
  onBack: () => void
}

export function ArticleDetailPage({ articleId, onBack }: ArticleDetailPageProps) {
  const { t } = useTranslation()
  const { currentArticle, loading, loadArticle, markRead, toggleFavorite } = useArticleStore()
  const { analyses, loadAnalyses } = useAnalysisStore()
  const [analyzing, setAnalyzing] = useState(false)
  const [sentimentAnalyzing, setSentimentAnalyzing] = useState(false)
  const [liveResult, setLiveResult] = useState<AnalysisResult | null>(null)
  const [liveResultType, setLiveResultType] = useState<'insight' | 'sentiment' | null>(null)
  const [liveReport, setLiveReport] = useState<ReportResult | null>(null)

  useEffect(() => {
    loadArticle(articleId)
    loadAnalyses(articleId)
    setLiveResult(null)
    setLiveResultType(null)
    setLiveReport(null)
  }, [articleId, loadArticle, loadAnalyses])

  useEffect(() => {
    if (currentArticle && !currentArticle.is_read) {
      markRead(articleId)
    }
  }, [currentArticle, articleId, markRead])

  const handleAnalyze = useCallback(async () => {
    if (!currentArticle) return
    setAnalyzing(true)
    setLiveResult(null)
    setLiveResultType(null)
    try {
      const result = await (window as any).electronAPI.llm.analyzeArticle(
        currentArticle.title,
        currentArticle.content || ''
      )
      setLiveResult(result)
      setLiveResultType('insight')
      await loadAnalyses(articleId)
    } catch {
      // error handled by store
    } finally {
      setAnalyzing(false)
    }
  }, [currentArticle, articleId, loadAnalyses])

  const handleSentiment = useCallback(async () => {
    if (!currentArticle) return
    setSentimentAnalyzing(true)
    setLiveResult(null)
    setLiveResultType(null)
    try {
      const result = await (window as any).electronAPI.llm.analyzeSentiment(
        currentArticle.title,
        currentArticle.content || ''
      )
      setLiveResult(result)
      setLiveResultType('sentiment')
      await loadAnalyses(articleId)
    } catch {
      // error handled by store
    } finally {
      setSentimentAnalyzing(false)
    }
  }, [currentArticle, articleId, loadAnalyses])

  const parsedResults = analyses
    .map(a => {
      try {
        return { ...a, parsed: JSON.parse(a.result) }
      } catch {
        return null
      }
    })
    .filter(Boolean) as Array<{ analysis_type: string; parsed: AnalysisResult | ReportResult }>

  const latestInsight = liveResult && liveResultType === 'insight'
    ? liveResult
    : parsedResults.find(a => a.analysis_type === 'insight')?.parsed as AnalysisResult | undefined

  const latestSentiment = liveResult && liveResultType === 'sentiment'
    ? liveResult
    : parsedResults.find(a => a.analysis_type === 'sentiment')?.parsed as AnalysisResult | undefined

  const latestReport = liveReport || parsedResults.find(a => a.analysis_type === 'report')?.parsed as ReportResult | undefined

  if (loading) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="text-blue-400 hover:text-blue-300 mb-4">
          ← {t('common.cancel')}
        </button>
        <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
      </div>
    )
  }

  if (!currentArticle) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="text-blue-400 hover:text-blue-300 mb-4">
          ← {t('common.cancel')}
        </button>
        <div className="text-center py-12 text-gray-500">{t('common.error')}</div>
      </div>
    )
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-blue-400 hover:text-blue-300">
          ← {t('common.cancel')}
        </button>
        <div className="flex-1" />
        <button
          onClick={() => toggleFavorite(articleId)}
          className={`text-xl ${currentArticle.is_favorite ? 'text-yellow-400' : 'text-gray-600 hover:text-gray-400'}`}
        >
          {currentArticle.is_favorite ? '★' : '☆'}
        </button>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        <div className="flex-1 overflow-auto">
          <h1 className="text-2xl font-bold text-white mb-4">{currentArticle.title}</h1>
          {currentArticle.published_at && (
            <p className="text-sm text-gray-500 mb-4">
              {new Date(currentArticle.published_at).toLocaleString()}
            </p>
          )}
          {currentArticle.url && (
            <a
              href={currentArticle.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block"
            >
              {currentArticle.url}
            </a>
          )}
          <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mt-4">
            {currentArticle.content || t('articles.noArticles')}
          </div>
        </div>

        <div className="w-96 shrink-0 overflow-auto space-y-4">
          <div className="flex gap-2">
            <button
              onClick={handleAnalyze}
              disabled={analyzing || sentimentAnalyzing}
              className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? t('analysis.analyzing') : t('analysis.analyze')}
            </button>
            <button
              onClick={handleSentiment}
              disabled={analyzing || sentimentAnalyzing}
              className="flex-1 px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sentimentAnalyzing ? t('analysis.analyzing') : t('analysis.sentiment')}
            </button>
          </div>

          {(analyzing || sentimentAnalyzing) && (
            <div className="text-center py-4 text-gray-400 text-sm">{t('analysis.analyzing')}</div>
          )}

          {latestInsight && (
            <InsightPanel result={latestInsight} />
          )}

          {latestSentiment && (
            <SentimentPanel result={latestSentiment} />
          )}

          {latestReport && (
            <ReportPanel result={latestReport} />
          )}

          {!latestInsight && !latestSentiment && !latestReport && !analyzing && !sentimentAnalyzing && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center text-gray-500 text-sm">
              {t('analysis.noAnalysis')}
            </div>
          )}

          <NotesPanel articleId={articleId} />
        </div>
      </div>
    </div>
  )
}
