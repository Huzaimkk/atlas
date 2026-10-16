import type { ProfileSnapshot, Requirement, RequiredDocument, RequirementType } from '@/types/atlas'

// Which RequirementType maps to which document_inventory key — only
// document-shaped requirements have one. gre/language_test/aptitude_test
// are credentials (tracked as profile pending_items, not documents) and
// 'other' is too free-form to map; those seed with no inventory_status and
// rely purely on the opportunity's own requirements.satisfied flag.
const INVENTORY_KEY: Partial<Record<RequirementType, keyof ProfileSnapshot['document_inventory']>> = {
  sop: 'sop',
  research_proposal: 'research_statement',
  cv: 'cv',
  transcript: 'transcripts',
  lor: 'lor_commitments',
  writing_sample: 'writing_sample',
  portfolio: 'portfolio',
}

/**
 * Seeds an application's required_documents checklist from one opportunity's
 * requirements, cross-referenced against the profile's document_inventory
 * (item 2's explicit ask) — a requirement whose type maps to an inventory
 * key starts satisfied when that document is 'ready', independent of
 * whatever requirements.satisfied already says (that flag tracks THIS
 * programme's own submission, not general document readiness). Called once,
 * at application creation; the result is then independently toggleable per
 * application, not re-derived live.
 */
export function seedRequiredDocuments(requirements: Requirement[], profile: ProfileSnapshot | null): RequiredDocument[] {
  return (requirements ?? []).map((req) => {
    const invKey = INVENTORY_KEY[req.type]
    const inventory_status = invKey ? profile?.document_inventory?.[invKey] : undefined
    return {
      type: req.type,
      label: req.label,
      satisfied: inventory_status ? inventory_status === 'ready' : req.satisfied,
      inventory_status,
    }
  })
}
