import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, MessageCircle, Share2, Megaphone, Calendar, Clock, MapPin, Tag, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, format } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';

function isMeetupType(post) {
  return post.post_type === 'meetup' || post.post_type === 'webinar';
}

export default function PostCard({ post, user, onLike, index = 0, groupId = null }) {
  const queryClient = useQueryClient();
  const authorKey = post.author_id || post.created_by_id;
  const isOwner = !!(user?.id && authorKey && user.id === authorKey);
  const isLiked = Boolean(
    user?.id && Array.isArray(post.liked_by) && post.liked_by.map(String).includes(String(user.id)),
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title || '');
  const [editContent, setEditContent] = useState(post.content || '');

  const shareLink = useMemo(() => `${window.location.origin}${createPageUrl('PostDetail')}?id=${post.id}`, [post.id]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const updatePost = useMutation({
    mutationFn: async () => {
      await base44.entities.CommunityPost.update(post.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
      });
    },
    onSuccess: () => {
      toast.success('Post updated');
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
      queryClient.invalidateQueries({ queryKey: ['postDetail', post.id] });
      if (groupId) queryClient.invalidateQueries({ queryKey: ['groupPosts', groupId] });
    },
    onError: () => toast.error('Could not update post'),
  });

  const deletePost = useMutation({
    mutationFn: async () => {
      await base44.entities.CommunityPost.delete(post.id);
    },
    onSuccess: () => {
      toast.success('Post removed');
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
      queryClient.invalidateQueries({ queryKey: ['postDetail', post.id] });
      if (groupId) queryClient.invalidateQueries({ queryKey: ['groupPosts', groupId] });
    },
    onError: () => toast.error('Could not delete post'),
  });

  const openEdit = () => {
    setEditTitle(post.title || '');
    setEditContent(post.content || '');
    setEditOpen(true);
  };

  const timeLabel = post.created_date
    ? formatDistanceToNow(new Date(post.created_date), { addSuffix: true })
    : '';
  const exactTime = post.created_date ? format(new Date(post.created_date), 'MMM d, yyyy · h:mm a') : '';

  const profileHref =
    authorKey ? `${createPageUrl('UserPublicProfile')}?id=${authorKey}` : '#';

  const specialType = post.post_type === 'announcement' || isMeetupType(post);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`rounded-3xl border overflow-hidden hover:shadow-md transition-all ${
        specialType
          ? 'bg-gradient-to-r from-[#FFF8F6] to-[#FFE5D9] border-[#F4A896]/20'
          : 'bg-white border-[#FFE5D9]/50 hover:border-[#F4A896]/30'
      }`}
    >
      <div className="p-6">
        {(post.post_type === 'announcement' || isMeetupType(post)) && (
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="w-4 h-4 text-[#E8907C]" />
            <span className="text-xs font-medium text-[#E8907C] uppercase tracking-wide">
              {isMeetupType(post) ? '📅 Meetup' : '📢 Announcement'}
            </span>
          </div>
        )}

        <div className="flex items-start gap-3">
          {authorKey ? (
            <Link
              to={profileHref}
              onClick={(e) => e.stopPropagation()}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F4A896] to-[#FFDDD2] flex items-center justify-center overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              {post.author_photo ? (
                <img src={post.author_photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-medium text-sm">{post.author_name?.charAt(0) || 'A'}</span>
              )}
            </Link>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F4A896] to-[#FFDDD2] flex items-center justify-center overflow-hidden flex-shrink-0">
              {post.author_photo ? (
                <img src={post.author_photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-medium text-sm">{post.author_name?.charAt(0) || 'A'}</span>
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                {authorKey ? (
                  <Link
                    to={profileHref}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium text-gray-800 hover:text-[#E8907C] transition-colors"
                  >
                    {post.author_name || 'Anonymous'}
                  </Link>
                ) : (
                  <span className="font-medium text-gray-800">{post.author_name || 'Anonymous'}</span>
                )}
                {timeLabel && (
                  <span className="text-xs text-gray-400" title={exactTime}>
                    {timeLabel}
                  </span>
                )}
              </div>
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-[#E8907C] hover:bg-[#FFF8F6] shrink-0"
                      aria-label="Post options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem onClick={openEdit} className="cursor-pointer">
                      <Pencil className="w-4 h-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setDeleteOpen(true);
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

            <Link to={createPageUrl('PostDetail') + `?id=${post.id}`} className="block group">
              <h3 className="font-semibold text-gray-800 mt-1 group-hover:text-[#E8907C] transition-colors">{post.title}</h3>
              <p className="text-gray-600 mt-1 line-clamp-3 text-sm">{post.content}</p>
            </Link>

            {post.image_url && (
              <Link to={createPageUrl('PostDetail') + `?id=${post.id}`}>
                <img src={post.image_url} alt="" className="mt-3 rounded-2xl w-full object-cover max-h-64" />
              </Link>
            )}

            {post.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="rounded-full text-xs border-[#FFE5D9] text-[#E8907C]">
                    <Tag className="w-2.5 h-2.5 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {isMeetupType(post) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {post.meetup_date && (
                  <Badge variant="outline" className="rounded-full text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {post.meetup_date}
                  </Badge>
                )}
                {post.meetup_time && (
                  <Badge variant="outline" className="rounded-full text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {post.meetup_time}
                  </Badge>
                )}
                {post.meetup_location && (
                  <Badge variant="outline" className="rounded-full text-xs">
                    <MapPin className="w-3 h-3 mr-1" />
                    {post.meetup_location}
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 mt-4">
              <button
                type="button"
                onClick={() => {
                  if (!user?.id) {
                    toast.error("Sign in to like posts")
                    return
                  }
                  onLike(post)
                }}
                className={`flex items-center gap-1.5 text-sm transition-colors ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                <span>{post.likes_count || 0}</span>
              </button>
              <Link
                to={createPageUrl('PostDetail') + `?id=${post.id}`}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#E8907C] transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{post.comments_count || 0}</span>
              </Link>
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#E8907C] transition-colors ml-auto"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </div>
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
            <DialogTitle>Share "{post.title || 'Post'}"</DialogTitle>
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
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="rounded-xl min-h-[120px]"
              placeholder="Content"
            />
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
    </motion.div>
  );
}
