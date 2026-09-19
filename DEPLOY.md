# ATLAS — Deploy Guide

## What's inside
- Next.js 15 app with 7 AI agents, draggable Kanban tracker, 24 universities
- Secure API routes (CometAPI key never exposed to browser)
- Streaming responses (text appears word by word)
- localStorage persistence for Kanban tracker
- Ready to deploy on Vercel in 5 minutes

## Step 1 — Push to GitHub
```bash
cd atlas
git init
git add .
git commit -m "ATLAS v1 — full production build"
git remote add origin https://github.com/YOUR_USERNAME/atlas-app.git
git push -u origin main
```

## Step 2 — Deploy on Vercel
1. Go to vercel.com → New Project → Import GitHub repo
2. Framework: Next.js (auto-detected)
3. Click Deploy

## Step 3 — Add Environment Variables in Vercel
Go to: Project → Settings → Environment Variables

| Variable | Value |
|----------|-------|
| COMET_API_KEY | (get from cometapi.com dashboard — rotate the old key first, it was committed in plaintext here before 15 Sep 2026) |
| COMET_API_URL | https://api.cometapi.com/v1/messages |
| NEXT_PUBLIC_SUPABASE_URL | (get from supabase.com) |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | (get from supabase.com) |
| RESEND_API_KEY | (get from resend.com) |
| EMAIL_FROM | cto@clincell.org |
| SERPER_API_KEY | (get from serper.dev) |

## Step 4 — Custom Domain
Vercel → Domains → Add → atlas.clincell.org
Add CNAME record in DNS: atlas → cname.vercel-dns.com

## Step 5 — Supabase Database
1. Create free project at supabase.com
2. Go to SQL Editor
3. Copy and run the SQL from lib/supabase.ts (the schema in the comments)

## All 7 AI Agents
1. Professor Discovery — finds professors by research area
2. CV Customizer — tailors your CV for each professor
3. Email Writer — CTO-framed outreach emails
4. SOP Generator — Statement of Purpose per university
5. Follow-Up — follow-up emails after no reply
6. Reply Analyzer — sentiment + next steps from professor replies
7. Interview Prep — full briefing before professor calls

## Monthly Cost
- Vercel: $0
- Supabase: $0 (free tier)
- CometAPI: ~$5-20 (per usage)
- Resend: $0 (3,000 emails/month free)
- Serper: $0 (free tier)
Total: ~$0-20/month
