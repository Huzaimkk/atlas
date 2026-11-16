'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Check, Minus, X } from 'lucide-react'
import type { VerdictType } from '@/types/atlas'
import { VERDICT_META } from '@/lib/atlas-format'
import { EASE, transition } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * The landing page's one orchestrated moment: an opportunity being
 * checked against a profile, rule by rule, and resolving to a verdict.
 * It is the product's core loop shown at reading speed, which is why it
 * gets the motion budget and nothing else on the page moves.
 *
 * These three cases are illustrations of the three outcomes, labelled as
 * such on the page. They are not live data.
 */
type Result = 'pass' | 'gap' | 'block'

interface Case {
  id: string
  tab: string
  title: string
  meta: string
  checks: { label: string; detail: string; result: Result }[]
  verdict: VerdictType
  summary: string
  quote?: { text: string; source: string }
  note?: string
}

const CASES: Case[] = [
  {
    id: 'blocked',
    tab: 'Blocked',
    title: 'Chevening Scholarship',
    meta: 'UK government · fully funded master’s',
    checks: [
      { label: 'Citizenship', detail: 'Pakistan is eligible', result: 'pass' },
      { label: 'Degree', detail: 'Bachelor’s completed', result: 'pass' },
      { label: 'Work experience', detail: '1,500 of 2,800 hours', result: 'block' },
    ],
    verdict: 'BLOCKED',
    summary: 'One rule you can’t meet yet. At your current hours you cross it in about eight months.',
    quote: {
      text: 'Applicants must have a minimum of two years’ (2,800 hours) full-time, paid work experience.',
      source: 'chevening.org/eligibility',
    },
  },
  {
    id: 'gap',
    tab: 'Gap',
    title: 'Gates Cambridge Scholarship',
    meta: 'University of Cambridge · full-cost PhD',
    checks: [
      { label: 'Citizenship', detail: 'Any country outside the UK', result: 'pass' },
      { label: 'Transcripts', detail: 'Already in your documents', result: 'pass' },
      { label: 'Reference letters', detail: '0 of 2 secured', result: 'gap' },
    ],
    verdict: 'GAP',
    summary: 'You’re eligible. One thing is missing: two reference letters, about four weeks, no cost.',
    note: 'The same two letters also unlock one other opportunity.',
  },
  {
    id: 'ready',
    tab: 'Ready',
    title: 'Graduate teaching assistantship',
    meta: 'University of Waterloo · funded',
    checks: [
      { label: 'Eligibility', detail: 'All four rules pass', result: 'pass' },
      { label: 'Documents', detail: 'CV, transcripts, statement', result: 'pass' },
      { label: 'Deadline', detail: '62 days left', result: 'pass' },
    ],
    verdict: 'READY',
    summary: 'Nothing is missing. This one is waiting on you, not on a document.',
  },
]

const STEP_MS = 620
const HOLD_MS = 4600

const RESULT_STYLE: Record<Result, { color: string; Icon: typeof Check }> = {
  pass: { color: 'var(--verdict-ready)', Icon: Check },
  gap: { color: 'var(--verdict-gap)', Icon: Minus },
  block: { color: 'var(--verdict-blocked)', Icon: X },
}

export function Diagnosis() {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  // How many checks have resolved; checks.length + 1 means the verdict is showing.
  const [step, setStep] = useState(0)
  const [auto, setAuto] = useState(true)

  const current = CASES[index]
  const done = current.checks.length + 1
  const shown = reduce ? done : step

  useEffect(() => {
    if (reduce) return
    if (step < done) {
      const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 500 : STEP_MS)
      return () => clearTimeout(t)
    }
    if (!auto) return
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % CASES.length)
      setStep(0)
    }, HOLD_MS)
    return () => clearTimeout(t)
  }, [step, done, auto, reduce])

  function pick(i: number) {
    setAuto(false)
    setIndex(i)
    setStep(0)
  }

  const verdictMeta = VERDICT_META[current.verdict]
  const resolved = shown >= done

  return (
    <figure className="w-full">
      <div className="overflow-hidden rounded-xl border border-border-strong bg-surface shadow-[0_24px_80px_-32px_rgba(0,0,0,0.9)]">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">Checked against your profile</p>
          <div role="tablist" aria-label="Example verdicts" className="flex gap-1">
            {CASES.map((c, i) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={i === index}
                onClick={() => pick(i)}
                className={cn(
                  'relative rounded-md px-2.5 py-1 text-xs transition-colors duration-150',
                  i === index ? 'text-foreground' : 'text-faint-foreground hover:text-muted-foreground'
                )}
              >
                {i === index && (
                  <motion.span layoutId="diagnosis-tab" transition={transition.layout} className="absolute inset-0 rounded-md bg-surface-3" />
                )}
                <span className="relative">{c.tab}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[25.5rem] px-5 py-5 sm:px-6 sm:py-6">
          {/* Keyed, enter-only: the next case fades in over an empty card. No
              exit animation to wait on, so a case can never be left hidden. */}
            <motion.div
              key={current.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={transition.base}
              className="space-y-5"
            >
              <div>
                <p className="display text-2xl text-foreground">{current.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{current.meta}</p>
              </div>

              <ul className="divide-y divide-border border-y border-border">
                {current.checks.map((check, i) => {
                  const isResolved = shown > i
                  const isActive = shown === i
                  const { color, Icon } = RESULT_STYLE[check.result]
                  return (
                    <li key={check.label} className="flex items-center gap-3 py-2.5">
                      <span
                        className="flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200"
                        style={{
                          borderColor: isResolved ? color : 'var(--border-strong)',
                          background: isResolved ? `color-mix(in srgb, ${color} 16%, transparent)` : 'transparent',
                        }}
                      >
                        {isResolved ? (
                          <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={transition.base}>
                            <Icon className="size-3" style={{ color }} strokeWidth={2.5} />
                          </motion.span>
                        ) : (
                          isActive && (
                            <motion.span
                              className="size-1.5 rounded-full bg-muted-foreground"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                            />
                          )
                        )}
                      </span>
                      <span className={cn('flex-1 text-sm transition-colors duration-200', isResolved ? 'text-foreground' : 'text-faint-foreground')}>
                        {check.label}
                      </span>
                      <span
                        className={cn(
                          'font-mono text-xs transition-opacity duration-200',
                          isResolved ? 'opacity-100' : 'opacity-0',
                          check.result === 'pass' ? 'text-muted-foreground' : 'text-foreground'
                        )}
                      >
                        {check.detail}
                      </span>
                    </li>
                  )
                })}
              </ul>

              <div aria-live="polite">
                {resolved && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      {/* The verdict lands like a stamp: slightly oversized, then settles. */}
                      <motion.span
                        initial={{ scale: 1.25, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.34, ease: EASE }}
                        className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium"
                        style={{ color: verdictMeta.colorVar, background: verdictMeta.bgVar }}
                      >
                        <span className="size-1.5 rounded-full" style={{ background: verdictMeta.colorVar }} />
                        {verdictMeta.label}
                      </motion.span>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ ...transition.base, delay: 0.18 }}
                        className="text-sm text-foreground"
                      >
                        {current.summary}
                      </motion.p>
                    </div>

                    {current.quote && (
                      <motion.blockquote
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...transition.slow, delay: 0.42 }}
                        className="border-l-2 border-border-strong pl-4"
                      >
                        <p className="source-quote">&ldquo;{current.quote.text}&rdquo;</p>
                        <footer className="mt-1.5 font-mono text-2xs text-faint-foreground">{current.quote.source}</footer>
                      </motion.blockquote>
                    )}

                    {current.note && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ ...transition.slow, delay: 0.42 }}
                        className="text-sm text-muted-foreground"
                      >
                        {current.note}
                      </motion.p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-faint-foreground">
        Illustrative examples. Your own verdicts quote the programme&rsquo;s live page.
      </figcaption>
    </figure>
  )
}
