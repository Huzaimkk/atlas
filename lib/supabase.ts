import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/*
=== SUPABASE SQL SCHEMA — Run this in Supabase SQL Editor ===

-- Professors / contacts table
create table professors (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  university text not null,
  department text,
  email text,
  research_focus text,
  recent_paper text,
  fit_score integer default 5,
  stage text default 'identified',
  notes text,
  created_at timestamptz default now(),
  last_contacted timestamptz
);

-- Email log
create table email_logs (
  id uuid default gen_random_uuid() primary key,
  professor_id uuid references professors(id),
  professor_name text,
  university text,
  subject text,
  body text,
  sent_at timestamptz default now(),
  status text default 'draft'
);

-- CV versions
create table cv_versions (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text not null,
  professor_context text,
  content text not null,
  created_at timestamptz default now()
);

-- SOP versions
create table sop_versions (
  id uuid default gen_random_uuid() primary key,
  university text not null,
  program text not null,
  professor text,
  word_count integer,
  content text not null,
  created_at timestamptz default now()
);

-- GRE tracker
create table gre_sessions (
  id uuid default gen_random_uuid() primary key,
  session_date date not null,
  quant_score integer,
  verbal_score integer,
  awa_score numeric(2,1),
  notes text,
  created_at timestamptz default now()
);

-- Enable RLS (Row Level Security) - run for each table
alter table professors enable row level security;
alter table email_logs enable row level security;
alter table cv_versions enable row level security;
alter table sop_versions enable row level security;
alter table gre_sessions enable row level security;

-- Allow all operations for now (tighten later with auth)
create policy "Allow all" on professors for all using (true);
create policy "Allow all" on email_logs for all using (true);
create policy "Allow all" on cv_versions for all using (true);
create policy "Allow all" on sop_versions for all using (true);
create policy "Allow all" on gre_sessions for all using (true);

*/
