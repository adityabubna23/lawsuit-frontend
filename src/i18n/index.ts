// i18n bootstrap. English is bundled (always available as the fallback); every
// other catalog is lazy-loaded on demand via a Vite glob, so only the active
// language's JSON is ever fetched — 22 languages cost the same as 2.
//
// Per the product rule: a string shows in English IF AND ONLY IF its
// translation is missing (`fallbackLng: 'en'`).

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import { LANGUAGE_CODES, languageByCode } from './languages'

// All catalogs in ./locales as lazy importers (Vite turns these into chunks).
const catalogs = import.meta.glob('./locales/*.json')

export async function loadCatalog(code: string): Promise<void> {
  const base = code.split('-')[0]
  if (base === 'en') return // bundled
  if (i18n.hasResourceBundle(base, 'translation')) return // already loaded
  const path = `./locales/${base}.json`
  const importer = catalogs[path]
  if (!importer) return // no catalog yet → English fallback handles it
  try {
    const mod: any = await importer()
    i18n.addResourceBundle(base, 'translation', mod.default || mod, true, true)
  } catch {
    /* leave it to the English fallback */
  }
}

function applyDirection(code: string) {
  const lang = languageByCode(code)
  const dir = lang?.rtl ? 'rtl' : 'ltr'
  if (typeof document !== 'undefined') {
    document.documentElement.dir = dir
    document.documentElement.lang = lang?.code || 'en'
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en } },
    fallbackLng: 'en',
    supportedLngs: LANGUAGE_CODES,
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'nyayax_lang',
      caches: ['localStorage'],
    },
    react: { useSuspense: false },
  })

// Lazy-load the detected language on boot, then keep direction + catalog in
// sync on every change.
void loadCatalog(i18n.language || 'en').then(() => applyDirection(i18n.language || 'en'))
i18n.on('languageChanged', (lng) => {
  void loadCatalog(lng)
  applyDirection(lng)
})

export default i18n
