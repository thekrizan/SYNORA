'use client'

import { useEffect } from 'react'
import { useDashboard } from '@/hooks/use-dashboard'
import { EventFeed } from '@/components/observability/event-feed'
import { QueueVelocity } from '@/components/observability/queue-velocity'
import { TaskInspector } from '@/components/observability/task-inspector'
import { TaskStream } from '@/components/observability/task-stream'
import { TopNav } from '@/components/observability/top-nav'
import { WorkerGrid } from '@/components/observability/worker-grid'

export default function Page() {
  const {
    isDemoMode,
    toggleDemo,
    workers,
    tasks,
    events,
    velocity,
    selectedTask,
    selectTask,
    clearSelection,
  } = useDashboard()

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
        <TopNav isDemoMode={isDemoMode} onToggleDemo={toggleDemo} />

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

      <TaskInspector task={selectedTask} onClose={clearSelection} />
    </main>
  )
}
