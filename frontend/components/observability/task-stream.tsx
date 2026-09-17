'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { Task, TaskStatus } from '@/lib/observability/types'
import { GlassPanel, PanelHeading } from './glass-panel'

interface TaskStreamProps {
  tasks: Task[]
  onSelect: (id: string) => void
  delay?: number
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  scheduled: 'border-violet-400/30 bg-violet-400/10 text-violet-300', queued: 'border-white/15 bg-white/5 text-neutral-300', processing: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300', completed: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300', failed: 'border-amber-400/30 bg-amber-400/10 text-amber-300', dlq: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
}

function StatusPill({ status }: { status: TaskStatus }) {
  const isDead = status === 'dlq'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[0.6rem] font-medium uppercase tracking-[0.12em] ${STATUS_STYLES[status]} ${
        isDead ? 'animate-crimson-pulse' : ''
      }`}
    >
      {isDead ? '\u2620' : null}
      {status.replace('_', ' ')}
    </span>
  )
}

export function TaskStream({ tasks, onSelect, delay = 0 }: TaskStreamProps) {
  const ordered = [...tasks].reverse()

  return (
    <GlassPanel delay={delay} className="flex h-full flex-col p-5">
      <PanelHeading
        label="Execution Stream"
        hint={<span className="font-mono">scrollable · click a row to inspect</span>}
      />

      <div className="mt-3 grid grid-cols-[7rem_1fr_7rem_6rem] gap-2 px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-neutral-500">
        <span>Task ID</span>
        <span>Operation</span>
        <span>Node</span>
        <span className="text-right">Status</span>
      </div>

      <div className="glass-scroll mt-1 max-h-72 min-h-0 flex-1 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {ordered.map((task) => {
            const isDead = task.status === 'dlq'
            return (
              <motion.button
                key={task.id}
                type="button"
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                onClick={() => onSelect(task.id)}
                className={`grid w-full grid-cols-[7rem_1fr_7rem_6rem] items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors duration-200 hover:border-white/10 hover:bg-white/[0.05] ${
                  isDead ? 'bg-rose-500/[0.06]' : ''
                }`}
              >
                <span className={`font-mono text-xs ${isDead ? 'font-semibold text-rose-300' : 'text-neutral-300'}`}>
                  {task.id}
                </span>
                <span className="truncate font-mono text-xs text-neutral-400">
                  {task.type}
                </span>
                <span className={`font-mono text-[0.7rem] ${isDead ? 'text-rose-400' : 'text-neutral-500'}`}>
                  {task.assigned_worker_id?.slice(0, 8) || '—'}
                </span>
                <span className="flex justify-end">
                  <StatusPill status={task.status} />
                </span>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>
    </GlassPanel>
  )
}
