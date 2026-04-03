import React, { useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { createPageUrl } from "@/utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { ArrowLeft, Heart, MessageCircle, Share2, Pencil, Trash2, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import CommentThread from "@/components/community/CommentThread"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog"
import { formatDistanceToNow, format } from "date-fns"

export default function PostDetail() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const postId = useMemo(() => new URLSearchParams(location.search).get("id"), [location.search])
  const [shareOpen, setShareOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")

  const shareLink = useMemo(() => `${window.location.origin}/PostDetail?id=${postId}`, [postId])

  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() })
  const { data: postRows = [], isLoading: postLoading } = useQuery({
    queryKey: ["postDetail", postId],
    queryFn: () => base44.entities.CommunityPost.filter({ id: postId }, "-created_date", 1),
    enabled: !!postId,
  })
  const post = postRows[0]

  const { data: groupAccessRows = [] } = useQuery({
    queryKey: ["groupAccess", post?.group_id],
    queryFn: () => base44.entities.CommunityGroup.filter({ id: post.group_id }, "-member_count", 1),
    enabled: !!post?.group_id,
  })
  const groupAccess = groupAccessRows[0]
  const groupMember = Boolean(user?.id && post?.group_id && (groupAccess?.members || []).map(String).includes(String(user.id)))
  const groupLocked = Boolean(post?.group_id && !groupMember)

  const { data: comments = [] } = useQuery({
    queryKey: ["postComments", postId],
    queryFn: () => base44.entities.Comment.filter({ post_id: postId }, "-created_date", 100),
    enabled: !!postId,
  })

  const { data: profiles = [] } = useQuery({
    queryKey: ["directoryProfiles"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
  })
  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles])

  const authorKey = post?.author_id || post?.created_by_id
  const authorDisplayName = useMemo(() => {
    if (!post) return ""
    if (authorKey && profileById.get(authorKey)?.full_name?.trim()) return profileById.get(authorKey).full_name.trim()
    return post.author_name || "Anonymous"
  }, [post, authorKey, profileById])

  const likedByList = useMemo(
    () => [...new Set((post?.liked_by || []).map((x) => String(x)).filter(Boolean))],
    [post?.liked_by],
  )
  const displayLikeCount = Math.max(post?.likes_count || 0, likedByList.length)
  const displayCommentCount = Math.max(post?.comments_count || 0, comments.length)
  const authorProfileRow = authorKey ? profileById.get(authorKey) : null
  const authorAvatarUrl = authorProfileRow?.profile_photo || post?.author_photo
  const isOwner = !!(user?.id && authorKey && String(user.id) === String(authorKey))

  const updatePost = useMutation({
    mutationFn: async () => {
      await base44.entities.CommunityPost.update(postId, {
        title: editTitle.trim(),
        content: editContent.trim(),
      })
    },
    onSuccess: () => {
      toast.success("Post updated")
      setEditOpen(false)
      queryClient.invalidateQueries({ queryKey: ["postDetail", postId] })
      queryClient.invalidateQueries({ queryKey: ["communityPosts"] })
      if (post?.group_id) queryClient.invalidateQueries({ queryKey: ["groupPosts", post.group_id] })
    },
  })

  const deletePost = useMutation({
    mutationFn: async () => base44.entities.CommunityPost.delete(postId),
    onSuccess: () => {
      toast.success("Post removed")
      setDeleteOpen(false)
      queryClient.invalidateQueries({ queryKey: ["communityPosts"] })
      if (post?.group_id) queryClient.invalidateQueries({ queryKey: ["groupPosts", post.group_id] })
      if (post?.group_id) navigate(`${createPageUrl("GroupDetail")}?id=${post.group_id}`)
      else navigate(createPageUrl("Community"))
    },
    onError: (e) => toast.error(e?.message || "Could not delete post"),
  })

  const likePost = useMutation({
    mutationFn: async () => {
      if (!post?.id || !user?.id) return
      if (groupLocked) {
        toast.info("Join the group to like this post")
        return
      }
      const uid = String(user.id)
      const likedBy = [...new Set((post.liked_by || []).map((x) => String(x)).filter(Boolean))]
      const liked = likedBy.includes(uid)
      const nextLiked = liked ? likedBy.filter((e) => e !== uid) : [...likedBy, uid]
      await base44.entities.CommunityPost.update(postId, {
        likes_count: liked ? Math.max(0, displayLikeCount - 1) : displayLikeCount + 1,
        liked_by: nextLiked,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postDetail", postId] })
      queryClient.invalidateQueries({ queryKey: ["communityPosts"] })
      if (post?.group_id) queryClient.invalidateQueries({ queryKey: ["groupPosts", post.group_id] })
    },
    onError: (e) => toast.error(e?.message || "Could not update like"),
  })

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      toast.success("Link copied")
    } catch {
      toast.error("Could not copy link")
    }
  }

  const openEdit = () => {
    setEditTitle(post?.title || "")
    setEditContent(post?.content || "")
    setEditOpen(true)
  }

  const profileHref = authorKey ? `${createPageUrl("UserPublicProfile")}?id=${authorKey}` : null
  const timeRel = post?.created_date ? formatDistanceToNow(new Date(post.created_date), { addSuffix: true }) : ""
  const timeExact = post?.created_date ? format(new Date(post.created_date), "MMM d, yyyy · h:mm a") : ""

  const backHref = post?.group_id ? `${createPageUrl("GroupDetail")}?id=${post.group_id}` : createPageUrl("Community")

  const isLiked = Boolean(user?.id && likedByList.includes(String(user.id)))

  if (!postId) {
    return (
      <div className="min-h-screen py-10 text-center text-gray-600">
        <p>Invalid post.</p>
        <Link to={createPageUrl("Community")} className="text-[#E8907C] mt-2 inline-block">
          Back to Community
        </Link>
      </div>
    )
  }

  if (postLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8 px-4">
        <div className="max-w-4xl mx-auto animate-pulse space-y-4">
          <div className="h-8 w-32 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-100 rounded-3xl" />
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen py-10 text-center text-gray-600">
        <p>Post not found.</p>
        <Link to={createPageUrl("Community")} className="text-[#E8907C] mt-2 inline-block">
          Back to Community
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <Link to={backHref} className="inline-flex items-center gap-2 text-[#25364f] hover:text-[#E8907C]">
          <ArrowLeft className="w-5 h-5" /> {post.group_id ? "Back to group" : "Back to Community"}
        </Link>

        <div className="bg-white rounded-3xl border border-[#FFE5D9]/60 p-8">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              {profileHref ? (
                <Link
                  to={profileHref}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F4A896] to-[#FFDDD2] flex items-center justify-center text-white font-bold overflow-hidden shrink-0 hover:opacity-90"
                >
                  {authorAvatarUrl ? (
                    <img src={authorAvatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    authorDisplayName?.[0] || "A"
                  )}
                </Link>
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F4A896] to-[#FFDDD2] flex items-center justify-center text-white font-bold">
                  {authorDisplayName?.[0] || "A"}
                </div>
              )}
              <div>
                {profileHref ? (
                  <Link to={profileHref} className="font-medium text-gray-800 hover:text-[#E8907C] block">
                    {authorDisplayName}
                  </Link>
                ) : (
                  <p className="font-medium text-gray-800">{authorDisplayName}</p>
                )}
                <p className="text-gray-500 text-sm" title={timeExact}>
                  {timeRel}
                </p>
              </div>
            </div>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="p-2 rounded-lg text-gray-400 hover:text-[#E8907C] hover:bg-[#FFF8F6]">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onClick={openEdit} className="cursor-pointer">
                    <Pencil className="w-4 h-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault()
                      setDeleteOpen(true)
                    }}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                    disabled={deletePost.isPending}
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold text-[#122745] leading-tight mb-5">{post.title}</h1>
          {groupLocked ? (
            <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
              Join this group in the Support Circle to read the full post and comments.
            </p>
          ) : (
            <p className="text-[#25364f] text-lg md:text-xl leading-relaxed whitespace-pre-wrap">{post.content}</p>
          )}
          <div className="border-t mt-7 pt-5 flex items-center gap-8 text-[#4a5b74]">
            <button
              type="button"
              onClick={() => likePost.mutate()}
              disabled={likePost.isPending || !user || groupLocked}
              className={`inline-flex items-center gap-2 hover:text-red-500 transition-colors ${isLiked ? "text-red-500" : ""}`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} /> {displayLikeCount} likes
            </button>
            <span className="inline-flex items-center gap-2">
              <MessageCircle className="w-5 h-5" /> {displayCommentCount} comments
            </span>
            <button type="button" onClick={() => setShareOpen(true)} className="inline-flex items-center gap-2 ml-auto hover:text-[#E8907C]">
              <Share2 className="w-5 h-5" /> Share
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#FFE5D9]/60 p-8">
          <h2 className="text-2xl font-semibold text-[#122745] mb-2">Comments</h2>
          <CommentThread
            postId={postId}
            post={post}
            comments={comments}
            user={user}
            groupId={post.group_id || null}
            locked={groupLocked}
            profileById={profileById}
          />
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this post?"
        description="This cannot be undone."
        onConfirm={() => deletePost.mutate()}
        pending={deletePost.isPending}
      />

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Share "{post.title || "Post"}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input readOnly value={shareLink} className="rounded-xl" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setShareOpen(false)}>
                Done
              </Button>
              <Button onClick={copyLink} className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
                Copy link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit post</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="rounded-xl" placeholder="Title" />
            <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="rounded-xl min-h-[120px]" placeholder="Content" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => updatePost.mutate()}
                disabled={!editTitle.trim() || !editContent.trim() || updatePost.isPending}
                className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
