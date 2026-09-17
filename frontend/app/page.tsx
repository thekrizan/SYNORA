'use client'

import { useEffect, useState } from 'react'
import { useDashboard } from '@/hooks/use-dashboard'
import { EventFeed } from '@/components/observability/event-feed'
import { QueueVelocity } from '@/components/observability/queue-velocity'
import { TaskInspector } from '@/components/observability/task-inspector'
import { TaskStream } from '@/components/observability/task-stream'
import { TopNav } from '@/components/observability/top-nav'
import { WorkerGrid } from '@/components/observability/worker-grid'

export default function Page() {
  const {
    workers,
    tasks,
    events,
    velocity,
    selectedTask,
    selectTask,
    clearSelection,
    stats, loading, error, createTask, reprocessTask, apiUrl,
  } = useDashboard()
  const [type, setType] = useState('demo')
  const [maxAttempts, setMaxAttempts] = useState('3')
  const [scheduledFor, setScheduledFor] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearSelection()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clearSelection])

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#030305] text-white">
      {/* Ambient spatial gradients in the pitch-dark void */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-48 h-[42rem] w-[42rem] rounded-full bg-[#4F46E5] opacity-30 blur-[220px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-56 -right-40 h-[44rem] w-[44rem] rounded-full bg-[#EC4899] opacity-25 blur-[220px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:64px_64px]"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <TopNav apiUrl={apiUrl} online={stats.workers_online} />

        <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl">
          <form className="flex flex-wrap items-end gap-3" onSubmit={async (event) => { event.preventDefault(); setSubmitting(true); setSubmitMessage(''); try { await createTask({ type, payload: { source: 'dashboard' }, max_attempts: Number(maxAttempts), ...(scheduledFor ? { scheduled_for: new Date(scheduledFor).toISOString() } : {}) }); setSubmitMessage('Task submitted'); setScheduledFor('') } catch (cause) { setSubmitMessage(cause instanceof Error ? cause.message : 'Submit failed') } finally { setSubmitting(false) } }}>
            <label className="font-mono text-[0.65rem] uppercase tracking-widest text-neutral-500">Task type<select value={type} onChange={(event) => setType(event.target.value)} className="mt-1 block rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"><option>demo</option><option>slow-demo</option><option>fail-demo</option></select></label>
            <label className="font-mono text-[0.65rem] uppercase tracking-widest text-neutral-500">Max attempts<input value={maxAttempts} onChange={(event) => setMaxAttempts(event.target.value)} type="number" min="1" max="20" className="mt-1 block w-24 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" /></label>
            <label className="font-mono text-[0.65rem] uppercase tracking-widest text-neutral-500">Schedule (optional)<input value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} type="datetime-local" className="mt-1 block rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" /></label>
            <button disabled={submitting} className="rounded-xl bg-cyan-400 px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit task'}</button>
            {submitMessage ? <span className="font-mono text-xs text-neutral-400">{submitMessage}</span> : null}
          </form>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">{[['queued', stats.queued], ['processing', stats.processing], ['completed', stats.completed], ['failed', stats.failed], ['dlq', stats.dlq], ['scheduled', stats.scheduled], ['online', stats.workers_online], ['offline', stats.workers_offline]].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2"><div className="font-mono text-[0.58rem] uppercase tracking-widest text-neutral-500">{label}</div><div className="mt-1 font-mono text-xl text-white">{value}</div></div>)}</div>
        {error ? <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 font-mono text-xs text-rose-300">{error} · retrying automatically</div> : null}
        {loading && !tasks.length ? <div className="mt-4 font-mono text-xs text-neutral-500">Connecting to backend…</div> : null}

        <div className="mt-4 flex flex-col gap-4 lg:mt-6 lg:flex-row">
          <div className="flex flex-1 flex-col gap-4">
            <div className="h-72 shrink-0">
              <QueueVelocity data={velocity} delay={0.1} />
            </div>
            <WorkerGrid workers={workers} delay={0.2} />
            <TaskStream tasks={tasks} onSelect={selectTask} delay={0.3} />
          </div>

          <div className="lg:w-[350px] lg:shrink-0">
            <EventFeed events={events} delay={0.15} />
          </div>
        </div>
      </div>

      <TaskInspector task={selectedTask} onClose={clearSelection} onReprocess={reprocessTask} />
    </main>
  )
}
