# FBM Studio - Vercel Deployment Guide

## Prerequisites

- GitHub repository connected to Vercel
- Vercel **Pro plan** (recommended) for 60s function timeout
  - Hobby plan: 10s max (AI calls may timeout)
  - Pro plan: 60s max (sufficient for all AI calls)

---

## Environment Variables

Set these in **Vercel Dashboard > Project > Settings > Environment Variables**:

| Variable | Type | Value | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | `https://rcbzgononcspqtthhvfy.supabase.co` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | `eyJhbGci...` | Supabase anonymous key |
| `ANTHROPIC_API_KEY` | Secret | `sk-ant-api03-...` | Claude API key (server-only) |
| `GOOGLE_AI_API_KEY` | Secret | `AIzaSy...` | Google AI / Gemini key (server-only) |

### Important:
- `NEXT_PUBLIC_*` variables are exposed to the browser - this is expected for Supabase client
- `ANTHROPIC_API_KEY` and `GOOGLE_AI_API_KEY` are **server-side only** - never exposed to browser
- Set all variables for **Production**, **Preview**, and **Development** environments

---

## Deployment Steps

### 1. Connect Repository
```
1. Go to https://vercel.com/new
2. Import the GitHub repository: davidpo79/FBM-SYSYEM
3. Framework Preset: Next.js (auto-detected)
4. Root Directory: ./ (default)
5. Build Command: npm run build (default)
6. Output Directory: .next (default)
```

### 2. Set Environment Variables
```
1. Before first deploy, go to Settings > Environment Variables
2. Add all 4 variables from the table above
3. Make sure to set them for all environments (Production + Preview + Development)
```

### 3. Deploy
```
1. Click "Deploy"
2. Wait for build to complete (~30-60 seconds)
3. Verify the deployment URL works
```

### 4. Custom Domain (Optional)
```
1. Go to Settings > Domains
2. Add your custom domain
3. Follow Vercel's DNS instructions
```

---

## Supabase Configuration

### Required Table: `projects`

```sql
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  answers JSONB NOT NULL,
  user_name TEXT NOT NULL,
  answers_map JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Users can only see their own projects
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Required Storage Bucket: `creatives`

```
1. Go to Supabase Dashboard > Storage
2. Create bucket: "creatives"
3. Set to Public
4. Add policy: Allow authenticated users to upload
```

### Auth Configuration

```
1. Go to Supabase Dashboard > Authentication > Providers
2. Enable Email provider
3. Disable "Confirm email" for testing (enable for production)
```

---

## Function Timeouts

AI-powered API routes need extended timeouts (configured in `vercel.json`):

| Route | Max Duration | Why |
|---|---|---|
| `/api/generate-strategy` | 60s | Claude generates 3000+ word document |
| `/api/generate-niches` | 60s | Claude analyzes strategy + identifies niches |
| `/api/generate-pains` | 60s | Claude deep pain analysis (1500+ words) |
| `/api/generate-scripts` | 60s | Claude writes 3 video scripts |
| `/api/suggest-creative` | 30s | Claude suggests creative metadata |
| `/api/generate-creatives` | 60s | Gemini image generation + Supabase upload |

> **Note:** Vercel Hobby plan max is 10s. You need **Pro plan** ($20/mo) for 60s timeout.

---

## Post-Deploy Checklist

### Smoke Test
- [ ] Homepage loads (`/`)
- [ ] Login page loads (`/login`)
- [ ] Signup page loads (`/signup`)
- [ ] Can create account via Supabase Auth
- [ ] Dashboard loads after login (`/dashboard`)
- [ ] "New Project" button navigates to questionnaire

### Full Flow Test
- [ ] Complete 10-question questionnaire
- [ ] Submit redirects to `/results/{id}`
- [ ] Strategy generates without timeout
- [ ] 3 niches appear for selection
- [ ] Pain analysis generates after niche selection
- [ ] 3 scripts generate
- [ ] "Create Creative" flow works (suggest + editor + generate)
- [ ] Generated image appears
- [ ] PDF download works (strategy, pains, scripts)
- [ ] "Download All as ZIP" works

### API Health Check
```bash
# Test from terminal (replace URL with your Vercel deployment):
curl -X POST https://your-app.vercel.app/api/generate-strategy \
  -H "Content-Type: application/json" \
  -d '{"userName":"test","answers":{"1":"test answer for question 1 that is long enough"}}'
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| "API key must be set" error | Check env vars are set in Vercel dashboard |
| Function timeout (504) | Upgrade to Vercel Pro plan |
| Supabase auth not working | Check NEXT_PUBLIC_SUPABASE_URL and ANON_KEY |
| Images not uploading | Verify "creatives" bucket exists and is public |
| Hebrew PDF looks broken | Font downloads from Google CDN - check network |
| Build fails | Run `npm run build` locally first to debug |

---

## Architecture Overview

```
Browser (Client)
  ├── /dashboard          → List projects (Supabase query)
  ├── /questionnaire      → 10-step form (localStorage + Supabase insert)
  └── /results/[id]       → AI pipeline orchestrator
        │
        ├── POST /api/generate-strategy   → Claude Opus 4
        ├── POST /api/generate-niches     → Claude Opus 4
        ├── POST /api/generate-pains      → Claude Opus 4
        ├── POST /api/generate-scripts    → Claude Opus 4
        ├── POST /api/suggest-creative    → Claude Opus 4
        └── POST /api/generate-creatives  → Gemini 2.0 Flash → Supabase Storage
```

## Tech Stack

- **Framework:** Next.js 16.1.6 (App Router)
- **AI Text:** Claude Opus 4 (`@anthropic-ai/sdk`)
- **AI Image:** Gemini 2.0 Flash (`@google/genai`)
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **PDF Export:** jsPDF with Rubik Hebrew font
- **ZIP Export:** JSZip
- **Styling:** Tailwind CSS 4
- **Language:** TypeScript 5
