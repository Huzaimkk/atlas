'use client'

import { useEffect, useRef } from 'react'
import { animate, useReducedMotion } from 'motion/react'
import { DURATION, EASE } from '@/lib/motion'

/**
 * A number that counts to its value when it first appears and re-counts
 * from the previous value whenever it changes — so a counter moving from
 * 4 to 5 after an action is something you see happen, not something you
 * have to notice. Renders the final value on the server and under
 * reduced motion.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const previous = useRef(0)
  const reduce = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (reduce) {
      node.textContent = value.toLocaleString()
      previous.current = value
      return
    }
    const controls = animate(previous.current, value, {
      duration: DURATION.slow + 0.25,
      ease: EASE,
      onUpdate: (v) => {
        node.textContent = Math.round(v).toLocaleString()
      },
    })
    previous.current = value
    return () => controls.stop()
  }, [value, reduce])

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {value.toLocaleString()}
    </span>
  )
}
