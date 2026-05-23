import { FC } from 'react'
import { useIsFetching, useIsMutating } from '@tanstack/react-query'

/**
 * Global "the site is doing something" animation.
 *
 * Shows whenever react-query has any in-flight query OR mutation — i.e. *any*
 * type of data processing anywhere in the app (page loads, form submits,
 * payments, refetches, …). Renders two NON-blocking, pointer-events-none
 * pieces so it never gets in the user's way:
 *   1. A thin brand-gradient indeterminate bar pinned to the very top.
 *   2. A floating pill (bottom-right) with the animated NyayaX wordmark.
 *
 * Both fade out automatically when activity settles. Honours
 * `prefers-reduced-motion`. Must be mounted inside the QueryClientProvider.
 */
const GlobalProcessingIndicator: FC = () => {
  const fetching = useIsFetching()
  const mutating = useIsMutating()
  const active = fetching + mutating > 0

  return (
    <>
      {/* (1) Top progress bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-[200] h-[3px] pointer-events-none transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      >
        <div className="nyx-topbar h-full w-full overflow-hidden">
          <span className="nyx-topbar-seg" />
        </div>
      </div>

      {/* (2) Floating brand pill */}
      <div
        className={`fixed bottom-4 right-4 z-[200] pointer-events-none transition-all duration-300 ${active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 rounded-full bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur px-3 py-1.5">
          <span className="text-sm font-bold tracking-tight leading-none">
            <span className="text-primary">Nyaya</span>
            <span className="nyx-pill-x text-amber-500">X</span>
          </span>
          <span className="text-[11px] font-medium text-gray-500">Processing…</span>
        </div>
      </div>

      <style>{`
        @keyframes nyx-topbar-seg { 0%{left:-40%;width:40%} 50%{width:55%} 100%{left:100%;width:40%} }
        .nyx-topbar { position:relative; background:rgba(99,102,241,0.12); }
        .nyx-topbar-seg {
          position:absolute; top:0; bottom:0; left:-40%;
          background:linear-gradient(90deg,#6366f1,#f59e0b);
          animation:nyx-topbar-seg 1100ms cubic-bezier(0.4,0,0.2,1) infinite;
        }
        @keyframes nyx-pill-x { 0%,100%{transform:scale(1) rotate(0)} 50%{transform:scale(1.25) rotate(12deg)} }
        .nyx-pill-x { display:inline-block; transform-origin:50% 60%; animation:nyx-pill-x 900ms ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .nyx-topbar-seg { animation:none; left:0; width:100%; opacity:0.5 }
          .nyx-pill-x { animation:none }
        }
      `}</style>
    </>
  )
}

export default GlobalProcessingIndicator
