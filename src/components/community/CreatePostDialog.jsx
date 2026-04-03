import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Image, Tag, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const SUGGESTED_TAGS = ['ASD Tips', 'Self-Care', 'Early Intervention', 'Education', 'Therapy', 'Emotional Support', 'Daily Life'];

export default function CreatePostDialog({ open, onOpenChange, user, onSuccess, groupId = null }) {
  const [form, setForm] = useState({ title: '', content: '', post_type: 'regular', image_url: '', tags: [] });
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef();

  const addTag = (tag) => {
    const t = tag.trim();
    if (t && !form.tags.includes(t)) {
      setForm(f => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput('');
  };

  const removeTag = (tag) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, image_url: file_url }));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.content) return;
    setSubmitting(true);
    try {
      await base44.entities.CommunityPost.create({
        ...form,
        author_name: user?.full_name || 'Anonymous',
        author_photo: user?.profile_photo,
        ...(groupId ? { group_id: groupId } : {}),
      });
      toast.success('Post shared! 🎉');
      setForm({ title: '', content: '', post_type: 'regular', image_url: '', tags: [] });
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{groupId ? 'Post in this group' : 'Share with the Community'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <Input
            placeholder="Give your post a title..."
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="rounded-xl border-[#FFE5D9] focus:border-[#F4A896]"
          />
          <Textarea
            placeholder="What's on your mind? Share your thoughts, wins, or ask for support..."
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            className="rounded-xl border-[#FFE5D9] focus:border-[#F4A896] min-h-[120px] resize-none"
          />

          <div>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleImageUpload} />
            {form.image_url ? (
              <div className="relative">
                <img src={form.image_url} alt="" className="w-full rounded-2xl max-h-48 object-cover" />
                <button onClick={() => setForm(f => ({ ...f, image_url: '' }))} className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[#FFE5D9] text-sm text-gray-500 hover:border-[#F4A896] hover:text-[#E8907C] transition-colors w-full justify-center"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                {uploading ? 'Uploading...' : 'Add Image / Video'}
              </button>
            )}
          </div>

          <div>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add a tag..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag(tagInput))}
                className="rounded-xl border-[#FFE5D9] text-sm h-8"
              />
              <Button size="sm" variant="outline" onClick={() => addTag(tagInput)} className="rounded-xl border-[#FFE5D9] h-8 px-3">
                <Tag className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {SUGGESTED_TAGS.map(tag => (
                <button key={tag} onClick={() => addTag(tag)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.tags.includes(tag) ? 'bg-[#FFE5D9] border-[#F4A896] text-[#E8907C]' : 'border-gray-200 text-gray-500 hover:border-[#F4A896]'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {form.tags.map(tag => (
                  <Badge key={tag} className="bg-[#FFF8F6] text-[#E8907C] border border-[#FFE5D9] hover:bg-[#FFE5D9] cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Select value={form.post_type} onValueChange={v => setForm(f => ({ ...f, post_type: v }))}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Post type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="regular">Regular Post</SelectItem>
              <SelectItem value="announcement">📢 Announcement</SelectItem>
              <SelectItem value="meetup">📅 Meetup</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleSubmit}
            disabled={!form.title || !form.content || submitting}
            className="w-full rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C] h-11"
          >
            {submitting ? 'Sharing...' : 'Share Post'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

