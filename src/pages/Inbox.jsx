import React, { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { base44 } from "@/api/base44Client"
import { MessageCircle, Search, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

function peerKey(a, b) {
  if (!a || !b) return null
  return [String(a), String(b)].sort().join("|")
}

function getOtherParticipantId(conv, meId) {
  if (!meId) return null
  if (conv.participant_a === meId) return conv.participant_b
  if (conv.participant_b === meId) return conv.participant_a
  return null
}

/** Stable thread key: always prefer the real user-user pair when we can derive the psychologist's auth user id. */
function canonicalInboxKey(conv, meId, psychUserByPsychId) {
  if (!meId) return `id:${conv.id}`
  const other = getOtherParticipantId(conv, meId)
  if (other) return `peer:${peerKey(meId, other)}`
  if (conv.psychologist_id) {
    const uid = psychUserByPsychId.get(conv.psychologist_id)
    if (uid) return `peer:${peerKey(meId, uid)}`
    return `psych:${conv.psychologist_id}`
  }
  return `id:${conv.id}`
}

/** One row per peer; merges unread from duplicate thread rows. */
function mergeConversationsByPeer(conversations, meId, psychUserByPsychId) {
  const buckets = new Map()
  for (const c of conversations) {
    const key = canonicalInboxKey(c, meId, psychUserByPsychId)
    const list = buckets.get(key) || []
    list.push(c)
    buckets.set(key, list)
  }

  const merged = []
  for (const [, list] of buckets) {
    list.sort((a, b) => {
      const ta = new Date(a.updated_at || a.last_message_at || 0).getTime()
      const tb = new Date(b.updated_at || b.last_message_at || 0).getTime()
      return tb - ta
    })
    const primary = list[0]
    const unread = Math.max(...list.map((x) => x.unread_count || 0), 0)
    merged.push({ ...primary, unread_count: unread })
  }
  merged.sort((a, b) => {
    const ta = new Date(a.updated_at || a.last_message_at || 0).getTime()
    const tb = new Date(b.updated_at || b.last_message_at || 0).getTime()
    return tb - ta
  })
  return merged
}

export default function Inbox() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState("all")
  const [search, setSearch] = useState("")
  const [findOpen, setFindOpen] = useState(false)

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try {
        return await base44.auth.me()
      } catch {
        return null
      }
    },
  })

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: () => base44.entities.Conversation.list("-updated_date", 200),
    enabled: !!user?.id,
  })

  const { data: profiles = [] } = useQuery({
    queryKey: ["directoryProfiles"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
    enabled: !!user?.id,
  })

  const profileById = useMemo(() => {
    const m = new Map()
    for (const p of profiles) m.set(p.id, p)
    return m
  }, [profiles])

  const { data: psychologists = [] } = useQuery({
    queryKey: ["psychologists"],
    queryFn: () => base44.entities.Psychologist.list("-rating", 120),
  })
  const psychUserByPsychId = useMemo(() => {
    const m = new Map()
    for (const p of psychologists) {
      if (p.user_id) m.set(p.id, p.user_id)
    }
    return m
  }, [psychologists])
  const { data: savedPsychologists = [] } = useQuery({
    queryKey: ["savedPsychologists", user?.email],
    queryFn: () => base44.entities.SavedPsychologist.filter({ user_email: user?.email }, "-created_date", 100),
    enabled: !!user?.email,
  })

  const inboxRows = useMemo(
    () => mergeConversationsByPeer(conversations, user?.id, psychUserByPsychId),
    [conversations, user?.id, psychUserByPsychId],
  )

  const displayTitle = (conv) => {
    const me = user?.id
    let other = getOtherParticipantId(conv, me)
    if (!other && conv.psychologist_id) {
      other = psychUserByPsychId.get(conv.psychologist_id)
    }
    if (other) {
      const name = profileById.get(other)?.full_name?.trim()
      if (name) return name
    }
    return conv.title || "Conversation"
  }

  const unreadCount = useMemo(() => inboxRows.filter((c) => (c.unread_count || 0) > 0).length, [inboxRows])
  const following = user?.following || []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return inboxRows.filter((c) => {
      const matchTab = tab === "all" || (tab === "unread" && (c.unread_count || 0) > 0)
      if (!matchTab) return false
      if (!q) return true
      const name = displayTitle(c).toLowerCase()
      const fallback = (c.title || "").toLowerCase()
      return name.includes(q) || fallback.includes(q)
    })
  }, [inboxRows, search, tab, profileById, user?.id, psychUserByPsychId])

  const connectPsychologist = useMutation({
    mutationFn: async (p) => {
      const hasSaved = savedPsychologists.some((s) => s.psychologist_id === p.id)
      if (!hasSaved) {
        await base44.entities.SavedPsychologist.create({ user_email: user?.email, psychologist_id: p.id })
      }
      const psychUserId = p.user_id
      const existing = conversations.find((c) => {
        if (!user?.id || !psychUserId) return false
        const pk = peerKey(user.id, psychUserId)
        if (peerKey(c.participant_a, c.participant_b) === pk) return true
        if (c.psychologist_id === p.id) return true
        return false
      })
      if (existing) return existing
      return await base44.entities.Conversation.create({
        title: p.name,
        psychologist_id: p.id,
        user_email: user?.email,
        last_message: "Connected. Start messaging.",
        last_message_time: "now",
        unread_count: 0,
      })
    },
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["savedPsychologists", user?.email] })
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] })
      toast.success("Connected successfully")
      if (conv?.id) navigate(`/Chat?id=${conv.id}`)
    },
  })

  const connectCaregiver = useMutation({
    mutationFn: async (targetUser) => {
      const currentFollowing = user?.following || []
      if (!currentFollowing.includes(targetUser.id)) {
        await base44.entities.User.update(user.id, { following: [...currentFollowing, targetUser.id] })
      }
      const want = peerKey(user?.id, targetUser.id)
      const existing = conversations.find((c) => canonicalInboxKey(c, user?.id, psychUserByPsychId) === `peer:${want}`)
      if (existing) return existing
      return await base44.entities.Conversation.create({
        title: targetUser.full_name,
        other_user_id: targetUser.id,
        other_user_email: targetUser.email,
        user_email: user?.email,
        last_message: "Connected. Say hello!",
        last_message_time: "now",
        unread_count: 0,
      })
    },
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      queryClient.invalidateQueries({ queryKey: ["directoryProfiles"] })
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] })
      toast.success("Connected successfully")
      if (conv?.id) navigate(`/Chat?id=${conv.id}`)
    },
  })

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-[#FFE5D9] flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-[#E8907C]" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Sign in to message</h2>
          <p className="text-gray-500 mb-6">Please sign in to access your messages.</p>
          <Button
            onClick={() => base44.auth.redirectToLogin("/Inbox")}
            className="bg-gradient-to-r from-[#F4A896] to-[#E8907C] text-white rounded-2xl px-8"
          >
            Sign In
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-[#E8907C]" /> Messages
          </h1>
          <Button onClick={() => setFindOpen(true)} variant="outline" size="sm" className="rounded-xl border-[#FFE5D9] text-[#E8907C] hover:bg-[#FFF8F6] text-xs">
            <Users className="w-4 h-4 mr-1" /> Find People
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-2xl border-[#FFE5D9] bg-white"
          />
        </div>

        <div className="flex gap-1 bg-[#FFF8F6] rounded-2xl p-1 mb-4">
          {["all", "unread"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                tab === t ? "bg-white text-[#E8907C] shadow-sm" : "text-gray-500"
              }`}
            >
              {t}
              {t === "unread" && unreadCount > 0 ? (
                <span className="ml-1.5 px-1.5 py-0.5 bg-[#F4A896] text-white text-xs rounded-full">{unreadCount}</span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No conversations yet</p>
              <p className="text-sm mt-1">Connect with caregivers or psychologists to start messaging</p>
            </div>
          ) : (
            filtered.map((conv) => {
              const title = displayTitle(conv)
              const initial = (title && title.charAt(0).toUpperCase()) || "U"
              return (
                <div
                  key={conv.id}
                  onClick={() => navigate(`/Chat?id=${conv.id}`)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border hover:shadow-md transition-all cursor-pointer ${
                    (conv.unread_count || 0) > 0 ? "bg-[#FFF8F6] border-[#F4A896]/40" : "bg-white border-[#FFE5D9]/50"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F4A896] to-[#FFDDD2] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <span className="text-white font-semibold">{initial}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-semibold text-gray-800 ${(conv.unread_count || 0) > 0 ? "font-bold" : ""}`}>{title}</p>
                      {conv.last_message_time ? <span className="text-xs text-gray-400 ml-2">{conv.last_message_time}</span> : null}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className={`text-sm truncate ${(conv.unread_count || 0) > 0 ? "text-gray-800 font-medium" : "text-gray-500"}`}>
                        {conv.last_message || "No messages yet"}
                      </p>
                      {(conv.unread_count || 0) > 0 ? (
                        <span className="ml-2 w-5 h-5 bg-[#F4A896] text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">
                          {conv.unread_count}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <Dialog open={findOpen} onOpenChange={setFindOpen}>
        <DialogContent className="sm:max-w-[650px] rounded-2xl">
          <DialogHeader><DialogTitle>Find New People</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Psychologists</h3>
            {psychologists.map((p) => (
              <div key={p.id} className="rounded-xl border p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{p.name}</p>
                  <p className="text-sm text-gray-500">{p.specialty}</p>
                </div>
                <Button
                  size="sm"
                  className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]"
                  onClick={() => connectPsychologist.mutate(p)}
                  disabled={connectPsychologist.isPending}
                >
                  {savedPsychologists.some((s) => s.psychologist_id === p.id) ? "Message" : "Connect"}
                </Button>
              </div>
            ))}
            <h3 className="text-sm font-semibold text-gray-800 pt-2">Caregivers / Patients</h3>
            {profiles.filter((u) => u.id !== user?.id && u.role !== "psychologist").map((u) => (
              <div key={u.id} className="rounded-xl border p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{u.full_name}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-[#FFE5D9] text-[#E8907C]"
                  onClick={() => connectCaregiver.mutate(u)}
                  disabled={connectCaregiver.isPending}
                >
                  {following.includes(u.id) ? "Message" : "Connect"}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
