# YourSeha — Full Deployment Guide
## From code to live public website in ~30 minutes

---

## STEP 1 — Create a Supabase Project (Database + Auth)

1. Go to **https://supabase.com** → Sign up (free)
2. Click **"New Project"**
   - Name: `yourseha`
   - Password: save this somewhere safe
   - Region: pick closest to Qatar (e.g. Middle East or EU)
3. Wait ~2 minutes for it to set up
4. Go to **Settings → API**
5. Copy these two values — you'll need them:
   - **Project URL** → looks like `https://abcdef.supabase.co`
   - **anon public key** → long string starting with `eyJ...`

---

## STEP 2 — Run the Database Schema

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open the file `supabase/schema.sql` from this project
4. Paste the entire contents into the SQL editor
5. Click **"Run"** (green button)
6. You should see "Success. No rows returned"

This creates all tables, security policies, and seed data (demo psychologists + resources).

---

## STEP 3 — Enable Google Sign-In (Optional)

1. In Supabase → **Authentication → Providers → Google**
2. Enable it
3. Go to **https://console.cloud.google.com**
4. Create credentials → OAuth 2.0 → Web Application
5. Authorized redirect URI: `https://your-project-id.supabase.co/auth/v1/callback`
6. Paste the Client ID + Secret into Supabase

---

## STEP 4 — Set Up File Storage (for profile photos)

1. In Supabase → **Storage**
2. Click **"New Bucket"**
   - Name: `uploads`
   - Public: ✅ Yes
3. Done — profile photos will now upload to Supabase Storage

---

## STEP 5 — Add Environment Variables

1. In this project folder, create a file called `.env`
2. Paste this content (with YOUR values from Step 1):

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## STEP 6 — Push to GitHub

1. Go to **https://github.com** → New Repository
   - Name: `yourseha`
   - Private or Public (your choice)
2. Open terminal/command prompt in this project folder:

```bash
git init
git add .
git commit -m "Initial commit - YourSeha with Supabase backend"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/yourseha.git
git push -u origin main
```

---

## STEP 7 — Deploy on Vercel (Get a Public Link)

1. Go to **https://vercel.com** → Sign in with GitHub
2. Click **"Add New Project"**
3. Select your `yourseha` repository
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy**
6. In ~2 minutes → you get a live link like `https://yourseha.vercel.app`

---

## STEP 8 — Add your Vercel URL to Supabase Auth

1. In Supabase → **Authentication → URL Configuration**
2. Set **Site URL** to: `https://yourseha.vercel.app`
3. Add to **Redirect URLs**: `https://yourseha.vercel.app/**`

---

## ✅ Your website is now live!

**Architecture:**
- Frontend: Vercel (auto-deploys on every GitHub push)
- Database: Supabase PostgreSQL
- Auth: Supabase Auth (email + Google)
- File storage: Supabase Storage
- Real-time: Supabase Realtime (chat messages update live)

**Tables created:**
- `profiles` — user accounts (caregivers + psychologists)
- `psychologists` — public psychologist directory
- `appointments` — booking system
- `reminders` — personal reminders
- `community_posts` — social feed
- `comments` — post comments
- `community_groups` — support groups
- `resources` — wellness content
- `conversations` — messaging threads
- `messages` — individual messages
- `journal_entries` — mood journaling
- `wellness_goals` — goal tracking
- `notifications` — notification system
- `saved_psychologists` — bookmarked doctors
- `session_notes` — psychologist notes

---

## Need help? 
Message in the Claude chat and I'll walk you through any step.
