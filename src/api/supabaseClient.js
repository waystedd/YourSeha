import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const PENDING_SIGNUP_KEY = "yourseha_pending_signup"

function readPendingSignup() {
  try {
    const raw = localStorage.getItem(PENDING_SIGNUP_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writePendingSignup(pending) {
  try {
    if (pending) localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(pending))
    else localStorage.removeItem(PENDING_SIGNUP_KEY)
  } catch {
    /* ignore */
  }
}

async function bootstrapProfileFromSignup(userId, { full_name, role = "user" }) {
  await new Promise((resolve) => setTimeout(resolve, 900))
  await supabase
    .from("profiles")
    .update({
      full_name,
      role,
      role_selected: true,
      onboarding_completed: role !== "psychologist",
      profile_completed: role !== "psychologist",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (role === "psychologist") {
    await syncPsychologistDirectory({ full_name, role }, userId)
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function check(result) {
  if (result.error) throw new Error(result.error.message)
  return result.data
}

const TABLE_MAP = {
  User: "profiles",
  Appointment: "appointments",
  Reminder: "reminders",
  CommunityPost: "community_posts",
  CommunityGroup: "community_groups",
  Notification: "notifications",
  Resource: "resources",
  Conversation: "conversations",
  Message: "messages",
  Comment: "comments",
  JournalEntry: "journal_entries",
  WellnessGoal: "wellness_goals",
  SavedPsychologist: "saved_psychologists",
  SessionNote: "session_notes",
  Psychologist: "psychologists",
  PsychologistAvailability: "psychologist_availability",
}

const FIELD_MAP = {
  created_date: "created_at",
  updated_date: "updated_at",
  last_message_time: "last_message_at",
}

function parseSort(sort) {
  if (!sort) return null
  const desc = sort.startsWith("-")
  const raw = desc ? sort.slice(1) : sort
  const col = FIELD_MAP[raw] || raw
  return { column: col, ascending: !desc }
}

function clean(data) {
  const out = {}
  for (const [k, v] of Object.entries(data || {})) {
    if (v === undefined) continue
    out[FIELD_MAP[k] || k] = v
  }
  delete out.conditionInput
  delete out.confirm_password
  return out
}

async function getCurrentAuthUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
}

async function getProfile(userId) {
  if (!userId) return null
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
  if (!data) return null
  return {
    ...data,
    created_date: data.created_at,
    updated_date: data.updated_at,
  }
}

async function getCurrentProfile() {
  const user = await getCurrentAuthUser()
  return getProfile(user?.id)
}

async function resolveProfileByEmail(email) {
  if (!email) return null
  const { data } = await supabase.from("profiles").select("*").eq("email", email).maybeSingle()
  return data ?? null
}

async function propagateAuthorIdentity(userId) {
  if (!userId) return
  const profile = await getProfile(userId)
  if (!profile) return
  const row = {
    author_name: profile.full_name || "Anonymous",
    author_photo: profile.profile_photo || "",
    author_email: profile.email || "",
  }
  await supabase.from("community_posts").update(row).eq("author_id", userId)
  await supabase.from("comments").update(row).eq("author_id", userId)
}

async function resolveIds(values = [], currentProfile = null) {
  const ids = []
  for (const value of values) {
    if (!value) continue
    if (typeof value !== "string") continue
    if (UUID_RE.test(value)) {
      ids.push(value)
      continue
    }
    if (currentProfile && (value === currentProfile.email || value === currentProfile.id)) {
      ids.push(currentProfile.id)
      continue
    }
    if (value.startsWith("psych:") && UUID_RE.test(value.slice(5))) {
      ids.push(value.slice(5))
      continue
    }
    if (value.includes("@")) {
      const p = await resolveProfileByEmail(value)
      if (p?.id) ids.push(p.id)
    }
  }
  return [...new Set(ids)]
}

function formatTimeShort(isoLike) {
  if (!isoLike) return ""
  try {
    return new Date(isoLike).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

function normalizeRow(table, row, currentProfile = null) {
  if (!row) return row
  const base = {
    ...row,
    created_date: row.created_at,
    updated_date: row.updated_at,
  }

  if (table === "appointments") {
    return {
      ...base,
      type: row.session_type,
      created_by: row.user_email,
    }
  }

  if (table === "community_posts") {
    return {
      ...base,
      created_by: row.author_email || row.author_id,
      created_by_id: row.author_id,
    }
  }

  if (table === "comments") {
    return {
      ...base,
      created_by: row.author_email || row.author_id,
      created_by_id: row.author_id,
    }
  }

  if (table === "conversations") {
    const unreadCount = currentProfile?.id
      ? row.participant_a === currentProfile.id
        ? row.unread_count_a || 0
        : row.participant_b === currentProfile.id
          ? row.unread_count_b || 0
          : 0
      : 0
    return {
      ...base,
      unread_count: unreadCount,
      last_message_time: row.last_message_at ? formatTimeShort(row.last_message_at) : "",
    }
  }

  if (table === "messages") {
    return {
      ...base,
      sender_key: row.sender_id,
    }
  }

  return base
}

async function syncPsychologistDirectory(patch, userId) {
  const current = await getProfile(userId)
  const merged = { ...(current || {}), ...(patch || {}) }
  if (merged.role !== "psychologist") return

  const record = {
    user_id: userId,
    name: merged.full_name || merged.name || "Psychologist",
    photo: merged.profile_photo || "",
    specialty: merged.specialty || null,
    bio: merged.bio || null,
    available_now: false,
    online_available: true,
    location: merged.location || null,
    consultation_fee: merged.consultation_fee ?? 200,
    is_licensed: !!merged.is_licensed,
    languages: Array.isArray(merged.languages) && merged.languages.length ? merged.languages : ["Arabic", "English"],
    years_experience: merged.years_experience ?? null,
  }

  const existing = await supabase.from("psychologists").select("id").eq("user_id", userId).maybeSingle()
  if (existing.data?.id) {
    await supabase.from("psychologists").update(record).eq("id", existing.data.id)
  } else {
    await supabase.from("psychologists").insert(record)
  }
}

async function buildFilterQuery(table, where, limit = 100) {
  const currentProfile = await getCurrentProfile()
  let q = supabase.from(table).select("*").limit(limit)

  for (const [rawKey, rawValue] of Object.entries(where || {})) {
    let key = FIELD_MAP[rawKey] || rawKey
    let value = rawValue

    if (table === "resources" && key === "created_by" && typeof value === "string" && value.includes("@")) {
      value = currentProfile?.email === value ? currentProfile.id : (await resolveProfileByEmail(value))?.id || value
    }

    if (table === "saved_psychologists" && key === "user_email" && typeof value === "string") {
      key = "user_id"
      value = currentProfile?.email === value ? currentProfile.id : (await resolveProfileByEmail(value))?.id || value
    }

    if (value === undefined) continue
    if (value === null) {
      q = q.is(key, null)
      continue
    }
    if (Array.isArray(value)) q = q.contains(key, value)
    else q = q.eq(key, value)
  }

  return { q, currentProfile }
}

function makeEntity(entityName) {
  const table = TABLE_MAP[entityName] || entityName.toLowerCase()

  return {
    async list(sort, limit = 100) {
      const currentProfile = await getCurrentProfile()
      let q = supabase.from(table).select("*").limit(limit)
      const s = parseSort(sort)
      if (s) q = q.order(s.column, { ascending: s.ascending })
      const rows = check(await q) || []
      return rows.map((row) => normalizeRow(table, row, currentProfile))
    },

    async filter(where = {}, sort, limit = 100) {
      const built = await buildFilterQuery(table, where, limit)
      let q = built.q
      const s = parseSort(sort)
      if (s) q = q.order(s.column, { ascending: s.ascending })
      const rows = check(await q) || []
      return rows.map((row) => normalizeRow(table, row, built.currentProfile))
    },

    async create(data) {
      const authUser = await getCurrentAuthUser()
      const profile = await getCurrentProfile()
      const payload = clean(data)

      if (table === "appointments") {
        payload.user_id = authUser?.id
        payload.user_email = payload.user_email || profile?.email || null
        if (payload.type && !payload.session_type) payload.session_type = payload.type
        if (payload.session_type === "in_person") payload.session_type = "in-person"
      }

      if (table === "reminders") payload.user_id = authUser?.id

      if (table === "community_posts") {
        payload.author_id = authUser?.id
        payload.author_name = payload.author_name || profile?.full_name || "Anonymous"
        payload.author_photo = payload.author_photo || profile?.profile_photo || ""
        payload.author_email = payload.author_email || profile?.email || ""
        if (payload.post_type === "meetup") payload.post_type = "webinar"
        if (Array.isArray(payload.liked_by)) payload.liked_by = await resolveIds(payload.liked_by, profile)
      }

      if (table === "comments") {
        payload.author_id = authUser?.id
        payload.author_name = payload.author_name || profile?.full_name || "Anonymous"
        payload.author_photo = payload.author_photo || profile?.profile_photo || ""
        payload.author_email = payload.author_email || profile?.email || ""
      }

      if (table === "community_groups") {
        payload.created_by = authUser?.id
        if (Array.isArray(payload.members)) payload.members = await resolveIds(payload.members, profile)
      }

      if (table === "resources") payload.created_by = authUser?.id

      if (table === "conversations") {
        payload.participant_a = authUser?.id
        payload.user_email = payload.user_email || (profile?.role !== "psychologist" ? profile?.email : payload.user_email) || null
        payload.updated_at = new Date().toISOString()
        if (payload.last_message_time && !payload.last_message_at) payload.last_message_at = new Date().toISOString()
        delete payload.last_message_time
        delete payload.unread_count

        if (!payload.participant_b && payload.other_user_id) {
          payload.participant_b = payload.other_user_id
        }
        if (!payload.participant_b && payload.other_user_email) {
          const otherProfile = await resolveProfileByEmail(payload.other_user_email)
          if (otherProfile?.id) payload.participant_b = otherProfile.id
        }
        if (!payload.participant_b && payload.psychologist_id) {
          const psych = check(await supabase.from("psychologists").select("*").eq("id", payload.psychologist_id).single())
          if (psych?.user_id) payload.participant_b = psych.user_id
          if (!payload.title) payload.title = psych?.name || payload.title
        }
        if (!payload.participant_b && profile?.role === "psychologist" && payload.user_email) {
          const otherProfile = await resolveProfileByEmail(payload.user_email)
          if (otherProfile?.id) payload.participant_b = otherProfile.id
        }
      }

      if (table === "messages") {
        payload.sender_id = authUser?.id
        payload.read_by = Array.isArray(payload.read_by)
          ? await resolveIds(payload.read_by, profile)
          : []
        if (authUser?.id && !payload.read_by.includes(authUser.id)) payload.read_by.unshift(authUser.id)
        delete payload.sender_key
        delete payload.sender_email
      }

      if (table === "journal_entries") payload.user_id = authUser?.id
      if (table === "wellness_goals") payload.user_id = authUser?.id

      if (table === "saved_psychologists") {
        payload.user_id = authUser?.id
        payload.user_email = payload.user_email || profile?.email || null
      }

      if (table === "session_notes" && profile?.role === "psychologist") {
        payload.psychologist_id = authUser?.id
      }

      if (table === "psychologists") payload.user_id = authUser?.id
      if (table === "psychologist_availability") {
        payload.created_at = payload.created_at || new Date().toISOString()
        // Do not set user_id here — many schemas only have psychologist_id + date + time.
        delete payload.user_id
      }

      const ins = await supabase.from(table).insert(payload).select()
      if (ins.error) throw new Error(ins.error.message)
      const row = ins.data?.[0]
      if (!row) throw new Error("Insert did not return a row (check RLS and permissions).")
      return normalizeRow(table, row, profile)
    },

    async update(id, data) {
      const profile = await getCurrentProfile()
      const payload = clean(data)
      // Only tables that actually have an updated_at column (others would cause updates to fail silently)
      if (["profiles", "community_posts", "conversations"].includes(table)) {
        payload.updated_at = new Date().toISOString()
      } else {
        delete payload.updated_at
      }

      if (table === "appointments") {
        if (payload.type && !payload.session_type) payload.session_type = payload.type
        if (payload.session_type === "in_person") payload.session_type = "in-person"
      }

      if (table === "community_posts" && Array.isArray(payload.liked_by)) {
        payload.liked_by = await resolveIds(payload.liked_by, profile)
      }

      if (table === "community_groups" && Array.isArray(payload.members)) {
        payload.members = await resolveIds(payload.members, profile)
      }

      if (table === "messages" && Array.isArray(payload.read_by)) {
        payload.read_by = await resolveIds(payload.read_by, profile)
      }

      if (table === "conversations") {
        if (Object.prototype.hasOwnProperty.call(data, "unread_count")) {
          const conv = await supabase.from("conversations").select("*").eq("id", id).maybeSingle()
          if (conv.error) throw new Error(conv.error.message)
          const existing = conv.data
          if (!existing) throw new Error("Conversation not found")
          if (profile?.id && existing.participant_a === profile.id) payload.unread_count_a = data.unread_count
          else if (profile?.id && existing.participant_b === profile.id) payload.unread_count_b = data.unread_count
          else {
            payload.unread_count_a = data.unread_count
            payload.unread_count_b = data.unread_count
          }
          delete payload.unread_count
        }
        if (Object.prototype.hasOwnProperty.call(data, "last_message_time") && !payload.last_message_at) {
          payload.last_message_at = new Date().toISOString()
        }
      }

      const upd = await supabase.from(table).update(payload).eq("id", id).select()
      if (upd.error) throw new Error(upd.error.message)
      let row = upd.data?.[0]
      if (!row) {
        const ref = await supabase.from(table).select("*").eq("id", id).maybeSingle()
        if (!ref.error && ref.data) row = ref.data
      }
      // PostgREST can return 0 rows on UPDATE … RETURNING * when SELECT RLS hides the row even if UPDATE applied.
      if (!row && id) {
        row = { id, ...payload }
      }
      if (!row) {
        throw new Error(
          "Update failed or no row returned. If this persists, check Supabase RLS policies for this table (UPDATE and SELECT).",
        )
      }
      return normalizeRow(table, row, profile)
    },

    async delete(id) {
      check(await supabase.from(table).delete().eq("id", id))
      return true
    },

    subscribe(fn) {
      const channel = supabase
        .channel(`${table}_${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
          fn({ table, data: payload.new || payload.old })
        })
        .subscribe()
      return () => supabase.removeChannel(channel)
    },
  }
}

export const base44 = {
  auth: {
    async me() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      return getProfile(user.id)
    },

    async updateMe(patch) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const payload = clean(patch)
      payload.updated_at = new Date().toISOString()

      const runUpdate = async (body) => {
        const { data: rows, error } = await supabase.from("profiles").update(body).eq("id", user.id).select()
        if (error) throw new Error(error.message)
        let row = rows?.[0]
        if (!row) row = await getProfile(user.id)
        if (!row) throw new Error("Profile update did not return a row (check RLS on profiles).")
        return row
      }

      let data
      try {
        data = await runUpdate(payload)
      } catch (e) {
        const msg = e?.message || ""
        if (msg.includes("gender") && Object.prototype.hasOwnProperty.call(payload, "gender")) {
          const { gender: _g, ...withoutGender } = payload
          data = await runUpdate(withoutGender)
        } else {
          throw e
        }
      }

      await syncPsychologistDirectory(payload, user.id)
      try {
        await propagateAuthorIdentity(user.id)
      } catch {
        /* RLS or missing columns — profile update still succeeded */
      }
      return {
        ...data,
        created_date: data.created_at,
        updated_date: data.updated_at,
      }
    },

    async signIn({ email, password }) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
      return getProfile(data.user.id)
    },

    async signUp({ full_name, email, password, role = "user" }) {
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name },
          emailRedirectTo: origin ? `${origin}/VerifyEmail` : undefined,
        },
      })
      if (error) throw new Error(error.message)

      const user = data.user
      if (!user?.id) throw new Error("Could not create account")

      if (data.session) {
        await bootstrapProfileFromSignup(user.id, { full_name, role })
        return { profile: await getProfile(user.id), needsEmailConfirmation: false }
      }

      writePendingSignup({ full_name, email: user.email || email, role })
      return {
        profile: null,
        needsEmailConfirmation: true,
        email: user.email || email,
      }
    },

    async verifyEmailOtp(email, token) {
      const digits = String(token || "").replace(/\D/g, "")
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: digits,
        type: "email",
      })
      if (error) throw new Error(error.message)
      return data
    },

    async resendSignupEmail(email) {
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: origin ? { emailRedirectTo: `${origin}/VerifyEmail` } : undefined,
      })
      if (error) throw new Error(error.message)
    },

    async updatePsychologistAvailabilityNotes(notesOrMeta) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const { data: row } = await supabase.from("psychologists").select("availability_notes").eq("user_id", user.id).maybeSingle()
      let prev = {}
      if (row?.availability_notes) {
        try {
          const j = JSON.parse(row.availability_notes)
          if (j && typeof j === "object") prev = j
        } catch {
          prev = { scheduleText: String(row.availability_notes) }
        }
      }
      let next
      if (notesOrMeta != null && typeof notesOrMeta === "object" && !Array.isArray(notesOrMeta)) {
        next = { ...prev, ...notesOrMeta, v: 2 }
      } else {
        const trimmed = notesOrMeta != null ? String(notesOrMeta).trim() : ""
        next = { ...prev, scheduleText: trimmed || prev.scheduleText || "", v: 2 }
      }
      const payload = { availability_notes: JSON.stringify(next) }
      try {
        const { error } = await supabase.from("psychologists").update(payload).eq("user_id", user.id)
        if (error) throw error
      } catch (e) {
        throw new Error(e?.message || "Could not save availability")
      }
    },

    /**
     * Rebuilds future bookable rows in `psychologist_availability` from the weekly schedule
     * (called after saving availability notes so caregivers see slots on the psychologist profile).
     */
    async syncPsychologistAvailabilityFromSchedule(schedule) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data: psych, error: psychErr } = await supabase.from("psychologists").select("id").eq("user_id", user.id).maybeSingle()
      if (psychErr) throw new Error(psychErr.message)
      if (!psych?.id) throw new Error("Complete your psychologist profile before saving availability")

      const workDays = Array.isArray(schedule?.workDays) ? schedule.workDays : []
      if (workDays.length === 0) throw new Error("Pick at least one working day")

      const workStart = schedule?.workStart || "08:00"
      const workEnd = schedule?.workEnd || "14:00"
      const slotInterval = Math.max(15, Number(schedule?.slotIntervalMinutes) || 30)
      const careMin = Math.max(15, Number(schedule?.caregiverDurationMinutes) || 120)

      const dayIdToJs = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }
      const activeJsDays = new Set(workDays.map((id) => dayIdToJs[id]).filter((n) => n != null))

      const parseHM = (s) => {
        const parts = String(s || "0:0").split(":")
        const h = parseInt(parts[0], 10)
        const m = parseInt(parts[1], 10)
        return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
      }
      const fmtHM = (totalMin) => {
        const h = Math.floor(totalMin / 60) % 24
        const m = totalMin % 60
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
      }

      const startM = parseHM(workStart)
      const endM = parseHM(workEnd)
      if (endM <= startM) throw new Error("End time must be after start time")

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const y0 = today.getFullYear()
      const m0 = String(today.getMonth() + 1).padStart(2, "0")
      const d0 = String(today.getDate()).padStart(2, "0")
      const todayStr = `${y0}-${m0}-${d0}`

      const horizonDays = 56
      const rows = []
      const seen = new Set()

      for (let d = 0; d < horizonDays; d++) {
        const cur = new Date(today)
        cur.setDate(cur.getDate() + d)
        if (!activeJsDays.has(cur.getDay())) continue

        const y = cur.getFullYear()
        const mo = String(cur.getMonth() + 1).padStart(2, "0")
        const da = String(cur.getDate()).padStart(2, "0")
        const dateStr = `${y}-${mo}-${da}`

        for (let t = startM; t + careMin <= endM; t += slotInterval) {
          const timeStr = fmtHM(t)
          const key = `${dateStr}|${timeStr}`
          if (seen.has(key)) continue
          seen.add(key)
          rows.push({
            psychologist_id: psych.id,
            date: dateStr,
            time: timeStr,
            is_booked: false,
            created_at: new Date().toISOString(),
          })
        }
      }

      if (rows.length === 0) {
        throw new Error(
          "No bookable slots fit in your hours with the current max session length. Shorten the max session length or widen your working window.",
        )
      }

      const del = await supabase
        .from("psychologist_availability")
        .delete()
        .eq("psychologist_id", psych.id)
        .eq("is_booked", false)
        .gte("date", todayStr)

      if (del.error) throw new Error(del.error.message)

      const batchSize = 80
      for (let i = 0; i < rows.length; i += batchSize) {
        const chunk = rows.slice(i, i + batchSize)
        const ins = await supabase.from("psychologist_availability").insert(chunk).select("id")
        if (ins.error) throw new Error(ins.error.message)
      }
    },

    async incrementResourceView(resourceId) {
      if (!resourceId) return
      const { error } = await supabase.rpc("increment_resource_view", { p_resource_id: resourceId })
      if (error) throw new Error(error.message)
    },

    async completePendingSignup() {
      const pending = readPendingSignup()
      if (!pending?.full_name) return null
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return null
      await bootstrapProfileFromSignup(user.id, {
        full_name: pending.full_name,
        role: pending.role || "user",
      })
      writePendingSignup(null)
      return getProfile(user.id)
    },

    async signInWithGoogle() {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/RoleSelection` },
      })
      if (error) throw new Error(error.message)
      return data
    },

    async logout(redirectUrl) {
      await supabase.auth.signOut()
      if (redirectUrl) window.location.assign(redirectUrl)
      return true
    },

    redirectToLogin(returnUrl) {
      window.location.assign(`/SignIn?returnUrl=${encodeURIComponent(returnUrl || "/")}`)
    },
  },

  integrations: {
    Core: {
      async UploadFile({ file }) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Not authenticated")
        const ext = file.name.split(".").pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: true })
        if (error) {
          const fileUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result || ""))
            reader.onerror = () => reject(new Error("Failed to read file"))
            reader.readAsDataURL(file)
          })
          return { file_url: fileUrl }
        }
        const { data } = supabase.storage.from("uploads").getPublicUrl(path)
        return { file_url: data.publicUrl }
      },
      async SendEmail() {
        return true
      },
    },
  },

  entities: {
    User: makeEntity("User"),
    Appointment: makeEntity("Appointment"),
    Reminder: makeEntity("Reminder"),
    CommunityPost: makeEntity("CommunityPost"),
    CommunityGroup: makeEntity("CommunityGroup"),
    Notification: makeEntity("Notification"),
    Resource: makeEntity("Resource"),
    Conversation: makeEntity("Conversation"),
    Message: makeEntity("Message"),
    Comment: makeEntity("Comment"),
    JournalEntry: makeEntity("JournalEntry"),
    WellnessGoal: makeEntity("WellnessGoal"),
    SavedPsychologist: makeEntity("SavedPsychologist"),
    SessionNote: makeEntity("SessionNote"),
    Psychologist: makeEntity("Psychologist"),
    PsychologistAvailability: makeEntity("PsychologistAvailability"),
  },
}
