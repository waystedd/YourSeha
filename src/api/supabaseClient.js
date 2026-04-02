import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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
}

const FIELD_MAP = {
  created_date: "created_at",
  updated_date: "updated_at",
}

const USER_OWNED = new Set([
  "appointments","reminders","community_posts","community_groups",
  "notifications","resources","conversations","messages","comments",
  "journal_entries","wellness_goals","saved_psychologists","session_notes",
])

const AUTHOR_TABLES = new Set(["community_posts","comments"])

function parseSort(sort) {
  if (!sort) return null
  const desc = sort.startsWith("-")
  const raw  = desc ? sort.slice(1) : sort
  const col  = FIELD_MAP[raw] || raw
  return { column: col, ascending: !desc }
}

function clean(data) {
  const out = {}
  for (const [k, v] of Object.entries(data || {})) {
    if (v === undefined) continue
    out[FIELD_MAP[k] || k] = v
  }
  delete out.conditionInput
  delete out.created_by
  delete out.created_by_id
  delete out.sender_email
  delete out.sender_key
  delete out.last_message_time   // legacy alias — drop it
  delete out.psychologist_id_str
  // FIX: keep user_email & other_user_* — they are real columns in the schema
  return out
}

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

function makeEntity(entityName) {
  const table = TABLE_MAP[entityName] || entityName.toLowerCase()

  return {
    async list(sort, limit = 100) {
      let q = supabase.from(table).select("*").limit(limit)
      const s = parseSort(sort)
      if (s) q = q.order(s.column, { ascending: s.ascending })
      return check(await q) || []
    },

    async filter(where = {}, sort, limit = 100) {
      let q = supabase.from(table).select("*").limit(limit)

      for (const [k, v] of Object.entries(where)) {
        const col = FIELD_MAP[k] || k
        if (Array.isArray(v)) q = q.contains(col, v)
        else q = q.eq(col, v)
      }

      const s = parseSort(sort)
      if (s) q = q.order(s.column, { ascending: s.ascending })
      return check(await q) || []
    },

    async create(data) {
      const uid = await getCurrentUserId()
      const payload = clean(data)

      if (uid && USER_OWNED.has(table) && !payload.user_id) {
        payload.user_id = uid
      }
      if (uid && AUTHOR_TABLES.has(table) && !payload.author_id) {
        payload.author_id = uid
      }
      if (table === "conversations" && uid) {
        if (!payload.participant_a) payload.participant_a = uid
        // FIX: participant_b must be set — use other_user_id if provided, else uid as fallback
        if (!payload.participant_b) {
          payload.participant_b = payload.other_user_id || uid
        }
      }
      if (table === "messages" && uid && !payload.sender_id) {
        payload.sender_id = uid
      }
      // FIX: community_groups — set created_by
      if (table === "community_groups" && uid && !payload.created_by) {
        payload.created_by = uid
      }

      const result = check(await supabase.from(table).insert(payload).select().single())
      return { ...result, created_date: result.created_at, updated_date: result.updated_at }
    },

    async update(id, data) {
      const payload = clean(data)
      payload.updated_at = new Date().toISOString()

      if (table === "conversations") {
        // FIX: map legacy unread_count → split fields only when explicitly passed
        if ("unread_count" in data) {
          payload.unread_count_a = data.unread_count
          payload.unread_count_b = data.unread_count
          delete payload.unread_count
        }
        // FIX: last_message_time → last_message_at
        if ("last_message_time" in data) {
          payload.last_message_at = new Date().toISOString()
          delete payload.last_message_time
        }
      }

      const result = check(
        await supabase.from(table).update(payload).eq("id", id).select().single()
      )
      return { ...result, created_date: result.created_at, updated_date: result.updated_at }
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

async function getProfile(userId) {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
  if (!data) return null
  return { ...data, created_date: data.created_at, updated_date: data.updated_at }
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
      // FIX: clean the patch so legacy/virtual fields don't cause DB errors
      const payload = {}
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) continue
        payload[FIELD_MAP[k] || k] = v
      }
      payload.updated_at = new Date().toISOString()
      const { data, error } = await supabase
        .from("profiles").update(payload).eq("id", user.id).select().single()
      if (error) throw new Error(error.message)
      return { ...data, created_date: data.created_at }
    },

    async signIn({ email, password }) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
      return getProfile(data.user.id)
    },

    async signUp({ full_name, email, password, role = "user" }) {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name } },
      })
      if (error) throw new Error(error.message)
      await new Promise((r) => setTimeout(r, 900))
      await supabase.from("profiles").update({
        full_name,
        role,
        role_selected: true,
        onboarding_completed: role !== "psychologist",
        profile_completed: role !== "psychologist",
        updated_at: new Date().toISOString(),
      }).eq("id", data.user.id)
      return getProfile(data.user.id)
    },

    async signInWithGoogle() {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/Home` },
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
          const file_url = await new Promise((res, rej) => {
            const r = new FileReader()
            r.onload = () => res(String(r.result || ""))
            r.onerror = () => rej(new Error("Failed to read file"))
            r.readAsDataURL(file)
          })
          return { file_url }
        }
        const { data } = supabase.storage.from("uploads").getPublicUrl(path)
        return { file_url: data.publicUrl }
      },
      async SendEmail() { return true },
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
  },
}
