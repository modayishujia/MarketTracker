import { useTranslation } from 'react-i18next'
import type { AnalysisResult } from '../types'

interface InsightPanelProps {
  result: AnalysisResult
}

export function InsightPanel({ result }: InsightPanelProps) {
  const { t } = useTranslation()

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-white font-semibold mb-3">{t('analysis.insights')}</h3>
      <p className="text-gray-300 text-sm mb-4">{result.summary}</p>

      {result.keyPoints.length > 0 && (
        <div className="mb-4">
          <h4 className="text-gray-400 text-xs uppercase mb-2">{t('analysis.keyPoints')}</h4>
          <ul className="space-y-1">
            {result.keyPoints.map((point, i) => (
              <li key={i} className="text-gray-300 text-sm flex gap-2">
                <span className="text-blue-400">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.assets.length > 0 && (
        <div>
          <h4 className="text-gray-400 text-xs uppercase mb-2">{t('analysis.assets')}</h4>
          <div className="flex flex-wrap gap-2">
            {result.assets.map((asset, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-blue-900/50 text-blue-300 rounded-full">
                {asset}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
