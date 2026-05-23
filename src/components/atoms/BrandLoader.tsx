import { FC } from 'react'

interface BrandLoaderProps {
  /** Cover the viewport with a translucent overlay (page / route loading). */
  fullScreen?: boolean
  /** Optional caption shown under the wordmark. */
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE: Record<NonNullable<BrandLoaderProps['size']>, string> = {
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-4xl',
}

/**
 * Branded loading animation built from the NyayaX wordmark: the accent "X"
 * pulses and an indeterminate brand-gradient bar sweeps underneath. Use this
 * instead of a generic spinner for page / section loading states.
 *
 * Pure CSS keyframes (inline <style>, deduped by the browser via the keyframe
 * name) — no animation deps. Honours `prefers-reduced-motion`.
 */
const BrandLoader: FC<BrandLoaderProps> = ({ fullScreen = false, label, size = 'md', className }) => {
  const core = (
    <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
      <div className={`inline-flex items-center font-bold tracking-tight ${SIZE[size]}`}>
        <span className="text-primary">Nyaya</span>
        <span className="nyx-load-x ml-px text-amber-500">X</span>
      </div>
      <div className="nyx-load-track">
        <span className="nyx-load-seg" />
      </div>
      {label && <span className="text-xs font-medium text-gray-500">{label}</span>}
      <span className="sr-only">Loading…</span>
      <style>{`
        @keyframes nyx-load-x { 0%,100%{transform:scale(1) rotate(0)} 50%{transform:scale(1.22) rotate(10deg)} }
        @keyframes nyx-load-seg { 0%{left:-45%;width:45%} 50%{width:60%} 100%{left:100%;width:45%} }
        .nyx-load-x { display:inline-block; transform-origin:50% 60%; animation:nyx-load-x 900ms ease-in-out infinite; }
        .nyx-load-track { position:relative; width:8.5rem; height:4px; border-radius:9999px; background:rgba(99,102,241,0.12); overflow:hidden; }
        .nyx-load-seg { position:absolute; top:0; bottom:0; left:-45%; border-radius:9999px; background:linear-gradient(90deg,#6366f1,#f59e0b); animation:nyx-load-seg 1100ms cubic-bezier(0.4,0,0.2,1) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .nyx-load-x { animation:none }
          .nyx-load-seg { animation:none; left:0; width:100%; opacity:0.6 }
        }
      `}</style>
    </div>
  )

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-white/75 backdrop-blur-sm ${className ?? ''}`}>
        {core}
      </div>
    )
  }
  return <div className={`flex items-center justify-center py-10 ${className ?? ''}`}>{core}</div>
}

export default BrandLoader
