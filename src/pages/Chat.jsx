import React, { useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { createPageUrl } from "@/utils"
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
  const { data: profiles = [] } = useQuery({
    queryKey: ["directoryProfiles"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
    enabled: !!conversationId,
  })

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: () => base44.entities.Conversation.list("-updated_date", 120),
    enabled: !!user?.id,
  })
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => base44.entities.Message.filter({ conversation_id: conversationId }, "created_date", 200),
    enabled: !!conversationId,
  })

  const conversation = conversations.find((item) => item.id === conversationId)
  const currentId = user?.id || null
  const otherId = useMemo(() => {
    if (!conversation || !currentId) return null
    return conversation.participant_a === currentId ? conversation.participant_b : conversation.participant_a
  }, [conversation, currentId])

  const senderLabel = (senderId) => {
    if (!senderId) return "Member"
    if (user?.id && senderId === user.id) return user?.full_name || "You"
    return profiles.find((p) => p.id === senderId)?.full_name || "Member"
  }

  const chatHeaderTitle = useMemo(() => {
    if (!conversation) return ""
    if (!otherId) return conversation.title
    const name = profiles.find((p) => p.id === otherId)?.full_name?.trim()
    return name || conversation.title
  }, [conversation, otherId, profiles])

  useEffect(() => {
    if (!conversationId) return undefined
    const unsubMessages = base44.entities.Message.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
    })
    const unsubConversations = base44.entities.Conversation.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] })
    })
    return () => {
      unsubMessages?.()
      unsubConversations?.()
    }
  }, [conversationId, queryClient])

  useEffect(() => {
    if (!conversationId || !currentId || !conversation) return
    const markAsRead = async () => {
      const incomingUnread = messages.filter((message) => message.sender_id !== currentId && !(message.read_by || []).includes(currentId))
      await Promise.all(
        incomingUnread.map((message) =>
          base44.entities.Message.update(message.id, {
            read_by: [...new Set([...(message.read_by || []), currentId])],
          })
        )
      )
      if (conversation.participant_a === currentId && (conversation.unread_count_a || 0) > 0) {
        await base44.entities.Conversation.update(conversationId, { unread_count_a: 0 })
      }
      if (conversation.participant_b === currentId && (conversation.unread_count_b || 0) > 0) {
        await base44.entities.Conversation.update(conversationId, { unread_count_b: 0 })
      }
      if (incomingUnread.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
        queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] })
      }
    }
    markAsRead()
  }, [conversationId, currentId, messages, conversation, queryClient])

  const send = useMutation({
    mutationFn: async () => {
      await base44.entities.Message.create({
        conversation_id: conversationId,
        read_by: currentId ? [currentId] : [],
        content: text,
      })

      const nextCounts = {
        unread_count_a: conversation?.unread_count_a || 0,
        unread_count_b: conversation?.unread_count_b || 0,
      }
      if (conversation?.participant_a === currentId) nextCounts.unread_count_b += 1
      if (conversation?.participant_b === currentId) nextCounts.unread_count_a += 1

      await base44.entities.Conversation.update(conversationId, {
        last_message: text,
        last_message_at: new Date().toISOString(),
        ...nextCounts,
      })
    },
    onSuccess: () => {
      setText("")
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] })
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] })
    },
  })

  if (!conversation) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-[#FFFDFB]">
      <div className="max-w-6xl mx-auto bg-white min-h-screen border-x border-[#FFE5D9]/50">
        <div className="h-16 border-b border-[#FFE5D9]/60 px-4 flex items-center justify-between bg-[#FFF8F6] gap-3">
          <div className="font-semibold text-gray-800 truncate min-w-0">{chatHeaderTitle}</div>
          {otherId ? (
            <Link
              to={`${createPageUrl("UserPublicProfile")}?id=${otherId}`}
              className="text-sm font-medium text-[#E8907C] hover:underline shrink-0"
            >
              View profile
            </Link>
          ) : null}
        </div>
        <div className="h-[calc(100vh-10rem)] overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-[#FFFDFB] to-[#FFF7F3]">
          {messages.map((message) => {
            const mine = message.sender_id === currentId
            const readByOther = !!otherId && Array.isArray(message.read_by) && message.read_by.includes(otherId)
            const sentAt = message.created_date
              ? new Date(message.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : ""
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[60%] px-3 py-2 rounded-2xl shadow-sm ${mine ? "bg-gradient-to-r from-[#F4A896] to-[#E8907C] text-white" : "bg-white border border-[#FFE5D9]/70 text-gray-800"}`}>
                  {!mine ? <p className="text-[10px] text-gray-400 mb-1 font-medium">{senderLabel(message.sender_id)}</p> : null}
                  <p>{message.content}</p>
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
