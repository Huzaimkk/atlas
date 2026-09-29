// Pre-v2 shapes, kept only for the localStorage migration (lib/migrate-legacy-storage.ts).
// The live schema is types/atlas.ts.

export type KanbanStage = 'identified' | 'emailed' | 'replied' | 'applied' | 'decision'

export interface Professor {
  id: string
  name: string
  university: string
  department?: string
  email?: string
  research_focus: string
  recent_paper?: string
  fit_score: number
  stage: KanbanStage
  notes?: string
  created_at: string
  last_contacted?: string
}

export interface EmailLog {
  id: string
  professor_id: string
  professor_name: string
  university: string
  subject: string
  body: string
  sent_at: string
  status: 'draft' | 'sent' | 'replied'
}

export interface CVVersion {
  id: string
  name: string
  type: 'academic' | 'executive' | 'industry' | 'germany'
  professor_context?: string
  content: string
  created_at: string
}

export interface SOPVersion {
  id: string
  university: string
  program: string
  professor?: string
  word_count: number
  content: string
  created_at: string
}

export interface University {
  name: string
  country: string
  flag: string
  program: string
  fit_score: number
  chance: number
  route: 'professor' | 'direct' | 'both'
  deadline?: string
  notes?: string
}

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface GRESession {
  id: string
  date: string
  quant: number
  verbal: number
  awa: number
  notes: string
}

export interface Deadline {
  id: string
  university: string
  program: string
  deadline: string
  round?: string
  gre_required: boolean
  applied: boolean
  notes: string
}
