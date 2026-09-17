'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassPanelProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function GlassPanel({ children, className, delay = 0 }: GlassPanelProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative overflow-hidden rounded-3xl border border-white/10',
        'bg-white/[0.035] backdrop-blur-2xl',
        'shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]',
        // faint top sheen so the glass reads as a physical surface
        'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px',
        'before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent',
        className,
      )}
    >
      {children}
    </motion.section>
  )
}

interface PanelHeadingProps {
  label: string
  hint?: ReactNode
  accent?: string
}

export function PanelHeading({ label, hint, accent = '#22D3EE' }: PanelHeadingProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: accent, boxShadow: `0 0 10px ${accent}` }}
          aria-hidden
        />
        <h2 className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.22em] text-neutral-300">
          {label}
        </h2>
      </div>
      {hint ? <div className="text-[0.65rem] text-neutral-500">{hint}</div> : null}
    </div>
  )
}
