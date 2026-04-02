import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, MessageCircle, Share2, Megaphone, Calendar, Clock, MapPin, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function PostCard({ post, user, onLike, index = 0 }) {
  const isLiked = post.liked_by?.includes(user?.email);
  const [shareOpen, setShareOpen] = useState(false);
  const shareLink = useMemo(() => `${window.location.origin}${createPageUrl('PostDetail')}?id=${post.id}`, [post.id]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`rounded-3xl border overflow-hidden hover:shadow-md transition-all ${
        post.post_type === 'announcement' || post.post_type === 'meetup'
          ? 'bg-gradient-to-r from-[#FFF8F6] to-[#FFE5D9] border-[#F4A896]/20'
          : 'bg-white border-[#FFE5D9]/50 hover:border-[#F4A896]/30'
      }`}
    >
      <div className="p-6">
        {(post.post_type === 'announcement' || post.post_type === 'meetup') && (
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="w-4 h-4 text-[#E8907C]" />
            <span className="text-xs font-medium text-[#E8907C] uppercase tracking-wide">
              {post.post_type === 'meetup' ? '📅 Meetup' : '📢 Announcement'}
            </span>
          </div>
        )}

        <div className="flex items-start gap-3">
          <Link
            to={createPageUrl('UserPublicProfile') + `?id=${post.created_by_id || ''}`}
            onClick={e => e.stopPropagation()}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F4A896] to-[#FFDDD2] flex items-center justify-center overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            {post.author_photo ? (
              <img src={post.author_photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-medium text-sm">{post.author_name?.charAt(0) || 'A'}</span>
            )}
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={createPageUrl('UserPublicProfile') + `?id=${post.created_by_id || ''}`}
                onClick={e => e.stopPropagation()}
                className="font-medium text-gray-800 hover:text-[#E8907C] transition-colors"
              >
                {post.author_name || 'Anonymous'}
              </Link>
              <span className="text-xs text-gray-400">
                {post.created_date && formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
              </span>
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
                {post.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="rounded-full text-xs border-[#FFE5D9] text-[#E8907C]">
                    <Tag className="w-2.5 h-2.5 mr-1" />{tag}
                  </Badge>
                ))}
              </div>
            )}

            {post.post_type === 'meetup' && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {post.meetup_date && <Badge variant="outline" className="rounded-full text-xs"><Calendar className="w-3 h-3 mr-1" />{post.meetup_date}</Badge>}
                {post.meetup_time && <Badge variant="outline" className="rounded-full text-xs"><Clock className="w-3 h-3 mr-1" />{post.meetup_time}</Badge>}
                {post.meetup_location && <Badge variant="outline" className="rounded-full text-xs"><MapPin className="w-3 h-3 mr-1" />{post.meetup_location}</Badge>}
              </div>
            )}

            <div className="flex items-center gap-4 mt-4">
              <button
                onClick={() => onLike(post)}
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
              <button onClick={() => setShareOpen(true)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#E8907C] transition-colors ml-auto">
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </div>
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
    </motion.div>
  );
}

