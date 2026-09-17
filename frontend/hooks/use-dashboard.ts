'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LogEvent, Stats, Task, VelocityPoint, Worker } from '@/lib/observability/types'

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '')
const emptyStats: Stats = { queued: 0, scheduled: 0, processing: 0, completed: 0, failed: 0, dlq: 0, workers_online: 0, workers_offline: 0 }
const stamp = (value: string | null | undefined) => value ? new Date(value).toLocaleTimeString([], { hour12: false }) : '--:--:--'
function eventForTask(task: Task): LogEvent { return { id: `task-${task.id}-${task.updated_at}`, ts: stamp(task.updated_at), source: task.assigned_worker_id?.slice(0, 8) || 'SCHED', message: `${task.id.slice(0, 8)} ${task.type} → ${task.status}${task.last_error ? ` · ${task.last_error}` : ''}`, level: task.status === 'dlq' || task.status === 'failed' ? 'error' : 'info', critical: task.status === 'dlq' } }

export function useDashboard() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<Stats>(emptyStats)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [velocity, setVelocity] = useState<VelocityPoint[]>([])
  const tick = useRef(0)
  const fetchJson = useCallback(async (path: string, init?: RequestInit) => { const response = await fetch(`${API_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, cache: 'no-store' }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || `API request failed (${response.status})`); return body }, [])
  const refresh = useCallback(async (quiet = false) => { try { if (!quiet) setLoading(true); const [workerData, taskData, statsData] = await Promise.all([fetchJson('/workers'), fetchJson('/tasks'), fetchJson('/stats')]); setWorkers(workerData.workers); setTasks(taskData.tasks); setStats(statsData); setVelocity((previous) => [...previous.slice(-39), { t: tick.current++, tps: statsData.completed + statsData.processing }]); setError(null) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Backend unavailable') } finally { setLoading(false) } }, [fetchJson])
  useEffect(() => { void refresh(); const timer = setInterval(() => void refresh(true), 2000); return () => clearInterval(timer) }, [refresh])
  const selectTask = useCallback(async (id: string) => { try { const data = await fetchJson(`/tasks/${id}`); setSelectedTask(data.task) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load task') } }, [fetchJson])
  const createTask = useCallback(async (input: { type: string; payload: Record<string, unknown>; scheduled_for?: string; max_attempts?: number }) => { await fetchJson('/tasks', { method: 'POST', body: JSON.stringify(input) }); await refresh(true) }, [fetchJson, refresh])
  const reprocessTask = useCallback(async (id: string) => { await fetchJson(`/tasks/${id}/reprocess`, { method: 'POST' }); await refresh(true); await selectTask(id) }, [fetchJson, refresh, selectTask])
  return { workers, tasks, stats, events: useMemo(() => tasks.slice(0, 30).map(eventForTask), [tasks]), velocity, selectedTask, selectTask, clearSelection: () => setSelectedTask(null), createTask, reprocessTask, loading, error, refresh, apiUrl: API_URL }
}
