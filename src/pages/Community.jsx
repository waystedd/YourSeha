import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { createPageUrl } from "@/utils"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { Users, Plus, Check, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import PostCard from "@/components/community/PostCard"
import CreatePostDialog from "@/components/community/CreatePostDialog"

const POSTS_PER_PAGE = 8
const SUGGESTED_TAGS = ["ASD Tips", "Self-Care", "Early Intervention", "Education", "Therapy", "Emotional Support", "Daily Life"]

export default function Community() {
  const queryClient = useQueryClient()
  const [createPostOpen, setCreatePostOpen] = useState(false)
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [newGroup, setNewGroup] = useState({ name: "", description: "" })
  const [page, setPage] = useState(1)
  const [tagFilter, setTagFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  })

  const { data: postsRaw = [], isLoading: postsLoading } = useQuery({
    queryKey: ["communityPosts"],
    queryFn: () => base44.entities.CommunityPost.list("-created_date", 200),
  })

  const posts = postsRaw.filter((p) => !p.group_id)

  const filteredPosts = useMemo(() => {
    let list = [...posts]
    const q = tagFilter.trim().toLowerCase()
    if (q) {
      list = list.filter((p) => {
        const tags = (p.tags || []).map((t) => String(t).toLowerCase())
        const hitTag = tags.some((t) => t.includes(q))
        const hitText = `${p.title || ""} ${p.content || ""}`.toLowerCase().includes(q)
        return hitTag || hitText
      })
    }
    if (typeFilter === "regular") {
      list = list.filter((p) => !p.post_type || p.post_type === "regular" || p.post_type === "post")
    } else if (typeFilter === "announcement") {
      list = list.filter((p) => p.post_type === "announcement")
    } else if (typeFilter === "meetup") {
      list = list.filter((p) => p.post_type === "meetup" || p.post_type === "webinar")
    }
    return list
  }, [posts, tagFilter, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE))

  const pagedPosts = useMemo(() => {
    const start = (page - 1) * POSTS_PER_PAGE
    return filteredPosts.slice(start, start + POSTS_PER_PAGE)
  }, [filteredPosts, page])

  React.useEffect(() => {
    setPage(1)
  }, [tagFilter, typeFilter])

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["communityGroups"],
    queryFn: () => base44.entities.CommunityGroup.list("-member_count", 80),
  })

  const createGroup = useMutation({
    mutationFn: async (data) => {
      if (!user?.id) {
        toast.error("Sign in to create a group")
        return
      }
      await base44.entities.CommunityGroup.create({
        ...data,
        members: [String(user.id)],
        member_count: 1,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityGroups"] })
      toast.success("Group created! 🎉")
      setCreateGroupOpen(false)
      setNewGroup({ name: "", description: "" })
    },
  })

  const likePost = useMutation({
    mutationFn: async (post) => {
      if (!user?.id) {
        toast.error("Sign in to like posts")
        throw new Error("auth")
      }
      const uid = String(user.id)
      const likedBy = [...new Set((post.liked_by || []).map((x) => String(x)).filter(Boolean))]
      const isLiked = likedBy.includes(uid)
      const nextLiked = isLiked ? likedBy.filter((e) => e !== uid) : [...likedBy, uid]
      await base44.entities.CommunityPost.update(post.id, {
        likes_count: isLiked ? Math.max(0, (post.likes_count || 1) - 1) : (post.likes_count || 0) + 1,
        liked_by: nextLiked,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["communityPosts"] }),
    onError: (e) => {
      if (e?.message !== "auth") toast.error(e?.message || "Could not update like")
    },
  })

  const joinGroup = useMutation({
    mutationFn: async (group) => {
      if (!user?.id) {
        toast.error("Sign in to join groups")
        throw new Error("auth")
      }
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
      queryClient.invalidateQueries({ queryKey: ["communityGroup"] })
      toast.success("Joined group! Welcome! 💕")
    },
    onError: (e) => {
      if (e?.message !== "auth") toast.error(e?.message || "Could not join")
    },
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-800 mb-2">Support Circle</h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            A safe space for mothers to connect, share experiences, and support one another 💕
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <Button
            onClick={() => setCreatePostOpen(true)}
            className="rounded-2xl bg-gradient-to-r from-[#F4A896] to-[#E8907C] hover:from-[#E8907C] hover:to-[#d87a66] h-12 px-6"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Post
          </Button>

          <Button
            variant="outline"
            onClick={() => setCreateGroupOpen(true)}
            className="rounded-2xl border-[#F4A896] text-[#E8907C] hover:bg-[#FFF8F6] h-12 px-6"
          >
            <Users className="w-5 h-5 mr-2" />
            Create Group
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-800">Recent Posts</h2>
              <span className="text-xs text-gray-500">{filteredPosts.length} post{filteredPosts.length === 1 ? "" : "s"}</span>
            </div>

            <div className="bg-white rounded-2xl border border-[#FFE5D9]/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Filter className="w-4 h-4 text-[#E8907C]" />
                View by type
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ["all", "All"],
                  ["regular", "Regular post"],
                  ["announcement", "Announcement"],
                  ["meetup", "Meet up"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTypeFilter(key)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                      typeFilter === key ? "bg-[#FFF8F6] border-[#F4A896] text-[#E8907C]" : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Tags & search</p>
                <Input
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  placeholder="Search tags or text (e.g. ASD Tips, self-care)…"
                  className="rounded-xl border-[#FFE5D9] text-sm"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {SUGGESTED_TAGS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTagFilter(t)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100 text-gray-600 hover:border-[#F4A896]"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto pr-1 space-y-4">
              {postsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-3xl p-6 animate-pulse">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200" />
                        <div className="flex-1">
                          <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                          <div className="h-5 w-48 bg-gray-200 rounded mb-2" />
                          <div className="h-16 bg-gray-200 rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center">
                  <p className="text-gray-500 mb-4">No posts match your filters.</p>
                  <Button onClick={() => setCreatePostOpen(true)} className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
                    Create Post
                  </Button>
                </div>
              ) : (
                pagedPosts.map((post, idx) => (
                  <PostCard key={post.id} post={post} user={user} onLike={(p) => likePost.mutate(p)} index={idx} />
                ))
              )}
            </div>

            {filteredPosts.length > POSTS_PER_PAGE ? (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" className="rounded-xl" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`min-w-[2rem] h-9 rounded-lg text-sm ${page === n ? "bg-[#F4A896] text-white" : "bg-white border border-gray-200 text-gray-700"}`}
                  >
                    {n}
                  </button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Support Groups</h2>

            {groupsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                    <div className="h-5 w-32 bg-gray-200 rounded mb-2" />
                    <div className="h-4 w-full bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center">
                <p className="text-gray-500 text-sm mb-3">No groups yet</p>
                <Button size="sm" onClick={() => setCreateGroupOpen(true)} className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
                  Create First Group
                </Button>
              </div>
            ) : (
              groups.map((group) => (
                <Link
                  key={group.id}
                  to={createPageUrl("GroupDetail") + `?id=${group.id}`}
                  className="block bg-white rounded-2xl p-4 border border-[#FFE5D9]/50 hover:shadow-md hover:border-[#F4A896]/30 transition-all"
                >
                  <h3 className="font-medium text-gray-800">{group.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{group.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Users className="w-3 h-3" /> {group.member_count || 0} members
                    </span>
                    {(group.members || []).map(String).includes(String(user?.id)) ? (
                      <Badge className="bg-green-50 text-green-600 hover:bg-green-50 rounded-full text-xs">
                        <Check className="w-3 h-3 mr-1" /> Joined
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault()
                          joinGroup.mutate(group)
                        }}
                        className="text-[#E8907C] hover:bg-[#FFF8F6] rounded-lg text-xs h-7"
                      >
                        Join
                      </Button>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <CreatePostDialog
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        user={user}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["communityPosts"] })}
      />

      <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Create a Support Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input
              placeholder="Group name..."
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              className="rounded-xl border-[#FFE5D9] focus:border-[#F4A896]"
            />
            <Textarea
              placeholder="What is this group about?"
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              className="rounded-xl border-[#FFE5D9] focus:border-[#F4A896] min-h-[100px]"
            />
            <Button
              onClick={() => createGroup.mutate(newGroup)}
              disabled={!newGroup.name || !newGroup.description || createGroup.isPending}
              className="w-full rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]"
            >
              {createGroup.isPending ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
