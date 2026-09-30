// Phase 2 — loads data/inbox/cv/profile-snapshot-v5.md into profile_snapshots
// as version 1. Hand-transcribed from v5 (not auto-parsed — the document is
// prose/tables, not structured data, and the corrections in it matter too
// much to risk a lossy parser). Run once.
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const snapshot = {
  version: 1,
  is_current: true,

  identity: {
    citizenship: 'Pakistan',
    current_degree_level: 'BE Electronics Engineering (completed)',
    current_institution: 'Dawood University of Engineering & Technology (DUET)',
    funding_requirement: 'fully_funded_only',
    term_flexibility: 'any',
    geography: 'any',
    // v5 §1: both tracks run in parallel — never collapsed to one.
    target_degree_levels: ['masters', 'phd'],
  },

  credentials: {
    degrees: [
      { name: 'BE Electronics Engineering', institution: 'Dawood University of Engineering & Technology (DUET)', date: 'January 2026', cgpa: '3.3/4.0' },
    ],
    // v5 §3.6 — no language_test/gre here; those are pending_items below,
    // per the Phase-2 rule that they're not achievements yet.
    certifications: [
      'Member, IEEE',
      'NVIDIA 6G Developer Program',
      'NVIDIA Jetson Nano Certificate of Competency',
      'Oracle OCI Generative AI Professional',
      'Meta Hacker Cup 2024 — global top 1,000 of 13,262',
      'McKinsey Forward Fellow',
      'Stanford Code in Place',
      'LabLab NEXT Accelerator',
    ],
  },

  // v5 §2 — algorithmic/simulation capability, not hardware implementation
  // (the v4->v5 correction). 11 entries, wider than the spec's suggested
  // 5-8, because v5 is explicit that these are genuinely distinct
  // directions and narrowing them loses matching recall.
  research_fingerprint: [
    'deep reinforcement learning for control (PPO policy networks)',
    'recurrent neural networks for state estimation (GRU flux observers)',
    'motor drive control modelling (PMSM, Direct Torque Control)',
    'metaheuristic and quantum-inspired optimisation (PSO, simulated annealing, VQE-inspired)',
    'biosignal machine learning (ECG/EEG classification)',
    'applied ML on scientific datasets (NASA photovoltaic degradation)',
    'post-quantum cryptography, algorithmic (ML-KEM/CRYSTALS-Kyber, lattice-based KEM)',
    'embedded systems and IoT deployment (Jetson Nano, ESP32, edge inference)',
    'industrial automation and cyber-physical systems (DCS, SCADA, PLC, EtherCAT)',
    'LLMs and agentic AI automation (RAG, multi-agent systems, SLMs)',
    'AI/ML in healthcare (wearable diagnostics, stroke prediction)',
  ],

  evidence: {
    publications: [
      {
        title: 'Artificial Intelligence-Based Direct Torque Control for PMSM Electric Vehicle Drives: A Simulation Study on Torque Ripple Reduction and Energy Efficiency',
        venue: 'manuscript in preparation — requires revision to remove unsupportable HIL claims before it can be submitted anywhere; re-targeting IEEE Access / IET Electric Power Applications / Energies (MDPI) / IECON-ECCE-APEC',
        authorship: 'second of two, with M. Shahid (Senior Member, IEEE)',
        date: '2026',
      },
      {
        title: 'Deep Learning-Based Multi-Channel Biosignal Classification for Wearable Cardiovascular and Neurological Monitoring',
        venue: 'manuscript in preparation, targeting IEEE Malaysia',
        authorship: 'unconfirmed — needs the same claim-accuracy audit as the AI-DTC paper before submission',
        date: '2026',
      },
    ],
    preprints: [],
    patents: [],
    open_source: [],
    venture_work: [
      { name: 'ClinCell', role: 'Chief Technology Officer', metrics: 'Aug 2025–present; AI-embedded systems for SaaS tools and agentic AI automation' },
      { name: 'PULSE AI', role: 'Founder', metrics: 'Jun 2024–present; wearable ECG/EEG monitoring and stroke prediction, 80% detection accuracy, evaluated by DOW Medical University for MDI clinical review, featured in Dawn News' },
      { name: 'Aladdin AI', role: 'Founder', metrics: 'Jul 2025–present; financial forecasting LLM platform, 4 custom SLMs/LLMs from scratch, multilingual agent, agent-rental platform' },
      { name: 'Berry AI', role: 'Founder', metrics: 'developer tools — founding date, description and status still open (v5 §8 item 5)' },
      { name: 'Imdad (NGO)', role: 'Co-founder', metrics: 'sehri distribution for all 30 days of Ramadan; raised ~$20,000 USD in 48 hours across the USA, UAE and Pakistan — the strongest verifiable leadership/scholarship evidence in the profile' },
    ],
  },

  teaching_service: {
    ta_history: [],
    mentoring: ['DeepLearning.AI AI Community Mentor under Prof. Andrew Ng, Jan 2024–present, 100+ students mentored — the GTA-eligibility evidence'],
    review_work: [],
  },

  document_inventory: {
    sop: 'missing',
    research_statement: 'draft', // substantially drafted in the PQC/MPPT report; needs claims rescoped
    cv: 'draft', // v1 incomplete, rewrite underway
    transcripts: 'missing', // v5 §4: "Confirm" — unconfirmed, surfaced rather than assumed
    lor_commitments: 'missing', // none secured
    writing_sample: 'missing', // AI-DTC unusable until revised; Stanford abstract not yet finalized
    portfolio: 'missing', // not addressed in v5 — not claimed as ready
  },

  // No professor outreach recorded in v5 — the §6 "likely referees" list is
  // candidates, not contacted-and-logged network entries.
  network: [],

  pending_items: [
    {
      item: 'IELTS or TOEFL official score',
      type: 'credential',
      status: 'in_progress',
      expected_completion: null,
      note: 'DET B2 120/160 is an interim/practice indicator only, not an official IELTS/TOEFL score. Booking not yet confirmed (v5 §8 item 8).',
    },
    {
      item: 'GRE',
      type: 'credential',
      status: 'in_progress',
      expected_completion: null,
      note: 'Booking not yet confirmed (v5 §8 item 8).',
    },
    {
      item: 'AI-DTC manuscript revision to honest scope, with Mirza Shahid',
      type: 'document',
      status: 'in_progress',
      expected_completion: null,
      note: 'Strip HIL/hardware claims, re-target venue. Gap Queue rank 1 (v5 §6) — makes the paper submittable and usable as a writing sample.',
    },
    {
      item: 'PULSE AI biosignal paper',
      type: 'document',
      status: 'in_progress',
      expected_completion: null,
      note: 'In preparation, targeting IEEE Malaysia. Needs the same claim-accuracy audit as AI-DTC before submission.',
    },
    {
      item: 'Stanford AI+HEALTH 2026 panel abstract',
      type: 'record',
      status: 'in_progress',
      expected_completion: '2026-12-08',
      note: 'Presenting 8–9 Dec 2026, Stanford Center for AI in Medicine & Imaging / Stanford HAI / Stanford CME, conf. 67N69WJXBWY. Abstract title, co-authors, panel name and proceedings status still needed.',
    },
  ],

  // "Completed January 2026" — v5 doesn't give an exact day, so this uses
  // the 1st as the earliest-plausible date rather than guessing a later
  // one, which would understate post_degree_hours.
  degree_completed_on: '2026-01-01',
  full_time_hours_per_month: 173.33,
}

const { data, error } = await admin.from('profile_snapshots').insert(snapshot).select('id, version').single()
if (error) {
  console.error('Insert failed:', error.message)
  process.exit(1)
}
console.log('Inserted profile_snapshots row:', data)
