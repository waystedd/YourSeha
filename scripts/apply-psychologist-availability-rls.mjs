/**
 * Applies supabase/migrations/20260403_psychologist_availability_rls.sql using Postgres.
 *
 * Requires DATABASE_URL (or SUPABASE_DATABASE_URL) in .env:
 * Supabase → Project Settings → Database → Connection string → URI
 * Use "Direct connection" (port 5432) and paste the full URL including the password.
 *
 *   npm run db:apply-rls
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const text = fs.readFileSync(filePath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
loadEnvFile(path.join(root, '.env'))
const migrationPath = path.join(root, 'supabase', 'migrations', '20260403_psychologist_availability_rls.sql')

const url = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL

if (!url) {
  console.error(`
Missing DATABASE_URL (or SUPABASE_DATABASE_URL).

1. Open Supabase → Project Settings → Database
2. Under "Connection string" choose URI, mode "Session" or "Direct"
3. Copy the string (it includes your database password)
4. Add to .env:
   DATABASE_URL=postgresql://postgres.[ref]:YOUR_PASSWORD@...
5. Run: npm run db:apply-rls
`)
  process.exit(1)
}

const sql = fs.readFileSync(migrationPath, 'utf8')

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
})

try {
  await client.connect()
  await client.query(sql)
  console.log('Success: psychologist_availability RLS policies are applied.')
} catch (e) {
  console.error('Migration failed:', e.message || e)
  process.exit(1)
} finally {
  await client.end().catch(() => {})
}
