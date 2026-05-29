import { FC, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { Globe, Check, Search } from 'lucide-react'
import { LANGUAGES, languageByCode } from '@/i18n/languages'
import { loadCatalog } from '@/i18n'

/**
 * App language switcher. The button shows the CURRENT language in its own
 * script (English / हिंदी / ଓଡ଼ିଆ …). Hover shows "Change the app language here".
 * Click opens the full list of offered languages; picking one switches the app
 * (persisted to localStorage; untranslated strings fall back to English).
 */
const LanguageSwitcher: FC = () => {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Loading a not-yet-fetched catalog runs as a react-query mutation, so the
  // platform-wide processing animation (driven by useIsMutating) shows ONLY
  // while the chunk is actually downloading. Already-cached languages skip it
  // entirely → instant switch, no animation.
  const loadMutation = useMutation({ mutationFn: (code: string) => loadCatalog(code) })

  const current = languageByCode(i18n.language) || LANGUAGES[0]

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const choose = async (code: string) => {
    setOpen(false)
    setQuery('')
    const base = code.split('-')[0]
    // Only show the processing animation when the catalog genuinely needs
    // loading (first pick of a language). English + already-loaded languages
    // switch instantly with no animation.
    const needsLoad = base !== 'en' && !i18n.hasResourceBundle(base, 'translation')
    if (needsLoad) {
      try {
        await loadMutation.mutateAsync(code)
      } catch {
        /* fall through — i18n will use the English fallback */
      }
    }
    await i18n.changeLanguage(code)
  }

  const filtered = query
    ? LANGUAGES.filter(
        (l) =>
          l.native.toLowerCase().includes(query.toLowerCase()) ||
          l.english.toLowerCase().includes(query.toLowerCase()),
      )
    : LANGUAGES

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={t('language.change')}
        aria-label={t('language.change')}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <Globe className="w-4 h-4" />
        <span className="max-w-[7rem] truncate">{current.native}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-200 rounded-xl shadow-lg z-[1000] overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('language.select')}
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {filtered.map((l) => {
              const active = l.code === current.code
              return (
                <li key={l.code}>
                  <button
                    onClick={() => { void choose(l.code) }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 ${active ? 'bg-primary/5' : ''}`}
                    dir={l.rtl ? 'rtl' : 'ltr'}
                  >
                    <span className="flex flex-col">
                      <span className="text-sm text-gray-900">{l.native}</span>
                      <span className="text-[11px] text-gray-400">{l.english}</span>
                    </span>
                    {active && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                  </button>
                </li>
              )
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-sm text-gray-400 text-center">No match</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export default LanguageSwitcher
