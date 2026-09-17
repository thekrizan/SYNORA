'use client'

import { motion } from 'framer-motion'

interface TopNavProps {
  apiUrl?: string
  online?: number
}

export function TopNav({ apiUrl, online = 0 }: TopNavProps) {
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
          <span className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.12em] text-emerald-300">
            {online} online
          </span>
        </div>
        <span className="hidden font-mono text-[0.6rem] text-neutral-500 sm:inline">{apiUrl}</span>
      </div>
    </motion.header>
  )
}
