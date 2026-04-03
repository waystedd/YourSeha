# YourSeha — Full Deployment Guide
## From code to live public website

## Step 1 — Create a Supabase project

1. Go to Supabase and create a new project.
2. Save your database password.
3. In **Settings → API**, copy:
   - Project URL
   - anon public key

## Step 2 — Run the database SQL

For a fresh project:
1. Open **SQL Editor** in Supabase.
2. Paste and run `supabase/schema.sql`.

If you already used the earlier patched package before this final update:
1. Run `supabase/migrations/20260402_booking_updates.sql` after the original schema.

This final package includes:
- direct psychologist signup
- login-required main app access
- Zoom-based appointment flow
- no-payment booking confirmation flow
- slot release on cancellation
- quoted session prices stored on bookings

## Step 3 — Enable Google sign-in (optional)

1. In Supabase → **Authentication → Providers → Google**
2. Enable Google.
3. Create OAuth credentials in Google Cloud.
4. Use the Supabase callback URL shown in the provider settings.

## Step 4 — Create storage bucket

1. Open **Storage** in Supabase.
2. Create a public bucket named `uploads`.

## Step 5 — Add environment variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 6 — Install dependencies locally

```bash
npm install
```

## Step 7 — Run locally

```bash
npm run dev
```

## Step 8 — Deploy to Vercel

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Add the same two environment variables in Vercel.
4. Deploy.

## Step 9 — Update Supabase auth URLs

In **Authentication → URL Configuration** set:
- **Site URL** = your Vercel domain
- **Redirect URLs** = your Vercel domain patterns

## Notes for launch

- Zoom links are entered by psychologists from the appointments dashboard.
- Bookings currently show price only. No online payment is connected yet.
- About, Terms, Privacy, Disclaimer, and Contact are placeholder pages and should be replaced before public launch.
