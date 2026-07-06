import { useTranslation } from 'react-i18next'

export function LanguageSwitch() {
  const { i18n } = useTranslation()
  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh'
    i18n.changeLanguage(newLang)
  }
  return (
    <button onClick={toggleLanguage} className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300">
      {i18n.language === 'zh' ? 'English' : '中文'}
    </button>
  )
}
