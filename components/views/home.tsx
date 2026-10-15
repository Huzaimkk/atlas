import type { Opportunity, ProfileSnapshot, Verdict } from '@/types/atlas'
import { PostDegreeHoursChart } from '@/components/charts/post-degree-hours'
import { DeadlineTimelineChart } from '@/components/charts/deadline-timeline'

export function HomeView({
  profile,
  opportunities,
  verdicts,
}: {
  profile: ProfileSnapshot | null
  opportunities: Opportunity[]
  verdicts: Verdict[]
}) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
        <p className="mt-1 text-sm text-muted-foreground">Where things stand, at a glance.</p>
      </header>

      <PostDegreeHoursChart profile={profile} />
      <DeadlineTimelineChart opportunities={opportunities} verdicts={verdicts} />
    </div>
  )
}
