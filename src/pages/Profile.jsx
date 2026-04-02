import React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { Button } from "@/components/ui/button"

export default function Profile() {
  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() })
  const { data: users = [] } = useQuery({ queryKey: ["allUsers"], queryFn: () => base44.entities.User.list("-created_date", 200) })
  if (!user) return null
  const followers = users.filter((u) => (u.following || []).includes(user.id))
  const followingUsers = users.filter((u) => (user.following || []).includes(u.id))

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-3xl border border-[#FFE5D9]/60 p-6">
          <h1 className="text-3xl font-semibold text-gray-800">My Profile</h1>
          <p className="text-gray-500">{user.full_name} · {user.email}</p>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-2xl bg-[#FFF8F6] p-4 text-center">
              <p className="text-2xl font-bold text-[#E8907C]">{followers.length}</p>
              <p className="text-sm text-gray-600">Followers</p>
            </div>
            <div className="rounded-2xl bg-[#FFF8F6] p-4 text-center">
              <p className="text-2xl font-bold text-[#E8907C]">{followingUsers.length}</p>
              <p className="text-sm text-gray-600">Following</p>
            </div>
          </div>
          <div className="mt-5">
            <Link to="/EditProfile">
              <Button className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">Edit Profile</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

