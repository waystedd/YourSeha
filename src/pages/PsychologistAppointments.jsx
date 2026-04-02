import React, { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { Calendar, Loader2 } from "lucide-react"

const tabs = [
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
]

export default function PsychologistAppointments() {
  const [active, setActive] = useState("upcoming")

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["allAppointments"],
    queryFn: () => base44.entities.Appointment.list("-date", 200),
  })

  const counts = useMemo(() => {
    const by = { upcoming: 0, completed: 0, cancelled: 0 }
    for (const a of appointments) {
      if (a.status && by[a.status] != null) by[a.status]++
    }
    return by
  }, [appointments])

  const filtered = useMemo(() => appointments.filter((a) => (a.status || "upcoming") === active), [appointments, active])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F4FF] to-white py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-500" /> Appointments
        </h1>

        <div className="flex gap-2 mb-6 bg-gray-100 rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                active === t.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label} ({counts[t.id] || 0})
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No {active} appointments</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((appt) => (
              <div key={appt.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">Patient Session</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {appt.date} · {appt.time}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                    {(appt.type || "online") === "online" ? "Online" : "In Person"}
                  </span>
                </div>
                {appt.notes ? <p className="mt-3 text-sm text-gray-600 italic">“{appt.notes}”</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

