'use client'

import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import type { VelocityPoint } from '@/lib/observability/types'
import { GlassPanel, PanelHeading } from './glass-panel'

interface QueueVelocityProps {
  data: VelocityPoint[]
  delay?: number
}

export function QueueVelocity({ data, delay = 0 }: QueueVelocityProps) {
  const current = data.length ? data[data.length - 1].tps : 0
  const peak = data.reduce((max, p) => Math.max(max, p.tps), 0)

  return (
    <GlassPanel delay={delay} className="flex h-full flex-col p-5">
      <PanelHeading
        label="Queue Velocity"
        hint={<span className="font-mono">tasks / sec</span>}
      />

      <div className="mt-4 flex items-end gap-6">
        <div>
          <div className="font-mono text-4xl font-semibold tracking-tight text-cyan-300 tabular-nums">
            {current}
            <span className="ml-1 text-base font-normal text-neutral-500">TPS</span>
          </div>
          <div className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-neutral-500">
            peak {peak} · window 40s
          </div>
        </div>
      </div>

      <div className="mt-2 min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="velocityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.5} />
                <stop offset="60%" stopColor="#22D3EE" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={[0, 130]} hide />
            <Area
              type="monotone"
              dataKey="tps"
              stroke="#22D3EE"
              strokeWidth={4}
              strokeLinecap="round"
              fill="url(#velocityFill)"
              isAnimationActive={false}
              dot={false}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassPanel>
  )
}
