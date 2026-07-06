import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TerminalLayout } from './components/TerminalLayout'
import { useSettingsStore } from './stores/settingsStore'

function App() {
  const { i18n } = useTranslation()
  const { loadSettings, language } = useSettingsStore()

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    if (language) {
      i18n.changeLanguage(language)
    }
  }, [language, i18n])

  return <TerminalLayout />
}

export default App
