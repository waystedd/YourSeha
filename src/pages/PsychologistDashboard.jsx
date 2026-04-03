import React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import {
  BarChart2,
  Calendar,
  Users,
  BookOpen,
  MessageCircle,
  Settings,
  Clock,
  CheckCircle,
  Star,
  ChevronRight,
} from "lucide-react"
import { motion } from "framer-motion"

export default function PsychologistDashboard() {
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  })

  const { data: appointments = [] } = useQuery({
    queryKey: ["allAppointments"],
    queryFn: () => base44.entities.Appointment.list("-date", 100),
  })

  const { data: resources = [] } = useQuery({
    queryKey: ["myResources", user?.id],
    queryFn: () => base44.entities.Resource.filter({ created_by: user?.id }),
    enabled: !!user?.id,
  })

  const upcoming = appointments.filter((a) => a.status === "upcoming")
  const completed = appointments.filter((a) => a.status === "completed")
  const uniquePatients = [...new Set(appointments.map((a) => a.user_id || a.user_email).filter(Boolean))]

  const firstName = user?.full_name?.split(" ")[0] || "Doctor"
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  const stats = [
    { label: "Upcoming Sessions", value: upcoming.length, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Completed Sessions", value: completed.length, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    { label: "Total Patients", value: uniquePatients.length, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Resources Shared", value: resources.length, icon: BookOpen, color: "text-[#E8907C]", bg: "bg-[#FFF8F6]" },
  ]

  const tools = [
    { label: "Appointments", desc: "Manage your schedule", icon: Calendar, path: "/PsychologistAppointments", grad: "from-blue-500 to-indigo-600" },
    { label: "Patients", desc: "View patient records", icon: Users, path: "/PsychologistPatients", grad: "from-purple-500 to-indigo-600" },
    { label: "Resources", desc: "Share articles & guides", icon: BookOpen, path: "/PsychologistResources", grad: "from-[#F4A896] to-[#E8907C]" },
    { label: "Community", desc: "Engage with mothers", icon: MessageCircle, path: "/Community", grad: "from-emerald-500 to-emerald-600" },
    { label: "Edit Profile", desc: "Update your details", icon: Settings, path: "/EditProfile", grad: "from-slate-500 to-slate-700" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F4FF] to-white py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg overflow-hidden">
              {user?.profile_photo ? (
                <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-xl">{String(firstName).charAt(0)}</span>
              )}
            </div>
            <div>
              <p className="text-gray-500 text-sm">{greeting},</p>
              <h1 className="text-2xl font-bold text-gray-800">Dr. {firstName} 👋</h1>
            </div>
            {user?.is_licensed ? (
              <div className="ml-auto hidden sm:flex">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium border border-blue-100">
                  <Star className="w-3 h-3" /> Verified Psychologist
                </span>
              </div>
            ) : null}
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
            >
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Professional Tools</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <Link
                key={tool.label}
                to={tool.path}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.grad} flex items-center justify-center mb-3 shadow-sm`}>
                  <tool.icon className="w-6 h-6 text-white" />
                </div>
                <p className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{tool.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{tool.desc}</p>
              </Link>
            ))}
          </div>
        </motion.div>

        {upcoming.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No upcoming sessions</p>
            <p className="text-sm text-gray-400 mt-1">Your schedule is clear for now</p>
            <Link to="/EditProfile" className="inline-block mt-4 text-sm text-blue-500 hover:underline">
              Update your availability →
            </Link>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Upcoming Sessions
              </h2>
              <Link to="/PsychologistAppointments" className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {upcoming.slice(0, 3).map((appt) => (
                <div key={appt.id} className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-medium text-sm">P</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">Patient Session</p>
                    <p className="text-xs text-gray-500">
                      {appt.date} at {appt.time}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-white text-blue-600 border border-blue-200">
                    {appt.meeting_provider === "zoom" || appt.session_type === "online" ? "Zoom" : (appt.session_type || appt.type || "Session")}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

