import Link from 'next/link'
import { cookies } from 'next/headers'
import { ArrowRight } from 'lucide-react'
import type { VerdictType } from '@/types/atlas'
import { AtlasWordmark } from '@/components/atlas/brand'
import { VerdictBadge } from '@/components/atlas/verdict-badge'
import { Diagnosis } from '@/components/landing/diagnosis'
import { DEMO_ENABLED } from '@/data/mock/demo'

const VERDICTS: { type: VerdictType; meaning: string }[] = [
  { type: 'READY', meaning: 'Every eligibility rule passes and every required document is already in your hands. Apply.' },
  { type: 'GAP', meaning: 'You are eligible, but something is missing. Each missing item is named, with the time and cost to close it.' },
  { type: 'LATE_WINDOW', meaning: 'The deadline has passed, but the organiser still takes applications. Flagged as urgent instead of written off.' },
  { type: 'NOT_YET_OPEN', meaning: 'Applications open later. Atlas holds the opportunity and surfaces it when they do.' },
  { type: 'BLOCKED', meaning: 'A rule you cannot change excludes you: citizenship, degree level, age. The rule is quoted with its source, so you can check it yourself.' },
  { type: 'EXPIRED', meaning: 'Closed, with no late route. Kept rather than deleted, because most programmes come back next year.' },
]

const STEPS = [
  {
    title: 'It starts from you',
    body: 'Your degrees and their dates, test scores, hours of work since graduating, and the documents you already have. Not a keyword list: the facts a rule can be checked against.',
  },
  {
    title: 'Every opportunity is read at its source',
    body: 'Eligibility rules and required documents come from the programme’s official page and are stored as quotes with links. Aggregator listings are leads, never facts.',
  },
  {
    title: 'Each one gets a verdict about you',
    body: 'Rule by rule, against your profile. The answer is one of six verdicts, and every blocked verdict carries the sentence that blocks you.',
  },
  {
    title: 'Gaps are ranked by what they unlock',
    body: 'Two reference letters might open nine applications; a language test, four. Atlas adds it up across everything and tells you which to do first.',
  },
]

const REFUSALS = [
  {
    title: 'It never blocks you on a guess',
    body: 'An opportunity is only marked blocked when a rule can be quoted from the official page. When Atlas is unsure, it shows you the opportunity and says what it could not confirm.',
  },
  {
    title: 'No match score without a reason',
    body: '“87% match” tells you nothing you can act on. Every verdict here comes with the rule, the number it was checked against, and the link.',
  },
  {
    title: 'No visa advice',
    body: 'Atlas reports what a programme’s page states about sponsorship. It does not tell you which immigration route to take; that is a regulated profession’s job.',
  },
  {
    title: 'Nothing is sent in your name',
    body: 'Atlas will not message a professor or connect on LinkedIn for you. Your account, your reputation, your send button.',
  },
]

// A Supabase session cookie is enough to decide which button to show;
// the dashboard itself still verifies the session properly. Checking the
// cookie's presence avoids an auth round-trip on every anonymous visit.
async function hasSessionCookie(): Promise<boolean> {
  const store = await cookies()
  return store.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))
}

export default async function LandingPage() {
  const signedIn = await hasSessionCookie()
  const primary = signedIn ? { href: '/dashboard', label: 'Open your dashboard' } : { href: '/sign-in', label: 'Create your account' }

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="Atlas home">
          <AtlasWordmark />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {DEMO_ENABLED && (
            <Link href="/demo" className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground">
              Demo
            </Link>
          )}
          <Link
            href={signedIn ? '/dashboard' : '/sign-in'}
            className="rounded-md border border-border-strong px-3 py-1.5 text-foreground transition-colors hover:bg-surface-2"
          >
            {signedIn ? 'Dashboard' : 'Sign in'}
          </Link>
        </nav>
      </header>

      <main>
        <section className="relative">
          <div className="graticule pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-x-16 gap-y-12 px-5 pb-24 pt-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,29rem)] lg:pb-32 lg:pt-24">
            <div>
              <h1 className="display text-5xl leading-[1.03] text-foreground sm:text-6xl lg:text-7xl">A position, not a list of links.</h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Atlas checks every funded PhD, scholarship and fellowship it tracks against your actual profile. Each one comes back
                with a verdict: ready, a named gap, or blocked, with the rule quoted from the programme&rsquo;s own page.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href={primary.href}
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {primary.label}
                  <ArrowRight className="size-4" strokeWidth={2} />
                </Link>
                {DEMO_ENABLED && (
                  <Link
                    href="/demo"
                    className="inline-flex h-11 items-center rounded-md border border-border-strong px-5 text-base text-foreground transition-colors hover:bg-surface-2"
                  >
                    Look around with sample data
                  </Link>
                )}
              </div>
            </div>
            <Diagnosis />
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-x-16 gap-y-10 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:py-28">
            <div>
              <h2 className="display text-4xl leading-tight text-foreground">Six verdicts. Each one means exactly one thing.</h2>
              <p className="mt-4 text-base text-muted-foreground">
                These six colours are the only colour in the product. If something on screen is tinted, it is telling you where you
                stand.
              </p>
            </div>
            <dl className="divide-y divide-border border-y border-border">
              {VERDICTS.map((v) => (
                <div key={v.type} className="grid gap-x-8 gap-y-2 py-5 sm:grid-cols-[9rem_minmax(0,1fr)]">
                  <dt>
                    <VerdictBadge verdict={v.type} />
                  </dt>
                  <dd className="text-base text-muted-foreground">{v.meaning}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t border-border bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
            <h2 className="display max-w-2xl text-4xl leading-tight text-foreground">How a page on the internet becomes a verdict about you.</h2>
            <ol className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="border-t border-border-strong pt-5">
                  <p className="font-mono text-xs text-faint-foreground">{i + 1}</p>
                  <h3 className="mt-3 text-lg font-medium text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-x-16 gap-y-10 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:py-28">
            <div>
              <h2 className="display text-4xl leading-tight text-foreground">What Atlas will not do.</h2>
              <p className="mt-4 text-base text-muted-foreground">
                Being wrongly told you are ready costs an afternoon. Being wrongly told you are blocked removes an opportunity
                silently and for good. Atlas is built around the second mistake.
              </p>
            </div>
            <ul className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
              {REFUSALS.map((r) => (
                <li key={r.title}>
                  <h3 className="text-lg font-medium text-foreground">{r.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-8 px-5 py-20 sm:px-8 lg:py-24">
            <h2 className="display max-w-xl text-5xl leading-[1.05] text-foreground">Find out where you stand.</h2>
            <Link
              href={primary.href}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {primary.label}
              <ArrowRight className="size-4" strokeWidth={2} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-faint-foreground sm:px-8">
          <AtlasWordmark className="text-muted-foreground" />
          <p>Funded PhDs, scholarships and fellowships, checked against you.</p>
        </div>
      </footer>
    </div>
  )
}
