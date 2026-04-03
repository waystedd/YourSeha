import React, { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { base44 } from '@/api/base44Client'
import HeroSection from '@/components/home/HeroSection'
import FeatureGrid from '@/components/home/FeatureGrid'
import CommunityPreview from '@/components/home/CommunityPreview'

export default function Home() {
  const navigate = useNavigate()

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me()
      } catch {
        return null
      }
    },
  })

  useEffect(() => {
    if (userLoading) return
    if (!user) return
    if (!user.role_selected) {
      navigate('/RoleSelection')
      return
    }
    if (user.role === 'psychologist') {
      navigate('/PsychologistDashboard')
    }
  }, [user, userLoading, navigate])

  const { data: appointments = [] } = useQuery({
    queryKey: ['upcomingAppointments'],
    queryFn: () => base44.entities.Appointment.filter({ status: 'upcoming' }, '-date', 5),
    enabled: !!user,
  })

  const { data: reminders = [] } = useQuery({
    queryKey: ['upcomingReminders'],
    queryFn: () => base44.entities.Reminder.filter({ is_completed: false }, 'date', 5),
    enabled: !!user,
  })

  const { data: postsRaw = [] } = useQuery({
    queryKey: ['communityPosts'],
    queryFn: () => base44.entities.CommunityPost.list('-created_date', 20),
    enabled: !!user,
  })
  const posts = postsRaw.filter((p) => !p.group_id)

  const { data: groups = [] } = useQuery({
    queryKey: ['communityGroups'],
    queryFn: () => base44.entities.CommunityGroup.list('-member_count', 5),
    enabled: !!user,
  })

  if (!user || userLoading) {
    return <div className="min-h-screen" />
  }

  const nextAppointment = appointments[0]
  const nextReminder = reminders[0]

  return (
    <div className="min-h-screen">
      <HeroSection user={user} nextAppointment={nextAppointment} nextReminder={nextReminder} />
      <FeatureGrid />
      <CommunityPreview posts={posts} groups={groups} />
    </div>
  )
}
