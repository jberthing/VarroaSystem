// Mock i18next for tests
export default {
  use: () => ({
    use: () => ({
      init: () => Promise.resolve()
    })
  }),
  t: (key: string) => key,
  changeLanguage: () => Promise.resolve(),
  language: 'da'
}

export const useTranslation = () => ({
  t: (key: string) => key,
  i18n: {
    changeLanguage: () => Promise.resolve(),
    language: 'da'
  }
})

export const initReactI18next = {
  type: '3rdParty',
  init: () => {}
}
