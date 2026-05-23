import { useEffect, useState } from 'react'

/**
 * Subscribe to a CSS media query and re-render when it changes.
 * SSR-safe (returns false when `window`/`matchMedia` is unavailable) and
 * falls back to the legacy `addListener` API for older Safari.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    if (mql.addEventListener) mql.addEventListener('change', onChange)
    else mql.addListener(onChange)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange)
      else mql.removeListener(onChange)
    }
  }, [query])

  return matches
}

/**
 * True on phone-sized viewports (< 768px), matching Tailwind's `md` breakpoint.
 * Use to drive off-canvas mobile drawers and other "is this a small screen?"
 * UI decisions that CSS alone can't express.
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}
