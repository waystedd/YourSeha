/**
 * Calendar / chart date helpers — avoid `toISOString().slice(0, 10)` for local calendar
 * cells (UTC shift makes dates appear one day wrong in non-UTC timezones).
 */
export function toLocalDateString(date) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Today in local calendar (YYYY-MM-DD). */
export function todayLocalDateString() {
  return toLocalDateString(new Date())
}

/**
 * Normalize journal entry `date` field to YYYY-MM-DD for comparison (handles ISO strings with time).
 */
export function normalizeDateKey(raw) {
  if (!raw || typeof raw !== "string") return ""
  const s = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s.slice(0, 10)
  return toLocalDateString(d)
}
