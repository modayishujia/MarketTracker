import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Layout } from './components/Layout'
import { ArticleListPage } from './pages/ArticleListPage'
import { ArticleDetailPage } from './pages/ArticleDetailPage'
import { DashboardPage } from './pages/DashboardPage'
import { TrendingPage } from './pages/TrendingPage'
import { SettingsPage } from './pages/SettingsPage'
import { useSettingsStore } from './stores/settingsStore'

function App() {
  const { i18n } = useTranslation()
  const [currentPage, setCurrentPage] = useState('sources')
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null)
  const { loadSettings, language } = useSettingsStore()

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    if (language) {
      i18n.changeLanguage(language)
    }
  }, [language, i18n])

  const handleArticleSelect = (articleId: number) => {
    setSelectedArticleId(articleId)
  }

  const handleBackToList = () => {
    setSelectedArticleId(null)
  }

  const renderPage = () => {
    if (currentPage === 'sources' && selectedArticleId !== null) {
      return (
        <ArticleDetailPage
          articleId={selectedArticleId}
          onBack={handleBackToList}
        />
      )
    }

    switch (currentPage) {
      case 'sources':
        return <ArticleListPage onArticleSelect={handleArticleSelect} />
      case 'sentiment':
        return <DashboardPage />
      case 'trending':
        return <TrendingPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <ArticleListPage onArticleSelect={handleArticleSelect} />
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={(page) => { setCurrentPage(page); setSelectedArticleId(null) }}>
      {renderPage()}
    </Layout>
  )
}

export default App
