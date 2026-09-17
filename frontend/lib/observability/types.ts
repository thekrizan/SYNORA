export type TaskStatus = 'scheduled' | 'queued' | 'processing' | 'completed' | 'failed' | 'dlq'
export type WorkerStatus = 'online' | 'offline'
export interface Execution { id: string; task_id: string; worker_id: string | null; attempt_number: number; status: 'started' | 'succeeded' | 'failed' | 'abandoned'; error: string | null; started_at: string; finished_at: string | null }
export interface Task { id: string; type: string; payload: Record<string, unknown>; status: TaskStatus; scheduled_for: string | null; attempts: number; max_attempts: number; assigned_worker_id: string | null; lease_expires_at: string | null; last_error: string | null; created_at: string; updated_at: string; completed_at: string | null; executions?: Execution[] }
export interface Worker { id: string; name: string; status: WorkerStatus; last_heartbeat_at: string | null; started_at: string; created_at: string; updated_at: string; load?: number }
export interface Stats { queued: number; scheduled: number; processing: number; completed: number; failed: number; dlq: number; workers_online: number; workers_offline: number }
export interface LogEvent { id: string; ts: string; source: string; message: string; level: 'info' | 'warn' | 'error'; critical: boolean }
export interface VelocityPoint { t: number; tps: number }
