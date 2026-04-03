/**
 * Mirrors server-side slot generation in supabaseClient.syncPsychologistAvailabilityFromSchedule
 * so caregivers can see (and book) times when JSON exists but DB rows are missing or RLS-limited.
 */

function parseAvailabilityNotes(raw) {
  const empty = {
    workDays: [],
    workStart: '08:00',
    workEnd: '14:00',
    slotIntervalMinutes: 30,
    caregiverDurationMinutes: 120,
  }
  if (!raw) return empty
  try {
    const j = JSON.parse(raw)
    if (j && typeof j === 'object') {
      const si = Number(j.slotIntervalMinutes) || 30
      const cd = Number(j.caregiverDurationMinutes) || 120
      return {
        workDays: Array.isArray(j.workDays) ? j.workDays : [],
        workStart: j.workStart || '08:00',
        workEnd: j.workEnd || '14:00',
        slotIntervalMinutes: si,
        caregiverDurationMinutes: cd,
      }
    }
  } catch {
    /* legacy plain text */
  }
  return empty
}

const DAY_ID_TO_JS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }

/**
 * @returns {{ date: string, time: string }[]}  date/time as YYYY-MM-DD and HH:mm
 */
export function generateOpenSlotsFromAvailabilityNotes(rawNotes, horizonDays = 56) {
  const p = parseAvailabilityNotes(rawNotes)
  const workDays = p.workDays
  if (!workDays.length) return []

  const slotInterval = Math.max(15, Number(p.slotIntervalMinutes) || 30)
  const careMin = Math.max(15, Number(p.caregiverDurationMinutes) || 120)
  const activeJsDays = new Set(workDays.map((id) => DAY_ID_TO_JS[id]).filter((n) => n != null))

  const parseHM = (s) => {
    const parts = String(s || '0:0').split(':')
    const h = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10)
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
  }
  const fmtHM = (totalMin) => {
    const h = Math.floor(totalMin / 60) % 24
    const m = totalMin % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const startM = parseHM(p.workStart)
  const endM = parseHM(p.workEnd)
  if (endM <= startM) return []

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const out = []
  const seen = new Set()

  for (let d = 0; d < horizonDays; d++) {
    const cur = new Date(today)
    cur.setDate(cur.getDate() + d)
    if (!activeJsDays.has(cur.getDay())) continue

    const y = cur.getFullYear()
    const mo = String(cur.getMonth() + 1).padStart(2, '0')
    const da = String(cur.getDate()).padStart(2, '0')
    const dateStr = `${y}-${mo}-${da}`

    for (let t = startM; t + careMin <= endM; t += slotInterval) {
      const timeStr = fmtHM(t)
      const key = `${dateStr}|${timeStr}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ date: dateStr, time: timeStr })
    }
  }

  return out
}
