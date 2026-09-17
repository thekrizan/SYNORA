'use client'

import { motion } from 'framer-motion'
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from 'recharts'
import type { Worker } from '@/lib/observability/types'
import { GlassPanel, PanelHeading } from './glass-panel'

interface WorkerGridProps {
  workers: Worker[]
  delay?: number
}

function ringColor(worker: Worker): string {
  if (worker.status === 'offline') return '#F43F5E'
  if ((worker.load ?? 0) >= 80) return '#F59E0B'
  return '#34D399'
}

function WorkerCard({ worker }: { worker: Worker }) {
  const offline = worker.status === 'offline'
  const color = ringColor(worker)
  const load = worker.load ?? 0
  const chartData = [{ name: worker.id, value: load, fill: color }]

  return (
    <div
      className={`relative flex flex-col items-center rounded-2xl border p-4 transition-colors duration-500 ${
        offline
          ? 'border-rose-500/30 bg-rose-500/[0.06]'
          : 'border-white/10 bg-white/[0.02]'
      }`}
    >
      <div className="flex w-full items-center justify-between">
        <span className="font-mono text-xs font-medium tracking-wide text-neutral-200">
          {worker.id}
        </span>
        <span
          className={`font-mono text-[0.6rem] uppercase tracking-[0.16em] ${
            offline ? 'text-rose-400' : 'text-emerald-300'
          }`}
        >
          {offline ? '\u{1F480} Offline' : '\u{1F7E2} Online'}
        </span>
      </div>

      <div
        className={`relative mt-2 h-32 w-full ${offline ? 'animate-ring-glow' : ''}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={chartData}
            innerRadius="72%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            barSize={10}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              dataKey="value"
              background={{ fill: 'rgba(255,255,255,0.06)' }}
              cornerRadius={9}
              isAnimationActive
              animationDuration={700}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono text-2xl font-semibold tabular-nums"
            style={{ color }}
          >
          {load}%
          </span>
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-neutral-500">
            load
          </span>
        </div>
      </div>

      <div className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-neutral-500">
        {worker.name}
      </div>
    </div>
  )
}

export function WorkerGrid({ workers, delay = 0 }: WorkerGridProps) {
  return (
    <GlassPanel delay={delay} className="flex h-full flex-col p-5">
      <PanelHeading
        label="Node Allocation"
        accent="#a78bfa"
        hint={<span className="font-mono">{workers.length} workers · heartbeat health</span>}
      />
      <div className="mt-4 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
        {workers.map((worker, i) => (
          <motion.div
            key={worker.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay + i * 0.08 }}
          >
            <WorkerCard worker={worker} />
          </motion.div>
        ))}
      </div>
    </GlassPanel>
  )
}
