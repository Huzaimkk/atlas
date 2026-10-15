'use client'

import { motion } from 'motion/react'
import type { ProfileSnapshot } from '@/types/atlas'
import { postDegreeHours, projectedCrossingDate } from '@/lib/atlas-format'

// Single magnitude against two fixed thresholds (spec §5.5's own worked
// example) — a horizontal progress bar with threshold ticks reads this
// better than an XY chart would (dataviz skill's form heuristic: a lone
// number tracked against fixed targets is a stat/progress form, not a
// chart needing its own coordinate system).
const THRESHOLDS = [
  { label: 'Chevening', hours: 2800 },
  { label: 'DAAD', hours: 4160 },
]

function formatCrossing(date: Date | null, crossed: boolean): string {
  if (!date) return 'no projection yet'
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return crossed ? `crossed ${formatted}` : `projected ${formatted}`
}

export function PostDegreeHoursChart({ profile }: { profile: ProfileSnapshot | null }) {
  if (!profile) return null

  const current = postDegreeHours(profile.degree_completed_on, profile.full_time_hours_per_month)
  const maxThreshold = Math.max(...THRESHOLDS.map((t) => t.hours))
  const scaleMax = Math.max(maxThreshold * 1.08, current * 1.08)

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-foreground">Post-degree hours</h2>
        <p className="font-mono text-lg font-semibold text-foreground">{current.toLocaleString()}h</p>
      </div>

      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (current / scaleMax) * 100)}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
        {THRESHOLDS.map((t) => (
          <div
            key={t.label}
            className="absolute top-0 h-full w-px bg-border-strong"
            style={{ left: `${(t.hours / scaleMax) * 100}%` }}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {THRESHOLDS.map((t) => {
          const crossed = current >= t.hours
          const date = projectedCrossingDate(profile.degree_completed_on, profile.full_time_hours_per_month, t.hours)
          return (
            <div key={t.label} className="space-y-0.5">
              <p className="text-xs font-medium text-foreground">
                {t.label} <span className="font-mono text-2xs text-muted-foreground">({t.hours.toLocaleString()}h)</span>
              </p>
              <p className={crossed ? 'text-2xs text-verdict-ready' : 'text-2xs text-muted-foreground'}>{formatCrossing(date, crossed)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
