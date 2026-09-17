'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { Task } from '@/lib/observability/types'

interface TaskInspectorProps {
  task: Task | null
  onClose: () => void
}

const TRACE_LINES = [
  { ts: '00:00.000', msg: 'W-BETA accepted lease · ambulance.dispatch', tone: 'text-neutral-400' },
  { ts: '00:12.400', msg: 'W-BETA HEARTBEAT LATE (12s since last ack)', tone: 'text-amber-300' },
  { ts: '00:20.010', msg: 'W-BETA KERNEL PANIC → FATAL_OOM', tone: 'text-rose-400 font-bold' },
  { ts: '00:20.045', msg: 'W-BETA HEARTBEAT LOST', tone: 'text-rose-400 font-bold' },
  { ts: '00:20.220', msg: 'W-BETA MARKED DEAD — draining leases', tone: 'text-rose-300' },
  { ts: '00:30.000', msg: 'LEASE EXPIRED → task routed to DEAD LETTER', tone: 'text-rose-400 font-bold' },
]

function buildPayload(task: Task): string {
  return JSON.stringify(
    {
      task_id: task.id,
      job_type: 'ambulance_dispatch',
      priority: 'critical',
      attempts: 5,
      max_retries: 5,
      lease_node: task.node,
      coords: { x: 40.7128, y: -74.006 },
      dispatch: { unit: 'MED-14', eta_seconds: 240 },
      created_at: '2026-09-18T14:22:01.004Z',
    },
    null,
    2,
  )
}

export function TaskInspector({ task, onClose }: TaskInspectorProps) {
  return (
    <AnimatePresence>
      {task ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Dimmed, heavily-blurred backdrop over the whole dashboard */}
          <motion.button
            type="button"
            aria-label="Close inspector"
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
            style={{ backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }}
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            transition={{ duration: 0.4 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Inspector for ${task.id}`}
            variants={{
              hidden: { opacity: 0, y: 60, scale: 0.97 },
              visible: { opacity: 1, y: 0, scale: 1 },
            }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-2xl shadow-[0_40px_120px_-30px_rgba(0,0,0,0.95)]"
          >
            <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-rose-500/25 blur-[120px]" />

            <div className="relative flex items-start justify-between gap-4 border-b border-white/10 p-6">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Inspector: <span className="font-mono text-rose-300">{task.id}</span>
                </h2>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-rose-300 animate-text-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_10px_#f43f5e]" />
                  Status: FATAL_OOM
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-neutral-300 transition-colors hover:bg-white/10"
              >
                Esc
              </button>
            </div>

            <div className="relative grid gap-5 p-6 sm:grid-cols-2">
              <div>
                <h3 className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-neutral-500">
                  Payload (JSON)
                </h3>
                <pre className="glass-scroll mt-2 max-h-60 overflow-auto rounded-2xl border border-white/5 bg-black/50 p-4 font-mono text-[0.68rem] leading-relaxed text-cyan-200/90 shadow-inner">
                  {buildPayload(task)}
                </pre>
              </div>

              <div>
                <h3 className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-neutral-500">
                  System Trace
                </h3>
                <div className="glass-scroll mt-2 max-h-60 space-y-1.5 overflow-auto rounded-2xl border border-white/5 bg-black/40 p-4 font-mono text-[0.68rem]">
                  {TRACE_LINES.map((line) => (
                    <div key={line.ts} className="flex gap-2">
                      <span className="shrink-0 text-neutral-600">{line.ts}</span>
                      <span className={line.tone}>{line.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-4 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-neutral-500">
              <span>
                node <span className="text-rose-400">{task.node}</span> · latency{' '}
                <span className="text-neutral-300">{(task.latencyMs / 1000).toFixed(1)}s</span>
              </span>
              <span className="text-rose-400">reassignment blocked · manual review required</span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
