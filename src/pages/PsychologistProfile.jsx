import React, { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { base44 } from '@/api/base44Client'
import {
  ArrowLeft,
  Heart,
  MapPin,
  Star,
  UserPlus,
  MessageCircle,
  Video,
  BadgeCheck,
  CircleDollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function PsychologistProfile() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const psychId = useMemo(() => new URLSearchParams(location.search).get('id'), [location.search])

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() })
  const { data: psychologists = [] } = useQuery({
    queryKey: ['psychologists'],
    queryFn: () => base44.entities.Psychologist.list('-rating', 100),
  })

  const { data: saved = [] } = useQuery({
    queryKey: ['savedPsychologists', user?.id],
    queryFn: () => base44.entities.SavedPsychologist.filter({ user_id: user?.id }, '-created_date', 100),
    enabled: !!user?.id,
  })

  const { data: availability = [] } = useQuery({
    queryKey: ['psychologistAvailability', psychId],
    queryFn: () => base44.entities.PsychologistAvailability.filter(
      { psychologist_id: psychId, is_booked: false },
      'date',
      100
    ),
    enabled: !!psychId,
  })

  const psychologist = psychologists.find((item) => item.id === psychId)
  const savedRecord = saved.find((item) => item.psychologist_id === psychId)
  const isConnected = !!savedRecord

  const [bookingOpen, setBookingOpen] = useState(false)
  const [booking, setBooking] = useState({ date: '', time: '', notes: '' })

  const groupedSlots = useMemo(() => {
    const map = new Map()
    availability.forEach((slot) => {
      if (!map.has(slot.date)) map.set(slot.date, [])
      map.get(slot.date).push(slot)
    })
    return Array.from(map.entries())
  }, [availability])

  const connect = useMutation({
    mutationFn: async () => {
      if (isConnected && savedRecord?.id) {
        return base44.entities.SavedPsychologist.delete(savedRecord.id)
      }
      return base44.entities.SavedPsychologist.create({ psychologist_id: psychId })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savedPsychologists', user?.id] }),
  })

  const openMessage = useMutation({
    mutationFn: async () => {
      const conversations = await base44.entities.Conversation.list('-updated_date', 100)
      const peerKey = (a, b) => (a && b ? [String(a), String(b)].sort().join('|') : null)
      const me = user?.id
      const psychUserId = psychologist?.user_id
      let existing
      if (me && psychUserId) {
        existing = conversations.find(
          (c) =>
            c.psychologist_id === psychId &&
            peerKey(c.participant_a, c.participant_b) === peerKey(me, psychUserId),
        )
      } else {
        existing = conversations.find((c) => c.psychologist_id === psychId)
      }

      if (!existing) {
        existing = await base44.entities.Conversation.create({
          title: psychologist?.name || 'Conversation',
          psychologist_id: psychId,
          last_message: 'Start your conversation',
          last_message_at: new Date().toISOString(),
          unread_count_a: 0,
          unread_count_b: 0,
        })
      }

      return existing
    },
    onSuccess: (conversation) => navigate(`/Chat?id=${conversation.id}`),
  })

  const bookAppointment = useMutation({
    mutationFn: async () => {
      const slot = availability.find(
        (item) => item.date === booking.date && item.time === booking.time
      )

      if (!slot) {
        throw new Error('Please choose an available date and time')
      }

      const appointment = await base44.entities.Appointment.create({
        psychologist_id: psychId,
        psychologist_name: psychologist.name,
        availability_slot_id: slot.id,
        date: booking.date,
        time: booking.time,
        session_type: 'online',
        meeting_provider: 'zoom',
        quoted_price: psychologist.consultation_fee || 200,
        notes: booking.notes,
        status: 'upcoming',
      })

      await base44.entities.PsychologistAvailability.update(slot.id, { is_booked: true })

      if (psychologist?.user_id) {
        await base44.entities.Notification.create({
          user_id: psychologist.user_id,
          title: 'New Zoom booking',
          message: `${booking.date} at ${booking.time} — please confirm the session and add the Zoom link when ready.`,
        })
      }

      return appointment
    },
    onSuccess: () => {
      setBookingOpen(false)
      setBooking({ date: '', time: '', notes: '' })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] })
      queryClient.invalidateQueries({ queryKey: ['psychologistAvailability', psychId] })
      toast.success('Zoom booking confirmed. The psychologist can now add the meeting link from their dashboard.')
      navigate('/Appointments')
    },
    onError: (error) => toast.error(error?.message || 'Could not book appointment'),
  })

  if (!psychologist) return null

  const sessionFee = psychologist.consultation_fee || 200

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-5xl mx-auto px-4 space-y-5">
        <Link to="/Psychologists" className="inline-flex items-center gap-2 text-[#25364f] hover:text-[#E8907C]">
          <ArrowLeft className="w-5 h-5" /> Back to Directory
        </Link>

        <div className="bg-white rounded-3xl border border-[#FFE5D9]/60 p-7">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-28 h-28 rounded-3xl overflow-hidden bg-[#FFE5D9] flex items-center justify-center">
                {psychologist.photo ? (
                  <img src={psychologist.photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl text-white">👩‍⚕️</span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-4xl font-semibold text-[#122745]">{psychologist.name}</h1>
                  {psychologist.is_licensed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-600">
                      <BadgeCheck className="w-4 h-4" /> Verified
                    </span>
                  ) : null}
                </div>

                <p className="text-xl text-[#25364f] mt-1">{psychologist.specialty}</p>

                <div className="flex items-center gap-3 text-lg mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-amber-500">
                    <Star className="w-5 h-5 fill-current" /> {psychologist.rating}
                  </span>
                  <span className="text-[#6b7a90]">({psychologist.reviews_count})</span>
                  {psychologist.years_experience ? (
                    <span className="text-[#6b7a90]">{psychologist.years_experience}+ years</span>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 mt-3 text-sm">
                  {psychologist.available_now ? (
                    <span className="px-3 py-1 rounded-full bg-green-50 text-green-600">
                      Available Now
                    </span>
                  ) : null}

                  {psychologist.online_available ? (
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 inline-flex items-center gap-1">
                      <Video className="w-4 h-4" /> Zoom Sessions
                    </span>
                  ) : null}

                  {psychologist.location ? (
                    <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-700 inline-flex items-center gap-1">
                      <MapPin className="w-4 h-4" /> {psychologist.location}
                    </span>
                  ) : null}

                  <span className="px-3 py-1 rounded-full bg-[#FFF8F6] text-[#E8907C] inline-flex items-center gap-1">
                    <CircleDollarSign className="w-4 h-4" /> {sessionFee} QAR
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => openMessage.mutate()} className="rounded-2xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
                <MessageCircle className="w-4 h-4 mr-2" /> {isConnected ? 'Message' : 'Start Chat'}
              </Button>

              <Button
                onClick={() => connect.mutate()}
                variant="outline"
                className={`rounded-2xl ${isConnected ? 'border-green-300 text-green-600' : 'border-[#FFE5D9] text-[#E8907C]'}`}
              >
                <UserPlus className="w-4 h-4 mr-2" /> {isConnected ? 'Connected' : 'Connect'}
              </Button>

              <Button variant="outline" size="icon" className="rounded-2xl border-[#FFE5D9]">
                <Heart className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="border-t mt-6 pt-5 space-y-5">
            <div>
              <h2 className="text-2xl font-semibold text-[#122745] mb-2">About</h2>
              <p className="text-[#25364f]">
                {psychologist.bio || 'Professional support for caregivers and families.'}
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-[#122745] mb-2">Languages</h2>
              <div className="flex flex-wrap gap-2">
                {(psychologist.languages || ['Arabic', 'English']).map((language) => (
                  <span
                    key={language}
                    className="px-3 py-1 rounded-full border border-[#FFE5D9] text-sm text-gray-700"
                  >
                    {language}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#FFE5D9]/60 p-7">
          <h3 className="text-2xl font-semibold text-[#122745]">Book a Zoom Appointment</h3>
          <p className="text-lg text-[#25364f] mb-2">{sessionFee} QAR per session</p>
          <p className="text-sm text-gray-500 mb-5">
            No online payment is required right now. Confirm the booking first, then the psychologist can add the Zoom link from their dashboard.
          </p>

          <div className="space-y-3 mb-5">
            <h4 className="font-medium text-gray-800">Upcoming available slots</h4>
            {groupedSlots.length === 0 ? (
              <p className="text-sm text-gray-500">No available slots yet.</p>
            ) : (
              groupedSlots.slice(0, 4).map(([date, slots]) => (
                <div key={date} className="rounded-2xl bg-[#FFF8F6] p-4">
                  <p className="font-medium text-gray-800 mb-2">{date}</p>
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => (
                      <span
                        key={slot.id}
                        className="px-3 py-1 rounded-full bg-white border border-[#FFE5D9] text-sm text-[#25364f]"
                      >
                        {slot.time}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <Button
            onClick={() => setBookingOpen(true)}
            disabled={groupedSlots.length === 0}
            className="rounded-2xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]"
          >
            Book Appointment
          </Button>
        </div>
      </div>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="sm:max-w-[720px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Book with {psychologist.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#FFE5D9]/60 bg-[#FFF8F6] p-4 space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-medium text-gray-800">Session format:</span> Zoom session
              </p>
              <p>
                <span className="font-medium text-gray-800">Session fee:</span> {sessionFee} QAR
              </p>
              <p className="text-gray-500">
                No online payment is enabled yet. This booking only records the agreed session price.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600">Date</label>
                <Input
                  type="date"
                  value={booking.date}
                  onChange={(e) =>
                    setBooking((state) => ({
                      ...state,
                      date: e.target.value,
                      time: '',
                    }))
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Time</label>
                <select
                  value={booking.time}
                  onChange={(e) => setBooking((state) => ({ ...state, time: e.target.value }))}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={!booking.date}
                >
                  <option value="">Select time</option>
                  {availability
                    .filter((slot) => slot.date === booking.date)
                    .map((slot) => (
                      <option key={slot.id} value={slot.time}>
                        {slot.time}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600">Additional Notes (Optional)</label>
              <Textarea
                value={booking.notes}
                onChange={(e) => setBooking((state) => ({ ...state, notes: e.target.value }))}
                className="mt-1"
                placeholder="Any specific concerns or topics you'd like to discuss..."
              />
            </div>

            <Button
              disabled={!booking.date || !booking.time || bookAppointment.isPending}
              onClick={() => bookAppointment.mutate()}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]"
            >
              Confirm Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
