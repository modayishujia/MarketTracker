import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../stores/settingsStore'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const {
    llmConfig, fetchInterval, autoAnalyze,
    loadSettings, saveLLMConfig, saveFetchInterval, saveAutoAnalyze, saveLanguage, testConnection
  } = useSettingsStore()

  const [baseUrl, setBaseUrl] = useState(llmConfig.baseUrl)
  const [apiKey, setApiKey] = useState(llmConfig.apiKey)
  const [model, setModel] = useState(llmConfig.model)
  const [interval, setInterval] = useState(fetchInterval)
  const [auto, setAuto] = useState(autoAnalyze)
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadSettings() }, [loadSettings])
  useEffect(() => {
    setBaseUrl(llmConfig.baseUrl)
    setApiKey(llmConfig.apiKey)
    setModel(llmConfig.model)
    setInterval(fetchInterval)
    setAuto(autoAnalyze)
  }, [llmConfig, fetchInterval, autoAnalyze])

  const handleSaveLLM = async () => {
    setSaving(true)
    await saveLLMConfig({ baseUrl, apiKey, model })
    setSaving(false)
  }

  const handleTest = async () => {
    setTestResult(null)
    const result = await testConnection()
    setTestResult(result)
  }

  const handleLanguageChange = async (lang: string) => {
    i18n.changeLanguage(lang)
    await saveLanguage(lang)
  }

  const handleIntervalChange = async (value: string) => {
    const num = parseInt(value)
    if (!isNaN(num) && num > 0) {
      setInterval(num)
      await saveFetchInterval(num)
    }
  }

  const handleAutoAnalyzeChange = async (checked: boolean) => {
    setAuto(checked)
    await saveAutoAnalyze(checked)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-white">{t('settings.title')}</h2>

      <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 space-y-4">
        <h3 className="text-lg font-semibold text-white">{t('settings.llm')}</h3>
        <div>
          <label className="block text-sm text-gray-300 mb-1">{t('settings.baseUrl')}</label>
          <input
            type="text"
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">{t('settings.apiKey')}</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">{t('settings.model')}</label>
          <input
            type="text"
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder="gpt-4o-mini"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSaveLLM}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? t('common.loading') : t('settings.save')}
          </button>
          <button
            onClick={handleTest}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
          >
            {t('settings.testConnection')}
          </button>
          {testResult !== null && (
            <span className={`self-center text-sm ${testResult ? 'text-green-400' : 'text-red-400'}`}>
              {testResult ? t('settings.connectionSuccess') : t('settings.connectionFailed')}
            </span>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 space-y-4">
        <h3 className="text-lg font-semibold text-white">{t('nav.feeds')}</h3>
        <div>
          <label className="block text-sm text-gray-300 mb-1">{t('settings.fetchInterval')}</label>
          <input
            type="number"
            value={interval}
            onChange={e => handleIntervalChange(e.target.value)}
            min={1}
            className="w-32 px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={auto}
              onChange={e => handleAutoAnalyzeChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
          <span className="text-sm text-gray-300">{t('settings.autoAnalyze')}</span>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 space-y-4">
        <h3 className="text-lg font-semibold text-white">{t('settings.language')}</h3>
        <div className="flex gap-3">
          <button
            onClick={() => handleLanguageChange('zh')}
            className={`px-4 py-2 rounded-md transition-colors ${
              i18n.language === 'zh'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {t('settings.chinese')}
          </button>
          <button
            onClick={() => handleLanguageChange('en')}
            className={`px-4 py-2 rounded-md transition-colors ${
              i18n.language === 'en'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {t('settings.english')}
          </button>
        </div>
      </div>
    </div>
  )
}
