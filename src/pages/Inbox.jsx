import React, { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { base44 } from "@/api/base44Client"
import { MessageCircle, Search, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

export default function Inbox() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState("all")
  const [search, setSearch] = useState("")
  const [findOpen, setFindOpen] = useState(false)

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try { return await base44.auth.me() } catch { return null }
    },
  })

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: () => base44.entities.Conversation.list("-updated_at", 50),
    enabled: !!user?.id,
  })

  const { data: psychologists = [] } = useQuery({
    queryKey: ["psychologists"],
    queryFn: () => base44.entities.Psychologist.list("-rating", 30),
  })

  const { data: users = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list("-created_at", 50),
  })

  // FIX: filter saved psychologists by user_id (UUID), not user_email
  const { data: savedPsychologists = [] } = useQuery({
    queryKey: ["savedPsychologists", user?.id],
    queryFn: () => base44.entities.SavedPsychologist.filter({ user_id: user?.id }, "-created_at", 100),
    enabled: !!user?.id,
  })

  // FIX: unread uses per-user fields
  const unreadCount = useMemo(() => conversations.filter((c) => {
    if (c.participant_a === user?.id) return (c.unread_count_a || 0) > 0
    return (c.unread_count_b || 0) > 0
  }).length, [conversations, user])

  const following = user?.following || []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return conversations.filter((c) => {
      const myUnread = c.participant_a === user?.id ? (c.unread_count_a || 0) : (c.unread_count_b || 0)
      const matchTab = tab === "all" || (tab === "unread" && myUnread > 0)
      if (!matchTab) return false
      if (!q) return true
      const name = (c.title || "Conversation").toLowerCase()
      return name.includes(q)
    })
  }, [conversations, search, tab, user])

  const connectPsychologist = useMutation({
    mutationFn: async (p) => {
      const hasSaved = savedPsychologists.some((s) => s.psychologist_id === p.id)
      if (!hasSaved) {
        // FIX: use user_id (UUID) not user_email
        await base44.entities.SavedPsychologist.create({ psychologist_id: p.id })
      }
      // FIX: match conversation by participant UUIDs, not email fields
      const existing = conversations.find((c) => c.psychologist_id === p.id &&
        (c.participant_a === user?.id || c.participant_b === user?.id))
      if (existing) return existing
      return await base44.entities.Conversation.create({
        title: p.name,
        psychologist_id: p.id,
        last_message: "Connected. Start messaging.",
        last_message_at: new Date().toISOString(),
      })
    },
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["savedPsychologists", user?.id] })
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] })
      toast.success("Connected successfully")
      if (conv?.id) navigate(`/Chat?id=${conv.id}`)
    },
    onError: (err) => toast.error(err.message || "Failed to connect"),
  })

  const connectCaregiver = useMutation({
    mutationFn: async (targetUser) => {
      const currentFollowing = user?.following || []
      if (!currentFollowing.includes(targetUser.id)) {
        await base44.entities.User.update(user.id, { following: [...currentFollowing, targetUser.id] })
      }
      // FIX: match by participant UUIDs
      const existing = conversations.find((c) =>
        (c.participant_a === targetUser.id || c.participant_b === targetUser.id) &&
        (c.participant_a === user?.id || c.participant_b === user?.id)
      )
      if (existing) return existing
      return await base44.entities.Conversation.create({
        title: targetUser.full_name,
        participant_b: targetUser.id,
        last_message: "Connected. Say hello!",
        last_message_at: new Date().toISOString(),
      })
    },
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      queryClient.invalidateQueries({ queryKey: ["allUsers"] })
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] })
      toast.success("Connected successfully")
      if (conv?.id) navigate(`/Chat?id=${conv.id}`)
    },
    onError: (err) => toast.error(err.message || "Failed to connect"),
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
              const myUnread = conv.participant_a === user?.id ? (conv.unread_count_a || 0) : (conv.unread_count_b || 0)
              return (
                <div
                  key={conv.id}
                  onClick={() => navigate(`/Chat?id=${conv.id}`)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border hover:shadow-md transition-all cursor-pointer ${
                    myUnread > 0 ? "bg-[#FFF8F6] border-[#F4A896]/40" : "bg-white border-[#FFE5D9]/50"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F4A896] to-[#FFDDD2] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <span className="text-white font-semibold">{(conv.title || "C").charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-semibold text-gray-800 ${myUnread > 0 ? "font-bold" : ""}`}>
                        {conv.title || "Conversation"}
                      </p>
                      {conv.last_message_at ? (
                        <span className="text-xs text-gray-400 ml-2">
                          {new Date(conv.last_message_at).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className={`text-sm truncate ${myUnread > 0 ? "text-gray-800 font-medium" : "text-gray-500"}`}>
                        {conv.last_message || "No messages yet"}
                      </p>
                      {myUnread > 0 ? (
                        <span className="ml-2 w-5 h-5 bg-[#F4A896] text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">
                          {myUnread}
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
            {users.filter((u) => u.id !== user?.id && u.role !== "psychologist").map((u) => (
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
