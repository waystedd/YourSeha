import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { base44 } from '@/api/base44Client'
import { Button } from '@/components/ui/button'
import { CalendarDays, Video, Loader2, CircleDollarSign, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'

export default function Appointments() {
  const [tab, setTab] = useState('upcoming')
  const queryClient = useQueryClient()

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-date', 100),
  })

  const cancelAppointment = useMutation({
    mutationFn: async (appointment) => {
      await base44.entities.Appointment.update(appointment.id, { status: 'cancelled' })
      if (appointment.availability_slot_id) {
        await base44.entities.PsychologistAvailability.update(appointment.availability_slot_id, { is_booked: false })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] })
      queryClient.invalidateQueries({ queryKey: ['psychologistAvailability'] })
      toast.success('Appointment cancelled')
    },
    onError: (error) => toast.error(error?.message || 'Could not cancel this appointment'),
  })

  const grouped = useMemo(() => ({
    upcoming: appointments.filter((a) => a.status === 'upcoming'),
    completed: appointments.filter((a) => a.status === 'completed'),
    cancelled: appointments.filter((a) => a.status === 'cancelled'),
  }), [appointments])

  const items = grouped[tab]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-gray-800">My Appointments</h1>
            <p className="text-gray-600">Your bookings are confirmed without online payment for now. Session prices are shown for reference.</p>
          </div>
          <Link to="/Psychologists">
            <Button className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">+ Book New</Button>
          </Link>
        </div>

        <div className="flex gap-4 text-sm mb-5 border-b border-[#FFE5D9]/50 pb-3">
          {[['upcoming', grouped.upcoming.length], ['completed', grouped.completed.length], ['cancelled', grouped.cancelled.length]].map(([key, count]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-2 border-b-2 transition-all capitalize ${tab === key ? 'text-[#E8907C] border-[#E8907C] font-semibold' : 'text-gray-500 border-transparent'}`}
            >
              {key} ({count})
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#E8907C]" /></div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#FFE5D9]/50 p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#FFF8F6] flex items-center justify-center mx-auto mb-3"><CalendarDays className="w-6 h-6 text-[#E8907C]" /></div>
            <p className="text-gray-700 font-medium">No {tab} appointments</p>
            <p className="text-gray-500 text-sm mt-1">Book a session to start your wellness journey</p>
            <Link to="/Psychologists"><Button className="mt-4 rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">Find a Psychologist</Button></Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((appointment) => {
              const hasZoom = appointment.meeting_provider === 'zoom' || appointment.session_type === 'online'
              return (
                <div key={appointment.id} className="bg-white rounded-2xl border border-[#FFE5D9]/50 p-5">
                  <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F4A896] to-[#FFDDD2] flex items-center justify-center">
                        <span className="text-white font-semibold">{(appointment.psychologist_name || 'P').charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{appointment.psychologist_name || 'Psychologist Session'}</p>
                        <p className="text-sm text-gray-500">{appointment.date} at {appointment.time}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                          {hasZoom ? (
                            <span className="text-blue-600 flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50"><Video className="w-3 h-3" /> Zoom session</span>
                          ) : null}
                          {appointment.quoted_price ? (
                            <span className="text-gray-700 flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50"><CircleDollarSign className="w-3 h-3" /> {appointment.quoted_price} QAR</span>
                          ) : null}
                          <span className={`px-2 py-1 rounded-full ${appointment.status === 'upcoming' ? 'bg-green-50 text-green-600' : appointment.status === 'completed' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                            {appointment.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {appointment.status === 'upcoming' && appointment.meeting_link ? (
                        <a href={appointment.meeting_link} target="_blank" rel="noreferrer">
                          <Button size="sm" className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]"><Video className="w-4 h-4 mr-1" /> Join Zoom</Button>
                        </a>
                      ) : null}
                      {appointment.status === 'upcoming' ? (
                        <Button size="sm" variant="outline" onClick={() => cancelAppointment.mutate(appointment)} className="rounded-xl border-red-200 text-red-500 hover:bg-red-50">Cancel</Button>
                      ) : null}
                    </div>
                  </div>

                  {appointment.status === 'upcoming' && !appointment.meeting_link && hasZoom ? (
                    <div className="mt-4 ml-16 rounded-2xl bg-[#FFF8F6] border border-[#FFE5D9]/60 px-4 py-3 text-sm text-gray-600 flex items-start gap-2">
                      <LinkIcon className="w-4 h-4 mt-0.5 text-[#E8907C]" />
                      <span>Your psychologist will add the Zoom link from their dashboard once the session is confirmed.</span>
                    </div>
                  ) : null}

                  {appointment.notes ? <p className="mt-3 text-sm text-gray-500 italic pl-16">“{appointment.notes}”</p> : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
