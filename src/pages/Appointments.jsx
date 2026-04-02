import React, { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { base44 } from "@/api/base44Client"
import { Button } from "@/components/ui/button"
import { CalendarDays, Video, MapPin, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function Appointments() {
  const [tab, setTab] = useState("upcoming")
  const queryClient = useQueryClient()

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => base44.entities.Appointment.list("-date", 100),
  })

  const cancelAppointment = useMutation({
    mutationFn: (id) => base44.entities.Appointment.update(id, { status: "cancelled" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
      queryClient.invalidateQueries({ queryKey: ["upcomingAppointments"] })
      toast.success("Appointment cancelled")
    },
  })

  const grouped = useMemo(() => ({
    upcoming: appointments.filter(a => a.status === "upcoming"),
    completed: appointments.filter(a => a.status === "completed"),
    cancelled: appointments.filter(a => a.status === "cancelled"),
  }), [appointments])

  const items = grouped[tab]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-gray-800">My Appointments</h1>
            <p className="text-gray-600">Manage your scheduled sessions</p>
          </div>
          <Link to="/Psychologists">
            <Button className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">+ Book New</Button>
          </Link>
        </div>

        <div className="flex gap-4 text-sm mb-5 border-b border-[#FFE5D9]/50 pb-3">
          {[["upcoming", grouped.upcoming.length], ["completed", grouped.completed.length], ["cancelled", grouped.cancelled.length]].map(([k, c]) => (
            <button key={k} onClick={() => setTab(k)} className={`pb-2 border-b-2 transition-all capitalize ${tab === k ? "text-[#E8907C] border-[#E8907C] font-semibold" : "text-gray-500 border-transparent"}`}>
              {k} ({c})
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
            {items.map(a => (
              <div key={a.id} className="bg-white rounded-2xl border border-[#FFE5D9]/50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F4A896] to-[#FFDDD2] flex items-center justify-center">
                      <span className="text-white font-semibold">{(a.psychologist_name || "P").charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{a.psychologist_name || "Psychologist Session"}</p>
                      <p className="text-sm text-gray-500">{a.date} at {a.time}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {a.session_type === "online"
                          ? <span className="text-xs text-blue-600 flex items-center gap-1"><Video className="w-3 h-3" /> Online</span>
                          : <span className="text-xs text-gray-600 flex items-center gap-1"><MapPin className="w-3 h-3" /> In Person</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === "upcoming" ? "bg-green-50 text-green-600" : a.status === "completed" ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"}`}>
                          {a.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {a.status === "upcoming" && a.meeting_link && (
                      <a href={a.meeting_link} target="_blank" rel="noreferrer">
                        <Button size="sm" className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]"><Video className="w-4 h-4 mr-1" /> Join</Button>
                      </a>
                    )}
                    {a.status === "upcoming" && (
                      <Button size="sm" variant="outline" onClick={() => cancelAppointment.mutate(a.id)} className="rounded-xl border-red-200 text-red-500 hover:bg-red-50">Cancel</Button>
                    )}
                  </div>
                </div>
                {a.notes && <p className="mt-3 text-sm text-gray-500 italic pl-16">"{a.notes}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
