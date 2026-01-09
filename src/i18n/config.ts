import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import da from './locales/da.json'
import en from './locales/en.json'
import de from './locales/de.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      da: { translation: da },
      en: { translation: en },
      de: { translation: de }
    },
    fallbackLng: 'da',
    interpolation: {
      escapeValue: false
    }
  })

export default i18n
