/**
 * Atlas motion tokens — the JS mirror of the --ease / --duration custom
 * properties in app/globals.css. Every animated component imports from
 * here instead of writing its own numbers, so the whole product moves
 * with one curve and three speeds.
 *
 * The rule: motion explains a change (a verdict resolving, a list
 * reordering, a panel opening) — it never decorates. If removing an
 * animation loses no information, remove it.
 */
import type { Transition, Variants } from 'motion/react'

export const EASE = [0.22, 1, 0.36, 1] as const

export const DURATION = {
  fast: 0.14,
  base: 0.22,
  slow: 0.42,
} as const

export const transition = {
  fast: { duration: DURATION.fast, ease: EASE } satisfies Transition,
  base: { duration: DURATION.base, ease: EASE } satisfies Transition,
  slow: { duration: DURATION.slow, ease: EASE } satisfies Transition,
  /** Shared-element moves: the sidebar marker, reordering rows. */
  layout: { type: 'spring', stiffness: 520, damping: 42, mass: 0.9 } satisfies Transition,
}

/** A view replacing another inside the app shell. */
export const viewSwap: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: transition.base },
  exit: { opacity: 0, transition: transition.fast },
}

/** A height-collapsing region (expandable tile, table detail row). */
export const disclose: Variants = {
  closed: { height: 0, opacity: 0, transition: transition.base },
  open: { height: 'auto', opacity: 1, transition: transition.base },
}
