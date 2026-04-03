import React, { useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { createPageUrl } from "@/utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { ArrowLeft, Check, Plus, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import CreatePostDialog from "@/components/community/CreatePostDialog"
import GroupPostThread from "@/components/community/GroupPostThread"

export default function GroupDetail() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const groupId = useMemo(() => new URLSearchParams(location.search).get("id"), [location.search])
  const [createPostOpen, setCreatePostOpen] = useState(false)

  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() })
  const { data: groupRows = [], isLoading: groupLoading } = useQuery({
    queryKey: ["communityGroup", groupId],
    queryFn: () => base44.entities.CommunityGroup.filter({ id: groupId }, "-member_count", 1),
    enabled: !!groupId,
  })
  const group = groupRows[0]
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["groupPosts", groupId],
    queryFn: () => base44.entities.CommunityPost.filter({ group_id: groupId }, "-created_date", 100),
    enabled: !!groupId,
  })

  const joined = !!(group?.members || []).map(String).includes(String(user?.id))

  useEffect(() => {
    if (!joined || !posts.length) return
    queryClient.prefetchQuery({
      queryKey: ["directoryProfiles"],
      queryFn: () => base44.entities.User.list("-created_date", 500),
    })
    for (const p of posts) {
      queryClient.prefetchQuery({
        queryKey: ["postComments", p.id],
        queryFn: () => base44.entities.Comment.filter({ post_id: p.id }, "-created_date", 300),
      })
    }
  }, [joined, posts, queryClient])

  const joinGroup = useMutation({
    mutationFn: async () => {
      if (!group || joined) return
      if (!user?.id) throw new Error("Sign in to join")
      const uid = String(user.id)
      const members = [...new Set((group.members || []).map((m) => String(m)).filter(Boolean))]
      if (members.includes(uid)) return
      const nextMembers = [...members, uid]
      try {
        await base44.entities.CommunityGroup.update(group.id, {
          members: nextMembers,
          member_count: (group.member_count || 0) + 1,
        })
      } catch (e) {
        const msg = e?.message || ""
        if (msg.includes("member_count") || msg.includes("schema cache")) {
          await base44.entities.CommunityGroup.update(group.id, { members: nextMembers })
        } else {
          throw e
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityGroups"] })
      queryClient.invalidateQueries({ queryKey: ["communityGroup", groupId] })
    },
    onError: (e) => toast.error(e?.message || "Could not join"),
  })

  const likePost = useMutation({
    mutationFn: async (post) => {
      const uid = String(user?.id || "")
      if (!uid) throw new Error("Sign in to like")
      const likedBy = [...new Set((post.liked_by || []).map((x) => String(x)).filter(Boolean))]
      const isLiked = likedBy.includes(uid)
      const displayLikes = Math.max(post.likes_count || 0, likedBy.length)
      await base44.entities.CommunityPost.update(post.id, {
        likes_count: isLiked ? Math.max(0, displayLikes - 1) : displayLikes + 1,
        liked_by: isLiked ? likedBy.filter((e) => e !== uid) : [...likedBy, uid],
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groupPosts", groupId] }),
    onError: (e) => toast.error(e?.message || "Could not update like"),
  })

  if (!groupId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8 px-4">
        <p className="text-center text-gray-600">Missing group.</p>
        <Link to={createPageUrl("Community")} className="block text-center text-[#E8907C] mt-4">
          Back to Community
        </Link>
      </div>
    )
  }

  if (groupLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
        <div className="max-w-6xl mx-auto px-4 animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-40 rounded-3xl bg-gray-100" />
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8 px-4">
        <p className="text-center text-gray-600">Group not found.</p>
        <Link to={createPageUrl("Community")} className="block text-center text-[#E8907C] mt-4">
          Back to Community
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        <Link to={createPageUrl("Community")} className="inline-flex items-center gap-2 text-[#25364f] hover:text-[#E8907C] mb-5">
          <ArrowLeft className="w-5 h-5" /> Back to Community
        </Link>

        <div className="rounded-3xl bg-[#F6B8A7] p-7 mb-7">
          <div className="flex items-start justify-between gap-5 flex-wrap">
            <div>
              <h1 className="text-4xl font-semibold text-[#122745] mb-2">{group.name}</h1>
              <p className="text-[#25364f] text-2xl max-w-3xl">{group.description}</p>
              <p className="inline-flex items-center gap-2 text-[#25364f] mt-3">
                <Users className="w-4 h-4" /> {group.member_count || 0} members
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => joinGroup.mutate()}
                variant="outline"
                disabled={joined || joinGroup.isPending}
                className={`rounded-2xl px-6 ${joined ? "border-green-300 text-green-700 bg-white" : "border-white text-[#E8907C] bg-white"}`}
              >
                <Check className="w-4 h-4 mr-2" /> {joined ? "Joined" : "Join Group"}
              </Button>
              <Button
                onClick={() => setCreatePostOpen(true)}
                disabled={!joined}
                className="rounded-2xl bg-white text-[#E8907C] border border-white hover:bg-[#FFF8F6] disabled:opacity-50"
              >
                <Plus className="w-4 h-4 mr-2" /> New post
              </Button>
            </div>
          </div>
        </div>

        <h2 className="text-3xl font-semibold text-[#122745] mb-4">Group Posts</h2>
        <div className="rounded-3xl border border-[#FFE5D9]/60 bg-white p-6 md:p-10">
          {!joined ? (
            <div className="text-center py-12 px-4">
              <p className="text-gray-700 mb-4">Join this group to read posts and join the conversation.</p>
              <Button onClick={() => joinGroup.mutate()} disabled={joinGroup.isPending} className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
                Join group to view
              </Button>
            </div>
          ) : postsLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-24 bg-gray-100 rounded-2xl" />
              <div className="h-24 bg-gray-100 rounded-2xl" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#5B6D83] text-xl mb-4">No posts in this group yet</p>
              <Button onClick={() => setCreatePostOpen(true)} className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
                <Plus className="w-4 h-4 mr-2" /> Write the first post
              </Button>
            </div>
          ) : (
            <div className="space-y-8 text-left">
              {posts.map((p, idx) => (
                <GroupPostThread key={p.id} post={p} user={user} groupId={groupId} index={idx} joined={joined} />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreatePostDialog
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        user={user}
        groupId={groupId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["groupPosts", groupId] })
          queryClient.invalidateQueries({ queryKey: ["communityPosts"] })
        }}
      />
    </div>
  )
}
