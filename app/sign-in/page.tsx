'use client'

import { useState } from 'react'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, Mail, Quote } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.69-2.26 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.14A6.96 6.96 0 0 1 5.44 12c0-.74.13-1.46.4-2.14V7.02H2.18A10.98 10.98 0 0 0 1 12c0 1.77.42 3.45 1.18 4.98l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.47c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.02l3.66 2.84c.87-2.6 3.3-4.39 6.16-4.39z" fill="#EA4335" />
    </svg>
  )
}

const EXAMPLE_VERDICT = {
  title: 'Chevening Scholarships 2027–28',
  institution: 'UK Government · Fully funded master’s',
  reason: '2,800 post-degree work hours required',
  detail: 'has 1,500h, needs 2,800h',
  quote: 'Applicants must have a minimum of two years’ (2,800 hours) full-time, paid work experience.',
  source: 'chevening.org/eligibility',
}

function SignInForm() {
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    params.get('error') ? 'error' : 'idle'
  )
  const [errorMessage, setErrorMessage] = useState(
    params.get('error') ? 'That sign-in link didn’t work — it may have expired. Try again below.' : ''
  )

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setErrorMessage(error.message)
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  async function signInWithGoogle() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  if (status === 'sent') {
    return (
      <div className="space-y-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-verdict-ready-bg text-verdict-ready">
          <Mail className="size-5" strokeWidth={1.75} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Check your email</h1>
        <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
          We sent a sign-in link to <span className="text-foreground">{email}</span>. Open it on this device to
          continue — it signs you in automatically, no password to remember.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Sign in to Atlas</h1>
        <p className="text-sm text-muted-foreground">
          New here? The same form creates your account — the pool fills in the moment you're in.
        </p>
      </div>

      <form onSubmit={sendMagicLink} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {status === 'error' && <p className="text-xs text-destructive">{errorMessage}</p>}
        <Button type="submit" className="w-full" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
          {status !== 'sending' && <ArrowRight className="size-3.5" />}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-faint-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button type="button" variant="secondary" className="w-full" onClick={signInWithGoogle}>
        <GoogleIcon className="size-4" />
        Continue with Google
      </Button>
    </div>
  )
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen w-full">
      <div className="flex w-full flex-col justify-center px-6 py-16 sm:px-12 lg:w-[460px] lg:shrink-0 lg:px-14">
        <div className="mb-10 flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono text-xs font-bold">
            A
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">Atlas</span>
        </div>

        <Suspense fallback={null}>
          <SignInForm />
        </Suspense>
      </div>

      <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-surface p-16 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 30% 20%, rgba(108,99,255,0.25), transparent), radial-gradient(ellipse 50% 40% at 85% 85%, rgba(0,212,170,0.12), transparent)',
          }}
        />
        <div className="relative max-w-md space-y-6">
          <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
            A position, not a list of links.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Every funded opportunity in the pool is checked against your actual profile. When something blocks
            you, Atlas quotes the rule and the page it came from — never a guess.
          </p>

          <div className="space-y-3 rounded-lg border border-border-strong bg-surface-2/60 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{EXAMPLE_VERDICT.title}</p>
                <p className="text-xs text-muted-foreground">{EXAMPLE_VERDICT.institution}</p>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap'
                )}
                style={{ color: 'var(--verdict-blocked)', background: 'var(--verdict-blocked-bg)' }}
              >
                BLOCKED
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {EXAMPLE_VERDICT.reason} <span className="text-faint-foreground">({EXAMPLE_VERDICT.detail})</span>
            </p>
            <div className="flex gap-2 rounded-md bg-background/60 p-3">
              <Quote className="size-3.5 shrink-0 text-faint-foreground" strokeWidth={1.75} />
              <div className="space-y-1">
                <p className="font-mono text-2xs leading-relaxed text-muted-foreground">
                  &ldquo;{EXAMPLE_VERDICT.quote}&rdquo;
                </p>
                <p className="font-mono text-2xs text-faint-foreground">{EXAMPLE_VERDICT.source}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
