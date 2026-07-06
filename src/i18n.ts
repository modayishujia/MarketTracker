import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: {
        app: {
          title: 'Financial RSS Analyzer'
        }
      }
    },
    zh: {
      translation: {
        app: {
          title: '财经RSS分析器'
        }
      }
    }
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
})

export default i18n
