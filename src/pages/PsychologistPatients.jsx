import React, { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { Users, Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function PsychologistPatients() {
  const [search, setSearch] = useState("")

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["allAppointments"],
    queryFn: () => base44.entities.Appointment.list("-date", 500),
  })

  const patients = useMemo(() => {
    const map = new Map()
    for (const appt of appointments) {
      const key = appt.created_by || "anonymous"
      const entry = map.get(key) || { key, email: appt.created_by || "", sessions: 0, lastSession: null }
      entry.sessions++
      if (!entry.lastSession || String(appt.date) > String(entry.lastSession)) entry.lastSession = appt.date
      map.set(key, entry)
    }
    const list = Array.from(map.values())
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter((p) => p.email.toLowerCase().includes(q))
  }, [appointments, search])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F4FF] to-white py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Users className="w-6 h-6 text-purple-500" /> Patients
        </h1>
        <p className="text-gray-500 text-sm mb-6">Patients who have booked sessions with you</p>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search patients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-gray-200"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : patients.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No patients yet</p>
            <p className="text-sm text-gray-400 mt-1">Patients will appear here once they book sessions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {patients.map((p) => (
              <div key={p.key} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold">P</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{p.email || "Anonymous Patient"}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {p.sessions} session{p.sessions === 1 ? "" : "s"}{p.lastSession ? ` · Last: ${p.lastSession}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

