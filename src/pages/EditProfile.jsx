import React, { useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { base44 } from "@/api/base44Client"
import { BadgeCheck, Camera, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

const SPECIALTIES = ["Child Psychology", "Family Therapy", "Anxiety & Depression", "ASD Specialist"]

export default function EditProfile() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  })

  const isPsychologist = user?.role === "psychologist"

  const [form, setForm] = useState({
    full_name: "",
    profile_photo: "",
    num_children: "",
    children_conditions: [],
    conditionInput: "",
    is_licensed: false,
    specialty: "",
    bio: "",
    clinic_name: "",
    location: "",
    consultation_fee: "",
    years_experience: "",
    languages: ["Arabic", "English"],
  })

  useEffect(() => {
    if (!user) return
    setForm((f) => ({
      ...f,
      full_name: user.full_name || "",
      profile_photo: user.profile_photo || "",
      num_children: user.num_children ?? "",
      children_conditions: user.children_conditions || [],
      is_licensed: !!user.is_licensed,
      specialty: user.specialty || SPECIALTIES[0],
      bio: user.bio || "",
      clinic_name: user.clinic_name || "",
      location: user.location || "",
      consultation_fee: user.consultation_fee ?? "",
      years_experience: user.years_experience ?? "",
      languages: user.languages || ["Arabic", "English"],
    }))
  }, [user])

  const firstInitial = useMemo(() => (form.full_name ? form.full_name.charAt(0) : "U"), [form.full_name])

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file })
      setForm((f) => ({ ...f, profile_photo: file_url }))
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const patch = {
        full_name: form.full_name,
        profile_photo: form.profile_photo,
      }
      if (isPsychologist) {
        if (!form.full_name || !form.specialty) {
          toast.error("Name and profession are required")
          setSaving(false)
          return
        }
        Object.assign(patch, {
          is_licensed: form.is_licensed,
          specialty: form.specialty,
          bio: form.bio,
          clinic_name: form.clinic_name,
          location: form.location,
          consultation_fee: form.consultation_fee === "" ? undefined : Number(form.consultation_fee),
          years_experience: form.years_experience === "" ? undefined : Number(form.years_experience),
          languages: form.languages,
          onboarding_completed: true,
          profile_completed: Boolean(form.full_name && form.specialty && form.bio && form.clinic_name && form.location),
        })
      } else {
        Object.assign(patch, {
          num_children: form.num_children === "" ? undefined : Number(form.num_children),
          children_conditions: form.children_conditions,
        })
      }
      await base44.auth.updateMe(patch)
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      setSaved(true)
      toast.success("Profile updated")
      if (isPsychologist && patch.profile_completed) {
        setTimeout(() => navigate("/PsychologistDashboard"), 600)
      }
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Edit Profile</h1>
        <p className="text-gray-500 text-sm mb-6">{isPsychologist ? "Professional profile" : "Caregiver profile"}</p>

        <div className="bg-white rounded-3xl p-6 border border-[#FFE5D9]/50 mb-4">
          <h2 className="font-semibold text-gray-800 mb-4">Profile Picture</h2>
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#F4A896] to-[#FFDDD2] flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
                {form.profile_photo ? (
                  <img src={form.profile_photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-2xl">{firstInitial}</span>
                )}
              </div>
              {uploading ? (
                <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              ) : null}
            </div>
            <div>
              <label className="cursor-pointer">
                <div className="px-4 py-2 rounded-xl border-2 border-dashed border-[#FFE5D9] text-sm text-[#E8907C] hover:bg-[#FFF8F6] transition-colors flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Upload Photo
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 5MB</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#FFE5D9]/50 mb-4">
          <h2 className="font-semibold text-gray-800 mb-4">Basic Info</h2>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
          <Input
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            className="rounded-xl border-gray-200"
          />
        </div>

        {!isPsychologist ? (
          <div className="bg-white rounded-3xl p-6 border border-[#FFE5D9]/50 mb-4 space-y-4">
            <h2 className="font-semibold text-gray-800">Family Details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Number of Children</label>
              <Input
                type="number"
                min="0"
                value={form.num_children}
                onChange={(e) => setForm((f) => ({ ...f, num_children: e.target.value }))}
                className="rounded-xl border-gray-200 w-40"
                placeholder="e.g. 2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Children's Conditions</label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={form.conditionInput}
                  onChange={(e) => setForm((f) => ({ ...f, conditionInput: e.target.value }))}
                  className="rounded-xl border-gray-200"
                  placeholder="e.g. Autism, ADHD..."
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-[#FFE5D9] text-[#E8907C]"
                  onClick={() => {
                    const t = form.conditionInput.trim()
                    if (!t || form.children_conditions.includes(t)) return
                    setForm((f) => ({ ...f, children_conditions: [...f.children_conditions, t], conditionInput: "" }))
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.children_conditions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, children_conditions: f.children_conditions.filter((x) => x !== c) }))}
                    className="px-3 py-1 rounded-full text-sm bg-[#FFF8F6] border border-[#FFE5D9] text-[#E8907C]"
                  >
                    {c} ×
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {isPsychologist ? (
          <>
            <div className="bg-white rounded-3xl p-6 border border-[#FFE5D9]/50 mb-4">
              <div className="flex items-center justify-between">
                <div>
              <h2 className="font-semibold text-gray-800">Licensed Psychologist</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Display a verified badge on your profile</p>
                </div>
                <button
                  onClick={() => setForm((f) => ({ ...f, is_licensed: !f.is_licensed }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${form.is_licensed ? "bg-[#F4A896]" : "bg-gray-200"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_licensed ? "translate-x-7" : "translate-x-1"}`} />
                </button>
              </div>
              {form.is_licensed ? (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl">
                  <BadgeCheck className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-blue-700 font-medium">Verified badge will appear on your profile</span>
                </div>
              ) : null}
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#FFE5D9]/50 mb-4 space-y-5">
              <h2 className="font-semibold text-gray-800">Professional Details</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specialization *</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, specialty: s }))}
                      className={`px-3 py-1.5 rounded-xl text-sm border-2 transition-all ${
                        form.specialty === s ? "border-[#F4A896] bg-[#FFF8F6] text-[#E8907C]" : "border-gray-100 text-gray-600 hover:border-gray-200"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Professional Bio</label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  className="rounded-xl border-gray-200 min-h-[100px] resize-none"
                  placeholder="Tell patients about yourself..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Clinic Name</label>
                  <Input
                    value={form.clinic_name}
                    onChange={(e) => setForm((f) => ({ ...f, clinic_name: e.target.value }))}
                    className="rounded-xl border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    className="rounded-xl border-gray-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Consultation Fee (QAR)</label>
                  <Input
                    value={form.consultation_fee}
                    onChange={(e) => setForm((f) => ({ ...f, consultation_fee: e.target.value }))}
                    className="rounded-xl border-gray-200"
                    placeholder="e.g. 300"
                    type="number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Years of Experience</label>
                  <Input
                    value={form.years_experience}
                    onChange={(e) => setForm((f) => ({ ...f, years_experience: e.target.value }))}
                    className="rounded-xl border-gray-200"
                    placeholder="e.g. 8"
                    type="number"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Languages Spoken</label>
                <div className="flex flex-wrap gap-2">
                  {["Arabic", "English", "French", "Urdu", "Hindi", "Tagalog", "German", "Spanish"].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          languages: f.languages.includes(lang) ? f.languages.filter((l) => l !== lang) : [...f.languages, lang],
                        }))
                      }
                      className={`px-3 py-1.5 rounded-xl text-sm border ${form.languages.includes(lang) ? "border-[#F4A896] bg-[#FFF8F6] text-[#E8907C]" : "border-gray-200 text-gray-600"}`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}

        <Button
          onClick={handleSave}
          disabled={saving}
          className={`w-full h-12 rounded-2xl font-semibold transition-all ${
            saved ? "bg-green-500 hover:bg-green-500" : "bg-gradient-to-r from-[#F4A896] to-[#E8907C]"
          } text-white`}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Saved!
            </>
          ) : (
            "Save Profile"
          )}
        </Button>
      </div>
    </div>
  )
}

