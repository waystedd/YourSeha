import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { createPageUrl } from "@/utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { Heart, MessageCircle, Share2, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNow, format } from "date-fns"
import { toast } from "sonner"
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog"
import CommentThread from "./CommentThread"

export default function GroupPostThread({ post, user, groupId, index = 0, joined = true }) {
  const queryClient = useQueryClient()
  const [shareOpen, setShareOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editTitle, setEditTitle] = useState(post.title || "")
  const [editContent, setEditContent] = useState(post.content || "")

  const commentsQuery = useQuery({
    queryKey: ["postComments", post.id],
    queryFn: () => base44.entities.Comment.filter({ post_id: post.id }, "-created_date", 300),
    enabled: !!post.id,
  })
  const comments = commentsQuery.data ?? []
  const commentsLoading = commentsQuery.isPending && comments.length === 0

  const profilesQuery = useQuery({
    queryKey: ["directoryProfiles"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
  })
  const profiles = profilesQuery.data ?? []
  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles])

  const authorKey = post.author_id || post.created_by_id
  const authorLive = authorKey ? profileById.get(authorKey) : null
  // Wait for a settled fetch so cached (stale) directory rows don't briefly show the wrong name.
  const authorNameReady =
    !authorKey || (profilesQuery.isSuccess && !profilesQuery.isFetching)
  const authorDisplayName = authorLive?.full_name?.trim() || post.author_name || "Anonymous"
  const authorAvatar = authorLive?.profile_photo || post.author_photo
  const isOwner = !!(user?.id && authorKey && String(user.id) === String(authorKey))
  const likedByList = useMemo(
    () => [...new Set((post.liked_by || []).map((x) => String(x)).filter(Boolean))],
    [post.liked_by],
  )
  const isLiked = Boolean(user?.id && likedByList.includes(String(user.id)))
  const displayLikeCount = Math.max(post.likes_count || 0, likedByList.length)
  const displayCommentCount = commentsLoading
    ? null
    : Math.max(post.comments_count || 0, comments.length)
  const profileHref = authorKey ? `${createPageUrl("UserPublicProfile")}?id=${authorKey}` : null
  const timeRel = post.created_date ? formatDistanceToNow(new Date(post.created_date), { addSuffix: true }) : ""
  const timeExact = post.created_date ? format(new Date(post.created_date), "MMM d, yyyy · h:mm a") : ""

  const shareLink = useMemo(
    () => `${window.location.origin}${createPageUrl("PostDetail")}?id=${post.id}`,
    [post.id]
  )

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      toast.success("Link copied")
    } catch {
      toast.error("Could not copy link")
    }
  }

  const likePost = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        toast.error("Sign in to like posts")
        return
      }
      if (!joined) {
        toast.error("Join the group to like posts")
        return
      }
      const uid = String(user.id)
      const likedBy = [...new Set((post.liked_by || []).map((x) => String(x)).filter(Boolean))]
      const liked = likedBy.includes(uid)
      const nextLiked = liked ? likedBy.filter((e) => e !== uid) : [...likedBy, uid]
      const displayLikes = Math.max(post.likes_count || 0, likedBy.length)
      await base44.entities.CommunityPost.update(post.id, {
        likes_count: liked ? Math.max(0, displayLikes - 1) : displayLikes + 1,
        liked_by: nextLiked,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groupPosts", groupId] }),
    onError: (e) => toast.error(e?.message || "Could not update like"),
  })

  const updatePost = useMutation({
    mutationFn: async () => {
      await base44.entities.CommunityPost.update(post.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
      })
    },
    onSuccess: () => {
      toast.success("Post updated")
      setEditOpen(false)
      queryClient.invalidateQueries({ queryKey: ["groupPosts", groupId] })
      queryClient.invalidateQueries({ queryKey: ["communityPosts"] })
      queryClient.invalidateQueries({ queryKey: ["postDetail", post.id] })
    },
  })

  const deletePost = useMutation({
    mutationFn: async () => base44.entities.CommunityPost.delete(post.id),
    onSuccess: () => {
      toast.success("Post removed")
      setDeleteOpen(false)
      queryClient.invalidateQueries({ queryKey: ["groupPosts", groupId] })
      queryClient.invalidateQueries({ queryKey: ["communityPosts"] })
    },
    onError: (e) => toast.error(e?.message || "Could not delete post"),
  })

  return (
    <div
      className="rounded-2xl border border-[#FFE5D9]/70 bg-white overflow-hidden shadow-sm"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="p-5 border-b border-[#FFE5D9]/40 bg-gradient-to-r from-[#FFFBF9] to-white">
        <div className="flex items-start justify-between gap-2">
          <div className="flex gap-3 min-w-0">
            {profileHref ? (
              <Link
                to={profileHref}
                className="w-11 h-11 rounded-full bg-gradient-to-br from-[#F4A896] to-[#FFDDD2] flex items-center justify-center text-white font-medium shrink-0 overflow-hidden hover:opacity-90"
              >
                {authorNameReady ? (
                  authorAvatar ? (
                    <img src={authorAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    authorDisplayName?.[0] || "A"
                  )
                ) : (
                  <span className="text-transparent">·</span>
                )}
              </Link>
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#F4A896] to-[#FFDDD2] flex items-center justify-center text-white font-medium shrink-0">
                {authorNameReady ? authorDisplayName?.[0] || "A" : ""}
              </div>
            )}
            <div className="min-h-[2.75rem]">
              {profileHref ? (
                <Link to={profileHref} className="font-semibold text-gray-900 hover:text-[#E8907C] block">
                  {authorNameReady ? (
                    authorDisplayName
                  ) : (
                    <span className="inline-block h-4 w-28 max-w-[70%] bg-gray-200/90 rounded animate-pulse" aria-hidden />
                  )}
                </Link>
              ) : (
                <span className="font-semibold text-gray-900">
                  {authorNameReady ? authorDisplayName : (
                    <span className="inline-block h-4 w-28 bg-gray-200/90 rounded animate-pulse" aria-hidden />
                  )}
                </span>
              )}
              <p className="text-xs text-gray-400" title={timeExact}>
                {timeRel}
              </p>
            </div>
          </div>
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="p-2 text-gray-400 hover:text-[#E8907C] rounded-lg">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem
                  onClick={() => {
                    setEditTitle(post.title || "")
                    setEditContent(post.content || "")
                    setEditOpen(true)
                  }}
                  className="cursor-pointer"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer focus:text-red-600"
                  onSelect={(e) => {
                    e.preventDefault()
                    setDeleteOpen(true)
                  }}
                  disabled={deletePost.isPending}
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {post.title && <h3 className="text-lg font-semibold text-gray-900 mt-4">{post.title}</h3>}
        <p className="text-gray-700 mt-2 whitespace-pre-wrap leading-relaxed">{post.content}</p>
        {post.image_url && <img src={post.image_url} alt="" className="mt-4 rounded-xl w-full max-h-80 object-cover" />}

        <div className="flex items-center gap-6 mt-5 pt-4 border-t border-[#FFE5D9]/50">
          <button
            type="button"
            onClick={() => likePost.mutate()}
            className={`inline-flex items-center gap-1.5 text-sm ${isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"}`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            <span>{displayLikeCount}</span>
          </button>
          <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
            <MessageCircle className="w-4 h-4" />
            {displayCommentCount == null ? (
              <span className="inline-block w-5 h-3.5 bg-gray-200/90 rounded animate-pulse align-middle" aria-hidden />
            ) : (
              displayCommentCount
            )}
          </span>
          <button type="button" onClick={() => setShareOpen(true)} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-[#E8907C] ml-auto">
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </div>

      <div className="p-5 bg-[#FFFCFA]">
        {commentsLoading ? (
          <div className="space-y-3 py-2" aria-busy="true">
            <div className="h-20 bg-[#f3f4f6] rounded-xl animate-pulse" />
            <div className="h-16 bg-[#f3f4f6] rounded-xl animate-pulse w-5/6" />
            <div className="h-16 bg-[#f3f4f6] rounded-xl animate-pulse w-4/6" />
          </div>
        ) : (
          <CommentThread
            postId={post.id}
            post={post}
            comments={comments}
            user={user}
            groupId={groupId}
            compact
            locked={!joined}
            profileById={profileById}
          />
        )}
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
            <DialogTitle>Share post</DialogTitle>
          </DialogHeader>
          <Input readOnly value={shareLink} className="rounded-xl" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setShareOpen(false)}>
              Done
            </Button>
            <Button onClick={copyLink} className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
              Copy link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit post</DialogTitle>
          </DialogHeader>
          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="rounded-xl" placeholder="Title" />
          <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="rounded-xl min-h-[120px]" />
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
        </DialogContent>
      </Dialog>
    </div>
  )
}
