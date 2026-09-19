'use client'

import { useState } from 'react'
import { UNIVERSITIES } from '@/lib/universities'

const ROUTE_STYLES = {
  professor: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  direct: 'bg-accent2/10 text-accent2 border-accent2/30',
  both: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
}

export function UniversitiesTable() {
  const [filter, setFilter] = useState<string>('All')
  const [sortBy, setSortBy] = useState<'chance' | 'fit_score'>('chance')

  const countries = ['All', ...Array.from(new Set(UNIVERSITIES.map(u => u.country)))]

  const filtered = UNIVERSITIES
    .filter(u => filter === 'All' || u.country === filter)
    .sort((a, b) => b[sortBy] - a[sortBy])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {countries.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filter === c ? 'bg-accent/20 border-accent/40 text-accent' : 'border-white/10 text-muted hover:border-white/20'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSortBy('chance')}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${sortBy === 'chance' ? 'bg-surface2 border-white/20 text-text' : 'border-white/8 text-muted'}`}>
            Sort by Chance
          </button>
          <button onClick={() => setSortBy('fit_score')}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${sortBy === 'fit_score' ? 'bg-surface2 border-white/20 text-text' : 'border-white/8 text-muted'}`}>
            Sort by Fit
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface rounded-xl border border-white/8 p-4 text-center">
          <div className="text-2xl font-bold text-accent">{filtered.length}</div>
          <div className="text-xs text-muted">Universities shown</div>
        </div>
        <div className="bg-surface rounded-xl border border-white/8 p-4 text-center">
          <div className="text-2xl font-bold text-accent2">{filtered.filter(u => u.chance >= 85).length}</div>
          <div className="text-xs text-muted">High probability (85%+)</div>
        </div>
        <div className="bg-surface rounded-xl border border-white/8 p-4 text-center">
          <div className="text-2xl font-bold text-accent4">{filtered.filter(u => u.country === 'Germany').length}</div>
          <div className="text-xs text-muted">Free tuition options</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/8">
              {['University', 'Program', 'Fit', 'Chance (CTO)', 'Route', 'Notes'].map(h => (
                <th key={h} className="text-left text-xs font-mono text-muted uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((uni, i) => {
              const chanceColor = uni.chance >= 85 ? 'text-accent2' : uni.chance >= 70 ? 'text-accent4' : 'text-accent3'
              return (
                <tr key={i} className="border-b border-white/5 hover:bg-surface2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{uni.flag}</span>
                      <span className="text-sm font-semibold text-text">{uni.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted max-w-[160px]">{uni.program}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-bold text-accent">{uni.fit_score}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-surface2 rounded-full overflow-hidden">
                        <div className="h-1.5 rounded-full" style={{ width: `${uni.chance}%`, background: uni.chance >= 85 ? '#00d4aa' : uni.chance >= 70 ? '#ffa500' : '#ff6b6b' }} />
                      </div>
                      <span className={`text-sm font-mono font-bold ${chanceColor}`}>{uni.chance}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-mono capitalize ${ROUTE_STYLES[uni.route]}`}>
                      {uni.route}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted max-w-[200px]">{uni.notes}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
