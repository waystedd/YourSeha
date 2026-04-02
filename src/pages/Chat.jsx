import React, { useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, CheckCheck } from "lucide-react"

export default function Chat() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const conversationId = useMemo(() => new URLSearchParams(location.search).get("id"), [location.search])
  const [text, setText] = useState("")

  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() })
  const { data: conversations = [] } = useQuery({ queryKey: ["conversations"], queryFn: () => base44.entities.Conversation.list("-updated_date", 100) })
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => base44.entities.Message.filter({ conversation_id: conversationId }, "created_date", 200),
    enabled: !!conversationId,
  })
  const conversation = conversations.find((c) => c.id === conversationId)
  const currentKey = useMemo(() => {
    if (!user || !conversation) return ""
    if (user.role === "psychologist") return `psych:${conversation.psychologist_id || user.id}`
    return user.email || user.id
  }, [user, conversation])
  const otherKey = useMemo(() => {
    if (!user || !conversation) return ""
    if (user.role === "psychologist") return conversation.user_email || "user:unknown"
    return `psych:${conversation.psychologist_id || "unknown"}`
  }, [user, conversation])

  useEffect(() => {
    if (!conversationId || !user || !conversation || !currentKey) return
    const markAsRead = async () => {
      const incomingUnread = messages.filter((m) => {
        const mine = (m.sender_key ? m.sender_key === currentKey : m.sender_email === user.email)
        if (mine) return false
        return !(Array.isArray(m.read_by) && m.read_by.includes(currentKey))
      })
      if (incomingUnread.length === 0 && (conversation.unread_count || 0) === 0) return
      for (const msg of incomingUnread) {
        await base44.entities.Message.update(msg.id, {
          read_by: [...new Set([...(msg.read_by || []), currentKey])],
        })
      }
      await base44.entities.Conversation.update(conversationId, { unread_count: 0 })
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
    }
    markAsRead()
  }, [conversationId, user, messages, currentKey, conversation, queryClient])

  const send = useMutation({
    mutationFn: async () => {
      await base44.entities.Message.create({
        conversation_id: conversationId,
        sender_email: user?.email,
        sender_key: currentKey,
        read_by: [currentKey],
        content: text,
      })
      await base44.entities.Conversation.update(conversationId, {
        last_message: text,
        last_message_time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        unread_count: 0,
      })
    },
    onSuccess: () => {
      setText("")
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
    },
  })

  if (!conversation) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-[#FFFDFB]">
      <div className="max-w-6xl mx-auto bg-white min-h-screen border-x border-[#FFE5D9]/50">
        <div className="h-16 border-b border-[#FFE5D9]/60 px-4 flex items-center justify-between bg-[#FFF8F6]">
          <div className="font-semibold text-gray-800">{conversation.title}</div>
        </div>
        <div className="h-[calc(100vh-10rem)] overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-[#FFFDFB] to-[#FFF7F3]">
          {messages.map((m) => {
            const mine = m.sender_key ? m.sender_key === currentKey : m.sender_email === user?.email
            const readByOther = Array.isArray(m.read_by) && m.read_by.includes(otherKey)
            const sentAt = m.created_date
              ? new Date(m.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : ""
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[60%] px-3 py-2 rounded-2xl shadow-sm ${mine ? "bg-gradient-to-r from-[#F4A896] to-[#E8907C] text-white" : "bg-white border border-[#FFE5D9]/70 text-gray-800"}`}>
                  <p>{m.content}</p>
                  <div className={`mt-1 text-[11px] flex items-center gap-1 ${mine ? "text-white/80 justify-end" : "text-gray-400"}`}>
                    <span>{sentAt}</span>
                    {mine ? (readByOther ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="h-16 border-t border-[#FFE5D9]/60 px-4 flex items-center gap-2 bg-white">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your message..." className="rounded-xl border-[#FFE5D9]" />
          <Button disabled={!text.trim() || send.isPending} onClick={() => send.mutate()} className="bg-gradient-to-r from-[#F4A896] to-[#E8907C]">Send</Button>
        </div>
      </div>
    </div>
  )
}

