import React, { useMemo } from "react"
import { Link, useLocation } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { ArrowLeft, Users } from "lucide-react"

export default function UserPublicProfile() {
  const location = useLocation()
  const id = useMemo(() => new URLSearchParams(location.search).get("id"), [location.search])
  const { data: users = [] } = useQuery({ queryKey: ["allUsers"], queryFn: () => base44.entities.User.list("-created_date", 200) })
  const profile = users.find((u) => u.id === id)
  if (!profile) return null

  const followers = users.filter((u) => (u.following || []).includes(profile.id))
  const followingUsers = users.filter((u) => (profile.following || []).includes(u.id))

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Link to="/Community" className="inline-flex items-center gap-2 text-[#25364f] hover:text-[#E8907C] mb-5">
          <ArrowLeft className="w-5 h-5" /> Back
        </Link>
        <div className="bg-white rounded-3xl border border-[#FFE5D9]/60 p-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#F4A896] to-[#FFDDD2] flex items-center justify-center text-white text-2xl font-semibold">
              {profile.full_name?.charAt(0) || "U"}
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-gray-800">{profile.full_name}</h1>
              <p className="text-gray-500">{profile.email}</p>
              <p className="text-sm text-gray-500 mt-1 capitalize">{profile.role === "psychologist" ? "Psychologist" : "Caregiver"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-2xl bg-[#FFF8F6] p-4 text-center">
              <p className="text-2xl font-bold text-[#E8907C]">{followers.length}</p>
              <p className="text-sm text-gray-600 inline-flex items-center gap-1"><Users className="w-4 h-4" /> Followers</p>
            </div>
            <div className="rounded-2xl bg-[#FFF8F6] p-4 text-center">
              <p className="text-2xl font-bold text-[#E8907C]">{followingUsers.length}</p>
              <p className="text-sm text-gray-600 inline-flex items-center gap-1"><Users className="w-4 h-4" /> Following</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#FFE5D9]/60 p-4">
              <h2 className="font-semibold text-gray-800 mb-2">Followers</h2>
              <div className="space-y-2">
                {followers.length === 0 ? <p className="text-sm text-gray-400">No followers yet</p> : followers.map((u) => <p key={u.id} className="text-sm text-gray-700">{u.full_name}</p>)}
              </div>
            </div>
            <div className="rounded-2xl border border-[#FFE5D9]/60 p-4">
              <h2 className="font-semibold text-gray-800 mb-2">Following</h2>
              <div className="space-y-2">
                {followingUsers.length === 0 ? <p className="text-sm text-gray-400">Not following anyone yet</p> : followingUsers.map((u) => <p key={u.id} className="text-sm text-gray-700">{u.full_name}</p>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

