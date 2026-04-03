import React, { useMemo, useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { createPageUrl } from "@/utils"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { MoreVertical, Reply, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
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

function commentAuthorDisplay(node, profileById) {
  const id = node.author_id || node.created_by_id
  const live = id && profileById?.get?.(id)
  if (live?.full_name?.trim()) return live.full_name.trim()
  return node.author_name || "Anonymous"
}

function commentAuthorPhoto(node, profileById) {
  const id = node.author_id || node.created_by_id
  return (id && profileById?.get?.(id)?.profile_photo) || node.author_photo || ""
}

function countSubtreeNodes(rootId, flatList) {
  const byParent = new Map()
  for (const c of flatList) {
    const p = c.parent_id || "root"
    if (!byParent.has(p)) byParent.set(p, [])
    byParent.get(p).push(c)
  }
  let n = 0
  function dfs(id) {
    n++
    for (const child of byParent.get(id) || []) dfs(child.id)
  }
  dfs(rootId)
  return n
}

/** Module-scope recursive tree — avoids remounting reply fields on each parent re-render. */
function CommentNodeWithPost({
  node,
  depth,
  byParent,
  replyTo,
  onReplyClick,
  replyText,
  onReplyTextChange,
  user,
  onRequestDelete,
  collapsedIds,
  onToggleCollapse,
  onPostReply,
  canPostReply,
  profileById,
}) {
  const children = byParent.get(node.id) || []
  const hasReplies = children.length > 0
  const collapsed = collapsedIds.has(node.id)

  const key = node.author_id || node.created_by_id
  const profileHref = key ? `${createPageUrl("UserPublicProfile")}?id=${key}` : null
  const nameShown = commentAuthorDisplay(node, profileById)
  const photoShown = commentAuthorPhoto(node, profileById)
  const t = node.created_date || node.created_at
  const rel = t ? formatDistanceToNow(new Date(t), { addSuffix: true }) : ""
  const exact = t ? format(new Date(t), "MMM d, yyyy · h:mm a") : ""
  const isOwner = Boolean(user?.id && key && String(user.id) === String(key))

  return (
    <div className={depth > 0 ? "mt-3 pl-4 border-l-2 border-[#FFE5D9]/80" : ""}>
      <div className="flex gap-3">
        <div className="flex flex-col items-center shrink-0 pt-1">
          {hasReplies ? (
            <button
              type="button"
              onClick={() => onToggleCollapse(node.id)}
              className="w-6 h-6 rounded-md border border-[#FFE5D9] bg-white flex items-center justify-center text-[#E8907C] hover:bg-[#FFF8F6]"
              aria-label={collapsed ? "Expand replies" : "Collapse replies"}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-6 h-6" aria-hidden />
          )}
        </div>
        {profileHref ? (
          <Link
            to={profileHref}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F4A896] to-[#FFDDD2] flex items-center justify-center text-white text-sm shrink-0 overflow-hidden hover:opacity-90"
          >
            {photoShown ? (
              <img src={photoShown} alt="" className="w-full h-full object-cover" />
            ) : (
              nameShown?.[0] || "?"
            )}
          </Link>
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F4A896] to-[#FFDDD2] flex items-center justify-center text-white text-sm shrink-0">
            {nameShown?.[0] || "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              {profileHref ? (
                <Link to={profileHref} className="font-medium text-gray-800 text-sm hover:text-[#E8907C]">
                  {nameShown}
                </Link>
              ) : (
                <span className="font-medium text-gray-800 text-sm">{nameShown}</span>
              )}
              <span className="text-xs text-gray-400 ml-2" title={exact}>
                {rel}
              </span>
            </div>
            {isOwner && (
              <div className="shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="p-1 text-gray-400 hover:text-[#E8907C] rounded">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem
                      className="text-red-600 cursor-pointer focus:text-red-600"
                      onSelect={(e) => {
                        e.preventDefault()
                        onRequestDelete(node)
                      }}
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{node.content}</p>
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              className="text-xs text-[#E8907C] hover:underline inline-flex items-center gap-1"
              onClick={() => onReplyClick(node.id)}
            >
              <Reply className="w-3 h-3" /> Reply
            </button>
            {hasReplies && (
              <span className="text-xs text-gray-400">
                {children.length} {children.length === 1 ? "reply" : "replies"}
              </span>
            )}
          </div>
          {replyTo === node.id && (
            <div className="mt-2 flex gap-2 flex-col sm:flex-row">
              <Textarea
                value={replyText}
                onChange={(e) => onReplyTextChange(e.target.value)}
                placeholder="Write a reply..."
                className="min-h-[72px] rounded-xl text-sm flex-1"
              />
              <Button
                type="button"
                size="sm"
                className="self-end rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C] shrink-0"
                disabled={!canPostReply}
                onClick={() => onPostReply(node.id)}
              >
                Post
              </Button>
            </div>
          )}
        </div>
      </div>
      {hasReplies && !collapsed && (
        <div>
          {children.map((ch) => (
            <CommentNodeWithPost
              key={ch.id}
              node={ch}
              depth={depth + 1}
              byParent={byParent}
              replyTo={replyTo}
              onReplyClick={onReplyClick}
              replyText={replyText}
              onReplyTextChange={onReplyTextChange}
              user={user}
              onRequestDelete={onRequestDelete}
              collapsedIds={collapsedIds}
              onToggleCollapse={onToggleCollapse}
              onPostReply={onPostReply}
              canPostReply={canPostReply}
              profileById={profileById}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommentThread({ postId, post, comments, user, groupId = null, compact = false, locked = false, profileById = null }) {
  const queryClient = useQueryClient()
  const [topText, setTopText] = useState("")
  const [replyTo, setReplyTo] = useState(null)
  const [replyText, setReplyText] = useState("")
  const [collapsedIds, setCollapsedIds] = useState(() => new Set())
  const [deleteTarget, setDeleteTarget] = useState(null)

  const toggleCollapsed = useCallback((id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["postComments", postId] })
    queryClient.invalidateQueries({ queryKey: ["postDetail", postId] })
    queryClient.invalidateQueries({ queryKey: ["communityPosts"] })
    if (groupId) queryClient.invalidateQueries({ queryKey: ["groupPosts", groupId] })
  }, [queryClient, postId, groupId])

  const addComment = useMutation({
    mutationFn: async ({ content, parent_id }) => {
      await base44.entities.Comment.create({
        post_id: postId,
        content: content.trim(),
        author_name: user?.full_name || "Anonymous",
        parent_id: parent_id || null,
      })
      try {
        const nextCount = Math.max(post?.comments_count || 0, comments.length) + 1
        await base44.entities.CommunityPost.update(postId, {
          comments_count: nextCount,
        })
      } catch {
        /* comment row exists even if count update fails (e.g. RLS) */
      }
    },
    onSuccess: () => {
      setTopText("")
      setReplyText("")
      setReplyTo(null)
      invalidate()
    },
    onError: (e) => toast.error(e?.message || "Could not post comment"),
  })

  const deleteComment = useMutation({
    mutationFn: async (comment) => {
      const removed = countSubtreeNodes(comment.id, comments)
      await base44.entities.Comment.delete(comment.id)
      const baseline = Math.max(post?.comments_count || 0, comments.length)
      await base44.entities.CommunityPost.update(postId, {
        comments_count: Math.max(0, baseline - removed),
      })
    },
    onSuccess: () => {
      toast.success("Comment removed")
      setDeleteTarget(null)
      invalidate()
    },
    onError: () => toast.error("Could not delete comment"),
  })

  const byParent = useMemo(() => {
    const m = new Map()
    for (const c of comments) {
      const p = c.parent_id || "root"
      if (!m.has(p)) m.set(p, [])
      m.get(p).push(c)
    }
    for (const [, arr] of m) {
      arr.sort((a, b) => new Date(a.created_date || a.created_at) - new Date(b.created_date || b.created_at))
    }
    return m
  }, [comments])

  const handleReplyClick = useCallback((id) => {
    setReplyTo((prev) => (prev === id ? null : id))
    setReplyText("")
  }, [])

  const handleReplyTextChange = useCallback((v) => {
    setReplyText(v)
  }, [])

  const roots = byParent.get("root") || []

  if (locked) {
    return (
      <div className={compact ? "mt-4" : "mt-6"}>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          Join this group to read posts and leave comments.
        </div>
      </div>
    )
  }

  const subtreeCount = deleteTarget ? countSubtreeNodes(deleteTarget.id, comments) : 0
  const nested = subtreeCount > 1 ? subtreeCount - 1 : 0
  const deleteDescription =
    nested > 0
      ? `This will remove this comment and ${nested} nested ${nested === 1 ? "reply" : "replies"}. This cannot be undone.`
      : "This cannot be undone."

  return (
    <div className={compact ? "mt-4" : "mt-6"}>
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this comment?"
        description={deleteDescription}
        onConfirm={() => deleteTarget && deleteComment.mutate(deleteTarget)}
        pending={deleteComment.isPending}
      />
      <div className="rounded-2xl border border-[#FFE5D9]/60 bg-[#FFFBF9] p-3">
        <p className="text-xs text-gray-500 mb-2">Join the conversation</p>
        <div className="flex gap-2 flex-col sm:flex-row">
          <Textarea
            value={topText}
            onChange={(e) => setTopText(e.target.value)}
            placeholder="Share a thought or ask a question..."
            className="min-h-[88px] rounded-xl flex-1"
          />
          <Button
            type="button"
            className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C] sm:self-end shrink-0"
            disabled={!topText.trim() || addComment.isPending}
            onClick={() => addComment.mutate({ content: topText, parent_id: null })}
          >
            Post
          </Button>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {roots.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No replies yet. Be the first to respond 💕</p>
        ) : (
          roots.map((r) => (
            <CommentNodeWithPost
              key={r.id}
              node={r}
              depth={0}
              byParent={byParent}
              replyTo={replyTo}
              onReplyClick={handleReplyClick}
              replyText={replyText}
              onReplyTextChange={handleReplyTextChange}
              user={user}
              onRequestDelete={setDeleteTarget}
              collapsedIds={collapsedIds}
              onToggleCollapse={toggleCollapsed}
              onPostReply={(parentId) => addComment.mutate({ content: replyText, parent_id: parentId })}
              canPostReply={!!replyText.trim() && !addComment.isPending}
              profileById={profileById}
            />
          ))
        )}
      </div>
    </div>
  )
}
