'use client'

import { motion } from 'framer-motion'

interface TopNavProps {
  isDemoMode: boolean
  onToggleDemo: () => void
}

export function TopNav({ isDemoMode, onToggleDemo }: TopNavProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -18, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 backdrop-blur-2xl shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]"
    >
      <div className="flex items-center gap-3">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-indigo-500/70 to-fuchsia-500/60 shadow-[0_0_20px_rgba(99,102,241,0.55)]">
          <span className="h-2 w-2 rounded-sm bg-white/90" aria-hidden />
        </div>
        <div className="text-sm font-semibold tracking-tight text-white">
          SYNORA <span className="font-light text-neutral-500">SPATIAL</span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.18em] text-emerald-300">
            Live
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[0.65rem] uppercase tracking-[0.18em] text-neutral-400 sm:inline">
            Demo Mode
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isDemoMode}
            aria-label="Toggle demo simulation"
            onClick={onToggleDemo}
            className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-300 ${
              isDemoMode
                ? 'border-fuchsia-400/40 bg-gradient-to-r from-indigo-500/60 to-fuchsia-500/70 shadow-[0_0_18px_rgba(236,72,153,0.5)]'
                : 'border-white/15 bg-white/5'
            }`}
          >
            <motion.span
              layout
              transition={{ type: 'spring', stiffness: 520, damping: 34 }}
              className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-md"
              style={{ left: isDemoMode ? 'calc(100% - 1.5rem)' : '0.25rem' }}
            />
          </button>
        </div>
      </div>
    </motion.header>
  )
}
