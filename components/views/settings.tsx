'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/atlas/page-header'
import { useRouter } from 'next/navigation'
import { LogOut, Mail, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProfileSnapshot } from '@/types/atlas'
import { useReadOnly } from '@/components/atlas/read-only'

export function SettingsView({ email, profile }: { email: string | null; profile: ProfileSnapshot | null }) {
  const router = useRouter()
  const readOnly = useReadOnly()
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    setSigningOut(true)
    await fetch('/api/auth/sign-out', { method: 'POST' })
    router.push('/sign-in')
  }

  return (
    <div className="max-w-xl space-y-8">
      <PageHeader title="Settings" description="Your account." />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Account</h2>
        <div className="space-y-2 rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center gap-2.5 text-sm">
            <Mail className="size-4 shrink-0 text-faint-foreground" strokeWidth={1.75} />
            <span className="text-foreground">{email ?? 'Sample account'}</span>
          </div>
          {profile && (
            <div className="flex items-center gap-2.5 text-sm">
              <User className="size-4 shrink-0 text-faint-foreground" strokeWidth={1.75} />
              <span className="text-muted-foreground">
                Profile v{profile.user_version ?? 1} · created {new Date(profile.created_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <Button variant="outline" onClick={signOut} disabled={readOnly || signingOut}>
          <LogOut className="size-3.5" />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </Button>
      </section>
    </div>
  )
}
