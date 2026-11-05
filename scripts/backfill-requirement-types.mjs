// One-off correctness backfill: many requirements were imported with
// type: 'other' even though their label clearly names a specific
// RequirementType (CV, transcript, LOR, SOP/motivation, research
// proposal, English test). This matters beyond cosmetics — a mistyped
// exam or document silently escapes both the Gap Queue's credential/
// document bucketing AND (now that lib/diagnostic-engine.ts consults
// document_inventory) the document-readiness check, since INVENTORY_KEY
// only recognizes the real type names. Audited by hand against the full
// list of 'other'-typed labels in the pool (scripts/_audit*.mjs, not
// committed) — every mapping below is a confident, unambiguous rename;
// anything that didn't clearly name one specific type (e.g. "degree",
// "passport", "pitch deck", "business plan") was left as 'other'.
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const LABEL_TO_TYPE = {
  'cv': 'cv',
  'transcripts': 'transcript',
  'transcript': 'transcript',
  'official transcript': 'transcript',
  'academic records': 'transcript',
  'english evidence': 'language_test',
  'english certificate': 'language_test',
  'english evidence if applicable': 'language_test',
  'references': 'lor',
  'reference': 'lor',
  'two references': 'lor',
  'three references': 'lor',
  'two academic references': 'lor',
  'three reference contacts': 'lor',
  'additional reference': 'lor',
  'reference contact': 'lor',
  'promoter recommendation': 'lor',
  'advisor reference': 'lor',
  '2–3 references': 'lor',
  'research proposal': 'research_proposal',
  'motivation': 'sop',
  'two-page motivation': 'sop',
  'statement': 'sop',
  'statement of objectives': 'sop',
  'personal statements': 'sop',
  'one-page interest letter': 'sop',
  'research interests': 'sop',
  'technical vision': 'sop',
}

async function main() {
  const { data: opps, error } = await admin.from('opportunities').select('id, title, requirements')
  if (error) throw error

  let touched = 0
  let fieldsChanged = 0
  for (const opp of opps) {
    if (!opp.requirements?.length) continue
    let changed = false
    const next = opp.requirements.map((req) => {
      const key = (req.label ?? '').trim().toLowerCase()
      const correctType = LABEL_TO_TYPE[key]
      if (correctType && req.type !== correctType) {
        changed = true
        fieldsChanged++
        return { ...req, type: correctType }
      }
      return req
    })
    if (!changed) continue
    const { error: updateErr } = await admin.from('opportunities').update({ requirements: next }).eq('id', opp.id)
    if (updateErr) console.error(`FAILED "${opp.title}":`, updateErr.message)
    else { touched++; console.log(`OK "${opp.title}"`) }
  }
  console.log(`\nRetyped ${fieldsChanged} requirement(s) across ${touched} opportunity row(s).`)
}

main()
