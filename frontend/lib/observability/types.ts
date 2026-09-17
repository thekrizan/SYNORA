export type TaskStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'RETRYING'
  | 'DEAD_LETTER'

export type WorkerId = 'W-ALPHA' | 'W-BETA' | 'W-GAMMA'

export type WorkerStatus = 'ONLINE' | 'OFFLINE'

export interface Task {
  id: string
  name: string
  status: TaskStatus
  node: WorkerId
  latencyMs: number
  ts: string
}

export interface Worker {
  id: WorkerId
  status: WorkerStatus
  load: number
  region: string
}

export type LogLevel = 'info' | 'warn' | 'error'

export interface LogEvent {
  id: string
  ts: string
  source: string
  message: string
  level: LogLevel
  critical: boolean
}

export interface VelocityPoint {
  t: number
  tps: number
}
