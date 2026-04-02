import React, { useMemo, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { ArrowLeft, Heart, MessageCircle, Share2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export default function PostDetail() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const postId = useMemo(() => new URLSearchParams(location.search).get("id"), [location.search])
  const [text, setText] = useState("")
  const [shareOpen, setShareOpen] = useState(false)
  const shareLink = useMemo(() => `${window.location.origin}/PostDetail?id=${postId}`, [postId])

  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() })
  const { data: posts = [] } = useQuery({
    queryKey: ["communityPosts"],
    queryFn: async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
      const rawPosts = await base44.entities.CommunityPost.list("-created_date", 100);
      const authorIds = [...new Set(rawPosts.map(p => p.author_id).filter(Boolean))];
      let profileMap = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, profile_photo')
          .in('id', authorIds);
        profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      }
      return rawPosts.map(post => ({
        ...post,
        author_name: profileMap[post.author_id]?.full_name || 'Anonymous',
        author_photo: profileMap[post.author_id]?.profile_photo || null,
      }));
    },
  })
  const { data: comments = [] } = useQuery({
    queryKey: ["postComments", postId],
    queryFn: () => base44.entities.Comment.filter({ post_id: postId }, "-created_date", 100),
    enabled: !!postId,
  })

  const post = posts.find((p) => p.id === postId)

  const addComment = useMutation({
    mutationFn: async () => {
      await base44.entities.Comment.create({
        post_id: postId,
        content: text,
      })
      await base44.entities.CommunityPost.update(postId, { comments_count: (post?.comments_count || 0) + 1 })
    },
    onSuccess: () => {
      setText("")
      queryClient.invalidateQueries({ queryKey: ["postComments", postId] })
      queryClient.invalidateQueries({ queryKey: ["communityPosts"] })
    },
  })

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      toast.success("Link copied")
    } catch {
      toast.error("Could not copy link")
    }
  }

  if (!post) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <Link to="/Community" className="inline-flex items-center gap-2 text-[#25364f] hover:text-[#E8907C]">
          <ArrowLeft className="w-5 h-5" /> Back to Community
        </Link>

        <div className="bg-white rounded-3xl border border-[#FFE5D9]/60 p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F4A896] to-[#FFDDD2] flex items-center justify-center text-white font-bold">{post.author_name?.[0] || "A"}</div>
            <div>
              <p className="font-medium text-gray-800">{post.author_name}</p>
              <p className="text-gray-500">about 1 month ago</p>
            </div>
          </div>
          <h1 className="text-5xl font-semibold text-[#122745] leading-tight mb-5">{post.title}</h1>
          <p className="text-[#25364f] text-[34px] leading-relaxed">{post.content}</p>
          <div className="border-t mt-7 pt-5 flex items-center gap-8 text-[#4a5b74]">
            <span className="inline-flex items-center gap-2"><Heart className="w-5 h-5" /> {post.likes_count || 0} likes</span>
            <span className="inline-flex items-center gap-2"><MessageCircle className="w-5 h-5" /> {post.comments_count || 0} comments</span>
            <button onClick={() => setShareOpen(true)} className="inline-flex items-center gap-2 ml-auto hover:text-[#E8907C]">
              <Share2 className="w-5 h-5" /> Share
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#FFE5D9]/60 p-8">
          <h2 className="text-4xl font-semibold text-[#122745] mb-5">Comments</h2>
          <div className="flex gap-4 mb-5">
            <div className="w-12 h-12 rounded-full bg-[#F4A896] text-white flex items-center justify-center font-semibold">{user?.full_name?.[0] || "U"}</div>
            <div className="flex-1">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a supportive comment..." className="min-h-[110px] rounded-2xl" />
              <div className="flex justify-end mt-3">
                <Button onClick={() => addComment.mutate()} disabled={!text.trim() || addComment.isPending} className="rounded-2xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
                  <Send className="w-4 h-4 mr-2" /> Post
                </Button>
              </div>
            </div>
          </div>

          {comments.length === 0 ? (
            <p className="text-center text-[#4a5b74] mt-8">No comments yet. Be the first to share your thoughts! 💕</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="rounded-2xl bg-[#FFF8F6] p-4">
                  <p className="font-medium text-gray-800">{c.author_name}</p>
                  <p className="text-gray-600">{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Share "{post.title || "Post"}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input readOnly value={shareLink} className="rounded-xl" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setShareOpen(false)}>Done</Button>
              <Button onClick={copyLink} className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">Copy link</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

