import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TerminalLayout } from './components/TerminalLayout'
import { useSettingsStore } from './stores/settingsStore'

function App() {
  const { i18n } = useTranslation()
  const { loadSettings, language, theme } = useSettingsStore()

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    if (language) {
      i18n.changeLanguage(language)
    }
  }, [language, i18n])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.title = i18n.language === 'zh' ? '市场跟踪大师' : 'MarketTracker'
  }, [i18n.language])

  return <TerminalLayout />
}

export default App
