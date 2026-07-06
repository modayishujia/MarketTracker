import { useTranslation } from 'react-i18next'
import type { ReportResult } from '../types'

interface ReportPanelProps {
  result: ReportResult
}

export function ReportPanel({ result }: ReportPanelProps) {
  const { t } = useTranslation()

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-white font-semibold mb-1">{result.title || t('analysis.report')}</h3>
      <p className="text-gray-400 text-sm mb-4">{result.summary}</p>

      {result.keyThemes.length > 0 && (
        <div className="mb-4">
          <h4 className="text-gray-400 text-xs uppercase mb-2">Key Themes</h4>
          <div className="flex flex-wrap gap-2">
            {result.keyThemes.map((theme, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-purple-900/50 text-purple-300 rounded-full">
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-gray-400 text-xs uppercase mb-2">Market Outlook</h4>
        <p className="text-gray-300 text-sm">{result.marketOutlook}</p>
      </div>
    </div>
  )
}
