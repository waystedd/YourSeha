import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Heart, Stethoscope, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { toast } from "sonner"

export default function RoleSelection() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState("user")
  const [saving, setSaving] = useState(false)

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  })

  useEffect(() => {
    if (user?.role) setSelected(user.role === "psychologist" ? "psychologist" : "user")
  }, [user?.role])

  const handleContinue = async () => {
    setSaving(true)
    try {
      await base44.auth.updateMe({
        role: selected,
        role_selected: true,
        onboarding_completed: selected === "psychologist" ? false : true,
        profile_completed: selected === "psychologist" ? (user?.role === "psychologist" ? !!user?.profile_completed : false) : true,
      })
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      if (selected === "psychologist") {
        toast.info("Please complete your professional profile to continue")
        navigate("/EditProfile")
      } else {
        navigate("/Home")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#FFF8F6] to-[#FFE5D9] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F4A896] to-[#E8907C] flex items-center justify-center mx-auto mb-3 shadow-md">
            <span className="text-white font-bold">Y</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome to YourSeha</h1>
          <p className="text-gray-500 text-sm mt-1">Who are you? This helps us tailor your experience.</p>
        </div>

        <div className="space-y-4 mb-7">
          <button
            onClick={() => setSelected("user")}
            className={`w-full p-5 rounded-3xl border-2 text-left transition-all ${
              selected === "user" ? "bg-gradient-to-r from-[#FFF8F6] to-[#FFE5D9] border-[#F4A896] shadow-md" : "bg-white border-gray-100"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F4A896] to-[#E8907C] flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">Caregiver / Mother 💕</p>
                <p className="text-xs text-gray-500 mt-0.5">Access community support, journaling, reminders, and connect with psychologists.</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelected("psychologist")}
            className={`w-full p-5 rounded-3xl border-2 text-left transition-all ${
              selected === "psychologist" ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400 shadow-md" : "bg-white border-gray-100"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">Psychologist 🩺</p>
                <p className="text-xs text-gray-500 mt-0.5">Manage appointments, patients, and share professional resources.</p>
              </div>
            </div>
          </button>
        </div>

        <Button onClick={handleContinue} disabled={saving} className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <>Continue as {selected === "user" ? "Caregiver" : "Psychologist"} <ChevronRight className="w-4 h-4 ml-2" /></>}
        </Button>
      </div>
    </div>
  )
}

