'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  LogEvent,
  Task,
  VelocityPoint,
  Worker,
} from '@/lib/observability/types'

const DEAD_TASK_ID = 'TSK-092'

function stamp(offsetSec = 0): string {
  const d = new Date(Date.now() + offsetSec * 1000)
  return d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

let logSeq = 0
function makeLog(
  source: string,
  message: string,
  level: LogEvent['level'],
  critical = false,
  fixedTs?: string,
): LogEvent {
  logSeq += 1
  return {
    id: `log-${logSeq}`,
    ts: fixedTs ?? stamp(),
    source,
    message,
    level,
    critical,
  }
}

/* ── Baseline (steady crashed) state — shown when demo mode is OFF ── */

const BASELINE_WORKERS: Worker[] = [
  { id: 'W-ALPHA', status: 'ONLINE', load: 45, region: 'us-east-1' },
  { id: 'W-BETA', status: 'OFFLINE', load: 100, region: 'us-west-2' },
  { id: 'W-GAMMA', status: 'ONLINE', load: 12, region: 'eu-central-1' },
]

const BASELINE_TASKS: Task[] = [
  { id: 'TSK-088', name: 'index.rebuild', status: 'COMPLETED', node: 'W-ALPHA', latencyMs: 412, ts: '14:21:19.004' },
  { id: 'TSK-089', name: 'billing.reconcile', status: 'COMPLETED', node: 'W-GAMMA', latencyMs: 890, ts: '14:21:25.180' },
  { id: 'TSK-090', name: 'media.transcode', status: 'RUNNING', node: 'W-ALPHA', latencyMs: 1240, ts: '14:21:37.402' },
  { id: 'TSK-091', name: 'geo.reindex', status: 'RETRYING', node: 'W-GAMMA', latencyMs: 2010, ts: '14:21:43.900' },
  { id: 'TSK-092', name: 'ambulance.dispatch', status: 'DEAD_LETTER', node: 'W-BETA', latencyMs: 30000, ts: '14:21:49.061' },
  { id: 'TSK-093', name: 'notify.push', status: 'QUEUED', node: 'W-ALPHA', latencyMs: 0, ts: '14:21:55.220' },
]

const BASELINE_EVENTS: LogEvent[] = [
  makeLog('SCHED', 'scheduler tick — lease table synced', 'info', false, '14:21:31.000'),
  makeLog('W-ALPHA', 'accepted lease TSK-090 (media.transcode)', 'info', false, '14:21:37.402'),
  makeLog('W-GAMMA', 'retry scheduled for TSK-091 attempt 2/5', 'warn', false, '14:21:43.900'),
  makeLog('W-BETA', 'HEARTBEAT LOST — last ack 30s ago', 'error', true, '14:21:47.010'),
  makeLog('W-BETA', 'MARKED DEAD — draining leases', 'error', true, '14:21:48.220'),
  makeLog('SCHED', `${DEAD_TASK_ID} LEASE EXPIRED on W-BETA → DEAD LETTER`, 'error', true, '14:21:49.061'),
]

const TASK_NAMES = [
  'notify.push',
  'media.transcode',
  'geo.reindex',
  'billing.reconcile',
  'index.rebuild',
  'cache.warm',
  'report.export',
  'webhook.fanout',
]

// Deterministic seed so the server and client render identical initial markup
// (no Math.random / Date.now during the first paint → no hydration mismatch).
// A pseudo-random but stable jitter keeps the line organic without being random.
function seedVelocity(): VelocityPoint[] {
  const points: VelocityPoint[] = []
  for (let i = 0; i < 40; i += 1) {
    const base = 74 + Math.sin(i / 3) * 16
    const jitter = Math.sin(i * 12.9898) * 5
    points.push({ t: i, tps: Math.round(base + jitter) })
  }
  return points
}

export function useDashboard() {
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [workers, setWorkers] = useState<Worker[]>(BASELINE_WORKERS)
  const [tasks, setTasks] = useState<Task[]>(BASELINE_TASKS)
  const [events, setEvents] = useState<LogEvent[]>(BASELINE_EVENTS)
  const [velocity, setVelocity] = useState<VelocityPoint[]>(seedVelocity)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const taskCounter = useRef(93)
  const velocityTick = useRef(40)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const intervals = useRef<ReturnType<typeof setInterval>[]>([])

  const clearSchedule = useCallback(() => {
    timers.current.forEach(clearTimeout)
    intervals.current.forEach(clearInterval)
    timers.current = []
    intervals.current = []
  }, [])

  /* Ambient velocity chart — always animating for a "live" feel. */
  useEffect(() => {
    const id = setInterval(() => {
      setVelocity((prev) => {
        const i = velocityTick.current
        velocityTick.current += 1
        const spike = isDemoMode ? Math.sin(i / 2) * 22 : 0
        const base = 72 + Math.sin(i / 3) * 16 + spike
        const next = { t: i, tps: Math.max(38, Math.round(base + (Math.random() - 0.5) * 12)) }
        return [...prev.slice(-39), next]
      })
    }, 1400)
    return () => clearInterval(id)
  }, [isDemoMode])

  const pushEvent = useCallback((event: LogEvent) => {
    setEvents((prev) => [...prev.slice(-120), event])
  }, [])

  const addRandomTask = useCallback(() => {
    taskCounter.current += 1
    const node: Worker['id'] = Math.random() > 0.5 ? 'W-ALPHA' : 'W-GAMMA'
    const name = TASK_NAMES[Math.floor(Math.random() * TASK_NAMES.length)]
    const id = `TSK-${taskCounter.current.toString().padStart(3, '0')}`
    const task: Task = {
      id,
      name,
      status: 'QUEUED',
      node,
      latencyMs: 0,
      ts: stamp(),
    }
    setTasks((prev) => [...prev.slice(-40), task])
    pushEvent(makeLog(node, `enqueued ${id} (${name})`, 'info'))

    // Let it progress to RUNNING then COMPLETE for a lively stream.
    timers.current.push(
      setTimeout(() => {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, status: 'RUNNING', latencyMs: 200 + Math.round(Math.random() * 900) } : t,
          ),
        )
      }, 1600),
    )
    timers.current.push(
      setTimeout(() => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'COMPLETED' } : t)))
      }, 4200),
    )
  }, [pushEvent])

  const startDemo = useCallback(() => {
    clearSchedule()

    // Reset to a healthy, pre-crash world.
    setWorkers([
      { id: 'W-ALPHA', status: 'ONLINE', load: 38, region: 'us-east-1' },
      { id: 'W-BETA', status: 'ONLINE', load: 64, region: 'us-west-2' },
      { id: 'W-GAMMA', status: 'ONLINE', load: 12, region: 'eu-central-1' },
    ])
    taskCounter.current = 91
    setTasks([
      { id: 'TSK-090', name: 'media.transcode', status: 'RUNNING', node: 'W-ALPHA', latencyMs: 640, ts: stamp() },
      { id: 'TSK-091', name: 'geo.reindex', status: 'RUNNING', node: 'W-GAMMA', latencyMs: 980, ts: stamp() },
      { id: 'TSK-092', name: 'ambulance.dispatch', status: 'RUNNING', node: 'W-BETA', latencyMs: 1200, ts: stamp() },
    ])
    setEvents([
      makeLog('SCHED', 'DEMO scenario armed — "silent crash" replay', 'info'),
      makeLog('W-BETA', 'accepted lease TSK-092 (ambulance.dispatch)', 'info'),
      makeLog('W-BETA', 'heartbeat OK — load 64%', 'info'),
    ])
    setSelectedTaskId(null)

    // Every 5s a new task enters the stream.
    intervals.current.push(setInterval(addRandomTask, 5000))
    timers.current.push(setTimeout(addRandomTask, 900))

    // Gentle load creep on W-BETA before the panic.
    timers.current.push(
      setTimeout(() => {
        setWorkers((prev) => prev.map((w) => (w.id === 'W-BETA' ? { ...w, load: 88 } : w)))
        pushEvent(makeLog('W-BETA', 'load climbing → 88% (GC pressure)', 'warn'))
      }, 9000),
    )
    timers.current.push(
      setTimeout(() => {
        pushEvent(makeLog('W-BETA', 'HEARTBEAT LATE — 12s since last ack', 'warn', false))
      }, 15000),
    )

    // T+20s — the silent crash.
    timers.current.push(
      setTimeout(() => {
        setWorkers((prev) =>
          prev.map((w) => (w.id === 'W-BETA' ? { ...w, status: 'OFFLINE', load: 100 } : w)),
        )
        setTasks((prev) =>
          prev.map((t) =>
            t.id === DEAD_TASK_ID
              ? { ...t, status: 'DEAD_LETTER', latencyMs: 30000 }
              : t,
          ),
        )
        pushEvent(makeLog('W-BETA', '[ERR] W-BETA KERNEL PANIC — FATAL_OOM', 'error', true))
        pushEvent(makeLog('W-BETA', 'HEARTBEAT LOST — marking node dead', 'error', true))
        pushEvent(makeLog('SCHED', `${DEAD_TASK_ID} LEASE EXPIRED → DEAD LETTER`, 'error', true))
        setSelectedTaskId(DEAD_TASK_ID)
      }, 20000),
    )
    timers.current.push(
      setTimeout(() => {
        pushEvent(makeLog('SCHED', `reassign ${DEAD_TASK_ID} blocked — payload flagged CRITICAL`, 'error', true))
      }, 22000),
    )
  }, [addRandomTask, clearSchedule, pushEvent])

  const stopDemo = useCallback(() => {
    clearSchedule()
    setWorkers(BASELINE_WORKERS)
    setTasks(BASELINE_TASKS)
    setEvents(BASELINE_EVENTS)
    setSelectedTaskId(null)
  }, [clearSchedule])

  const toggleDemo = useCallback(() => {
    setIsDemoMode((prev) => {
      const next = !prev
      if (next) startDemo()
      else stopDemo()
      return next
    })
  }, [startDemo, stopDemo])

  useEffect(() => () => clearSchedule(), [clearSchedule])

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  )

  return {
    isDemoMode,
    toggleDemo,
    workers,
    tasks,
    events,
    velocity,
    selectedTask,
    selectTask: setSelectedTaskId,
    clearSelection: () => setSelectedTaskId(null),
  }
}
