import React, { useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { ArrowLeft, Heart, MapPin, Star, UserPlus, MessageCircle, Calendar, ChevronLeft, ChevronRight, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

export default function PsychologistProfile() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const psychId = useMemo(() => new URLSearchParams(location.search).get("id"), [location.search])

  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() })
  const { data: psychologists = [] } = useQuery({ queryKey: ["psychologists"], queryFn: () => base44.entities.Psychologist.list("-rating", 100) })
  const { data: saved = [] } = useQuery({
    queryKey: ["savedPsychologists", user?.id],
    queryFn: () => base44.entities.SavedPsychologist.filter({ user_id: user?.id }, "-created_at", 100),
    enabled: !!user?.email,
  })

  const psychologist = psychologists.find((p) => p.id === psychId)
  const isConnected = saved.some((s) => s.psychologist_id === psychId)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [monthOffset, setMonthOffset] = useState(0)
  const [booking, setBooking] = useState({
    session_type: "online",
    date: "",
    time: "",
    notes: "",
  })

  const connect = useMutation({
    mutationFn: async () => {
      if (isConnected) return
      await base44.entities.SavedPsychologist.create({
        
        psychologist_id: psychId,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["savedPsychologists", user?.id] }),
  })

  const openMessage = useMutation({
    mutationFn: async () => {
      const conversations = await base44.entities.Conversation.list("-updated_date", 100)
      let existing = conversations.find((c) => c.psychologist_id === psychId && (c.participant_a === user?.id || c.participant_b === user?.id))
      if (!existing) {
        existing = await base44.entities.Conversation.create({
          title: psychologist?.name || "Conversation",
          psychologist_id: psychId,
          
          last_message: "Start your conversation",
          
          unread_count: 0,
        })
      }
      return existing
    },
    onSuccess: (conversation) => navigate(`/Chat?id=${conversation.id}`),
  })

  const bookAppointment = useMutation({
    mutationFn: async () => {
      if (!booking.date || !booking.time) throw new Error("Please choose date and time")
      await base44.entities.Appointment.create({
        psychologist_id: psychId,
        psychologist_name: psychologist.name,
        
        date: booking.date,
        time: booking.time,
        session_type: booking.session_type,
        notes: booking.notes,
        status: "upcoming",
      })
    },
    onSuccess: () => {
      setBookingOpen(false)
      setBooking({ session_type: "online", date: "", time: "", notes: "" })
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
      queryClient.invalidateQueries({ queryKey: ["upcomingAppointments"] })
      toast.success("Appointment booked")
      navigate("/Appointments")
    },
    onError: (e) => toast.error(e?.message || "Could not book appointment"),
  })

  if (!psychologist) return null

  const baseDate = new Date()
  baseDate.setMonth(baseDate.getMonth() + monthOffset, 1)
  const monthName = baseDate.toLocaleString("en-US", { month: "long", year: "numeric" })
  const startDay = baseDate.getDay()
  const totalDays = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate()
  const prevMonthDays = new Date(baseDate.getFullYear(), baseDate.getMonth(), 0).getDate()
  const cells = []
  for (let i = 0; i < startDay; i++) {
    const d = prevMonthDays - startDay + i + 1
    const dt = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, d)
    cells.push({ day: d, date: dt.toISOString().slice(0, 10), muted: true })
  }
  for (let d = 1; d <= totalDays; d++) {
    const dt = new Date(baseDate.getFullYear(), baseDate.getMonth(), d)
    cells.push({ day: d, date: dt.toISOString().slice(0, 10), muted: false })
  }
  while (cells.length % 7 !== 0) {
    const d = cells.length - (startDay + totalDays) + 1
    const dt = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, d)
    cells.push({ day: d, date: dt.toISOString().slice(0, 10), muted: true })
  }
  const slots = ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-5xl mx-auto px-4 space-y-5">
        <Link to="/Psychologists" className="inline-flex items-center gap-2 text-[#25364f] hover:text-[#E8907C]">
          <ArrowLeft className="w-5 h-5" /> Back to Directory
        </Link>

        <div className="bg-white rounded-3xl border border-[#FFE5D9]/60 p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-5">
              <div className="w-32 h-32 rounded-3xl overflow-hidden bg-[#FFE5D9]">
                {psychologist.photo ? <img src={psychologist.photo} alt="" className="w-full h-full object-cover" /> : null}
              </div>
              <div>
                <h1 className="text-5xl font-semibold text-[#122745]">{psychologist.name}</h1>
                <p className="text-3xl text-[#25364f]">{psychologist.specialty}</p>
                <div className="flex items-center gap-3 text-2xl mt-2">
                  <span className="inline-flex items-center gap-1 text-amber-500"><Star className="w-5 h-5 fill-current" /> {psychologist.rating}</span>
                  <span className="text-[#6b7a90]">({psychologist.reviews_count})</span>
                  <span className="text-[#6b7a90]">12+ years</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3 text-xl">
                  {psychologist.available_now ? <span className="px-3 py-1 rounded-full bg-green-50 text-green-600">● Available Now</span> : null}
                  {psychologist.online_available ? <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600">▣ Online Sessions</span> : null}
                  <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-700 inline-flex items-center gap-1"><MapPin className="w-4 h-4" /> {psychologist.location}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => openMessage.mutate()} className="rounded-2xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
                <MessageCircle className="w-4 h-4 mr-2" /> {isConnected ? "Message" : "Connect"}
              </Button>
              <Button
                onClick={() => connect.mutate()}
                variant="outline"
                className={`rounded-2xl ${isConnected ? "border-green-300 text-green-600" : "border-[#FFE5D9] text-[#E8907C]"}`}
              >
                <UserPlus className="w-4 h-4 mr-2" /> {isConnected ? "Connected" : "Connect"}
              </Button>
              <Button variant="outline" size="icon" className="rounded-2xl border-[#FFE5D9]"><Heart className="w-4 h-4" /></Button>
            </div>
          </div>

          <div className="border-t mt-6 pt-5">
            <h2 className="text-3xl font-semibold text-[#122745] mb-2">About</h2>
            <p className="text-2xl text-[#25364f]">{psychologist.bio}</p>
          </div>
          <div className="border-t mt-6 pt-5">
            <h2 className="text-3xl font-semibold text-[#122745] mb-2">Practice Location</h2>
            <p className="text-2xl text-[#25364f]">Enaya Clinic</p>
            <p className="text-2xl text-[#6b7a90]">{psychologist.location}</p>
          </div>
          <div className="border-t mt-6 pt-5">
            <h2 className="text-3xl font-semibold text-[#122745] mb-2">Languages</h2>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full border">Arabic</span>
              <span className="px-3 py-1 rounded-full border">English</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#FFE5D9]/60 p-7">
          <h3 className="text-4xl font-semibold text-[#122745]">Book an Appointment</h3>
          <p className="text-3xl text-[#25364f] mb-4">350 QAR per session</p>
          <Button onClick={() => setBookingOpen(true)} className="w-full h-14 rounded-3xl bg-gradient-to-r from-[#F4A896] to-[#E8907C] text-2xl">
            <Calendar className="w-5 h-5 mr-2" /> Schedule Appointment
          </Button>
        </div>
      </div>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="sm:max-w-[720px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Book with {psychologist.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">Session Type</label>
              <Select value={booking.session_type} onValueChange={(v) => setBooking((b) => ({ ...b, session_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online"><span className="inline-flex items-center"><Video className="w-4 h-4 mr-2" /> Online Session</span></SelectItem>
                  <SelectItem value="in_person">In-Person Session</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Select Date</label>
              <div className="mt-1 border rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <button onClick={() => setMonthOffset((o) => o - 1)} className="w-8 h-8 rounded-lg border flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="font-medium">{monthName}</span>
                  <button onClick={() => setMonthOffset((o) => o + 1)} className="w-8 h-8 rounded-lg border flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-7 gap-2 text-sm text-center">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => <div key={d} className="text-gray-400">{d}</div>)}
                  {cells.map((c) => (
                    <button
                      key={`${c.date}-${c.day}`}
                      onClick={() => setBooking((b) => ({ ...b, date: c.date }))}
                      className={`h-9 rounded-lg ${c.muted ? "text-gray-300" : "text-gray-700"} ${booking.date === c.date ? "border border-[#F4A896] text-[#E8907C] bg-[#FFF8F6]" : "hover:bg-gray-50"}`}
                    >
                      {c.day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Select Time</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {slots.map((slot) => (
                  <button key={slot} onClick={() => setBooking((b) => ({ ...b, time: slot }))} className={`h-10 rounded-xl border ${booking.time === slot ? "border-[#F4A896] bg-[#FFF8F6] text-[#E8907C]" : "border-gray-200"}`}>
                    {slot}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Additional Notes (Optional)</label>
              <Textarea value={booking.notes} onChange={(e) => setBooking((b) => ({ ...b, notes: e.target.value }))} className="mt-1" placeholder="Any specific concerns or topics you'd like to discuss..." />
            </div>
            <Button disabled={!booking.date || !booking.time || bookAppointment.isPending} onClick={() => bookAppointment.mutate()} className="w-full h-12 rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
              Confirm Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

