import { useTranslation } from 'react-i18next'
import type { AnalysisResult } from '../types'

interface SentimentPanelProps {
  result: AnalysisResult
}

const sentimentConfig = {
  bullish: { color: 'text-green-400', bg: 'bg-green-900/50', bar: 'bg-green-500', label: 'analysis.bullish' },
  bearish: { color: 'text-red-400', bg: 'bg-red-900/50', bar: 'bg-red-500', label: 'analysis.bearish' },
  neutral: { color: 'text-yellow-400', bg: 'bg-yellow-900/50', bar: 'bg-yellow-500', label: 'analysis.neutral' }
}

export function SentimentPanel({ result }: SentimentPanelProps) {
  const { t } = useTranslation()
  const config = sentimentConfig[result.sentiment] || sentimentConfig.neutral

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-white font-semibold mb-3">{t('analysis.sentiment')}</h3>

      <div className="mb-4">
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.color}`}>
          {t(config.label)}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">{t('analysis.confidence')}</span>
          <span className="text-white">{Math.round(result.confidence * 100)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`${config.bar} h-2 rounded-full transition-all`}
            style={{ width: `${result.confidence * 100}%` }}
          />
        </div>
      </div>

      <div>
        <h4 className="text-gray-400 text-xs uppercase mb-2">{t('analysis.reasoning')}</h4>
        <p className="text-gray-300 text-sm">{result.reasoning}</p>
      </div>
    </div>
  )
}
