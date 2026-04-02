import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import PostCard from '@/components/community/PostCard';
import CreatePostDialog from '@/components/community/CreatePostDialog';

export default function Community() {
  const queryClient = useQueryClient();
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

const { data: posts = [], isLoading: postsLoading } = useQuery({
  queryKey: ['communityPosts'],
  queryFn: async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
    const rawPosts = await base44.entities.CommunityPost.list('-created_at', 50);
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
});

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['communityGroups'],
    queryFn: () => base44.entities.CommunityGroup.list('-created_at', 20),
  });

  const createGroup = useMutation({
    mutationFn: async (data) => {
      // FIX: members stores UUIDs, not emails. Use user.id
      await base44.entities.CommunityGroup.create({
        ...data,
        members: user?.id ? [user.id] : [],
        member_count: 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityGroups'] });
      toast.success('Group created! 🎉');
      setCreateGroupOpen(false);
      setNewGroup({ name: '', description: '' });
    },
    onError: (err) => toast.error(err.message || 'Failed to create group'),
  });

  const likePost = useMutation({
    mutationFn: async (post) => {
      const likedBy = post.liked_by || [];
      // FIX: liked_by stores UUIDs, not emails
      const userId = user?.id;
      const isLiked = likedBy.includes(userId);
      await base44.entities.CommunityPost.update(post.id, {
        likes_count: isLiked ? Math.max((post.likes_count || 1) - 1, 0) : (post.likes_count || 0) + 1,
        liked_by: isLiked ? likedBy.filter(e => e !== userId) : [...likedBy, userId],
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['communityPosts'] }),
    onError: (err) => toast.error(err.message || 'Failed to like post'),
  });

  const joinGroup = useMutation({
    mutationFn: async (group) => {
      const members = group.members || [];
      // FIX: compare by UUID not email
      if (!members.includes(user?.id)) {
        await base44.entities.CommunityGroup.update(group.id, {
          members: [...members, user.id],
          member_count: (group.member_count || 0) + 1,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityGroups'] });
      toast.success('Joined group! Welcome! 💕');
    },
    onError: (err) => toast.error(err.message || 'Failed to join group'),
  });

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
            <h2 className="text-lg font-semibold text-gray-800">Recent Posts</h2>

            {postsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-3xl p-6 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                        <div className="h-5 w-48 bg-gray-200 rounded mb-2"></div>
                        <div className="h-16 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center">
                <p className="text-gray-500 mb-4">No posts yet. Be the first to share!</p>
                <Button onClick={() => setCreatePostOpen(true)} className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
                  Create Post
                </Button>
              </div>
            ) : (
              posts.map((post, idx) => (
                <PostCard
                  key={post.id}
                  post={post}
                  user={user}
                  onLike={likePost.mutate}
                  index={idx}
                />
              ))
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Support Groups</h2>

            {groupsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                    <div className="h-5 w-32 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-full bg-gray-200 rounded"></div>
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
                  to={createPageUrl('GroupDetail') + `?id=${group.id}`}
                  className="block bg-white rounded-2xl p-4 border border-[#FFE5D9]/50 hover:shadow-md hover:border-[#F4A896]/30 transition-all"
                >
                  <h3 className="font-medium text-gray-800">{group.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{group.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Users className="w-3 h-3" /> {group.member_count || 0} members
                    </span>
                    {group.members?.includes(user?.id) ? (
                      <Badge className="bg-green-50 text-green-600 hover:bg-green-50 rounded-full text-xs">
                        <Check className="w-3 h-3 mr-1" /> Joined
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.preventDefault(); joinGroup.mutate(group); }}
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
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['communityPosts'] })}
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
              {createGroup.isPending ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
