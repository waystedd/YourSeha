import React, { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import HeroSection from '@/components/home/HeroSection';
import FeatureGrid from '@/components/home/FeatureGrid';
import CommunityPreview from '@/components/home/CommunityPreview';

export default function Home() {
  const navigate = useNavigate();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try { return await base44.auth.me(); } catch { return null; }
    },
  });

  useEffect(() => {
    if (userLoading || !user) return;
    if (!user.role_selected) {
      navigate('/RoleSelection');
      return;
    }
    if (user.role === 'psychologist') {
      navigate('/PsychologistDashboard');
    }
  }, [user, userLoading, navigate]);

  const { data: appointments = [] } = useQuery({
    queryKey: ['upcomingAppointments'],
    queryFn: () => base44.entities.Appointment.filter({ status: 'upcoming' }, '-date', 5),
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['upcomingReminders'],
    queryFn: () => base44.entities.Reminder.filter({ is_completed: false }, 'date', 5),
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['communityPosts'],
    queryFn: async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
      const rawPosts = await base44.entities.CommunityPost.list('-created_date', 10);
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

  const { data: groups = [] } = useQuery({
    queryKey: ['communityGroups'],
    queryFn: () => base44.entities.CommunityGroup.list('-member_count', 5),
  });

  const nextAppointment = appointments[0];
  const nextReminder = reminders[0];

  return (
    <div className="min-h-screen">
      <HeroSection
        user={user}
        nextAppointment={nextAppointment}
        nextReminder={nextReminder}
      />
      <FeatureGrid />
      <CommunityPreview posts={posts} groups={groups} />
    </div>
  );
}

