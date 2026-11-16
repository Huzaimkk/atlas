'use client'

import { MotionConfig } from 'motion/react'
import { transition } from '@/lib/motion'

/**
 * App-wide motion defaults. `reducedMotion="user"` makes every motion
 * component honour the OS "reduce motion" setting (transforms and layout
 * animations are skipped; opacity still fades), so no view has to
 * remember to check it.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={transition.base}>
      {children}
    </MotionConfig>
  )
}
