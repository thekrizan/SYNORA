'use client'

import { useEffect, useRef } from 'react'
import type { LogEvent } from '@/lib/observability/types'
import { GlassPanel, PanelHeading } from './glass-panel'

interface EventFeedProps {
  events: LogEvent[]
  delay?: number
}

function levelColor(event: LogEvent): string {
  if (event.critical) return 'text-rose-400 font-bold'
  if (event.level === 'error') return 'text-rose-300'
  if (event.level === 'warn') return 'text-amber-300'
  return 'text-neutral-400'
}

export function EventFeed({ events, delay = 0 }: EventFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [events])

  return (
    <GlassPanel delay={delay} className="flex h-full flex-col p-5">
      <PanelHeading
        label="Real-Time Log Feed [W-02_ERROR]"
        accent="#F43F5E"
        hint={<span className="font-mono">{events.length} lines</span>}
      />

      <div
        ref={scrollRef}
        className="glass-scroll mt-4 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/5 bg-black/30 p-3 font-mono text-[0.7rem] leading-relaxed"
      >
        {events.map((event) => (
          <div
            key={event.id}
            className={`flex gap-2 whitespace-pre-wrap py-0.5 ${
              event.critical ? 'rounded bg-rose-500/10 px-1' : ''
            }`}
          >
            <span className="shrink-0 text-neutral-600">{event.ts}</span>
            <span className="shrink-0 text-neutral-500">{event.source.padEnd(7)}</span>
            <span className={levelColor(event)}>{event.message}</span>
          </div>
        ))}
        <div className="mt-1 flex items-center gap-1 text-neutral-600">
          <span className="text-emerald-400">{'\u276F'}</span>
          <span className="inline-block h-3 w-1.5 animate-text-pulse bg-emerald-400/70" />
        </div>
      </div>
    </GlassPanel>
  )
}
