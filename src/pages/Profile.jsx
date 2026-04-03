import React, { useState } from "react"
import { Link } from "react-router-dom"
import { createPageUrl } from "@/utils"
import { useQuery } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BookOpen, Grid3x3, Users, BadgeCheck, MapPin, CircleDollarSign, Briefcase } from "lucide-react"

const GENDER_LABEL = {
  female: "Female",
  male: "Male",
  non_binary: "Non-binary",
  other: "Other",
}

export default function Profile() {
  const [tab, setTab] = useState("posts")
  const [followersOpen, setFollowersOpen] = useState(false)
  const [followingOpen, setFollowingOpen] = useState(false)

  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() })
  const { data: users = [] } = useQuery({ queryKey: ["allUsers"], queryFn: () => base44.entities.User.list("-created_date", 300) })

  const { data: myPosts = [] } = useQuery({
    queryKey: ["myCommunityPosts", user?.id],
    queryFn: () => base44.entities.CommunityPost.filter({ author_id: user.id }, "-created_date", 120),
    enabled: !!user?.id,
  })
  const communityPosts = (myPosts || []).filter((p) => !p.group_id)

  const { data: myResources = [] } = useQuery({
    queryKey: ["myProfileResources", user?.id],
    queryFn: () => base44.entities.Resource.filter({ created_by: user.id }, "-created_date", 80),
    enabled: !!user?.id,
  })

  if (!user) return null

  const followers = users.filter((u) => (u.following || []).includes(user.id))
  const followingUsers = users.filter((u) => (user.following || []).includes(u.id))
  const isPsych = user.role === "psychologist"
  const langs = Array.isArray(user.languages) ? user.languages : []

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-3xl border border-[#FFE5D9]/60 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-2">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#F4A896] to-[#FFDDD2] flex items-center justify-center text-white text-2xl font-bold overflow-hidden shrink-0">
              {user.profile_photo ? (
                <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
              ) : (
                user.full_name?.charAt(0) || "U"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold text-gray-900">{user.full_name || "Profile"}</h1>
                {isPsych && user.is_licensed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-100">
                    <BadgeCheck className="w-3.5 h-3.5" /> Licensed psychologist
                  </span>
                ) : null}
              </div>
              <p className="text-gray-500 text-sm mt-1">{user.email}</p>
              {isPsych && user.specialty ? <p className="text-[#E8907C] font-medium mt-1">{user.specialty}</p> : null}
            </div>
          </div>

          {isPsych ? (
            <div className="mt-6 space-y-4 text-sm text-gray-700 border-t border-[#FFE5D9]/60 pt-5">
              {user.bio ? (
                <div>
                  <h2 className="font-semibold text-gray-900 mb-1">About</h2>
                  <p className="whitespace-pre-wrap leading-relaxed">{user.bio}</p>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Add a bio in Edit Profile to tell clients about yourself.</p>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                {user.gender ? (
                  <p>
                    <span className="text-gray-500">Gender</span>{" "}
                    <span className="font-medium">{GENDER_LABEL[user.gender] || user.gender}</span>
                  </p>
                ) : null}
                {user.clinic_name ? (
                  <p className="flex items-start gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <span>{user.clinic_name}</span>
                  </p>
                ) : null}
                {user.location ? (
                  <p className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <span>{user.location}</span>
                  </p>
                ) : null}
                {user.consultation_fee != null ? (
                  <p className="flex items-center gap-2">
                    <CircleDollarSign className="w-4 h-4 text-gray-400" />
                    <span>{user.consultation_fee} QAR / session</span>
                  </p>
                ) : null}
                {user.years_experience != null ? <p className="text-gray-600">{user.years_experience}+ years experience</p> : null}
              </div>
              {langs.length > 0 ? (
                <div>
                  <h2 className="font-semibold text-gray-900 mb-2">Languages spoken</h2>
                  <div className="flex flex-wrap gap-2">
                    {langs.map((l) => (
                      <span key={l} className="px-3 py-1 rounded-full bg-[#FFF8F6] border border-[#FFE5D9] text-[#E8907C] text-sm">
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2 mt-6 text-center border-t border-b border-[#FFE5D9]/60 py-4">
            <button type="button" onClick={() => setTab("posts")} className="rounded-xl py-2 hover:bg-[#FFF8F6]">
              <p className="text-xl font-bold text-gray-900">{communityPosts.length}</p>
              <p className="text-xs text-gray-500">Posts</p>
            </button>
            <button type="button" onClick={() => setFollowersOpen(true)} className="rounded-xl py-2 hover:bg-[#FFF8F6]">
              <p className="text-xl font-bold text-gray-900">{followers.length}</p>
              <p className="text-xs text-gray-500 inline-flex items-center gap-1 justify-center">
                <Users className="w-3 h-3" /> Followers
              </p>
            </button>
            <button type="button" onClick={() => setFollowingOpen(true)} className="rounded-xl py-2 hover:bg-[#FFF8F6]">
              <p className="text-xl font-bold text-gray-900">{followingUsers.length}</p>
              <p className="text-xs text-gray-500">Following</p>
            </button>
          </div>

          <div className="flex gap-2 mt-6 border-b border-gray-100">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium border-b-2 ${tab === "posts" ? "border-[#E8907C] text-[#E8907C]" : "border-transparent text-gray-500"}`}
              onClick={() => setTab("posts")}
            >
              <Grid3x3 className="w-4 h-4 inline mr-1" /> Posts
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium border-b-2 ${tab === "resources" ? "border-[#E8907C] text-[#E8907C]" : "border-transparent text-gray-500"}`}
              onClick={() => setTab("resources")}
            >
              <BookOpen className="w-4 h-4 inline mr-1" /> Resources
            </button>
          </div>

          <div className="mt-4 space-y-3 min-h-[120px]">
            {tab === "posts" ? (
              communityPosts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No community posts yet.</p>
              ) : (
                communityPosts.map((p) => (
                  <Link
                    key={p.id}
                    to={`${createPageUrl("PostDetail")}?id=${p.id}`}
                    className="block rounded-2xl border border-[#FFE5D9]/60 p-4 hover:bg-[#FFFBF9]"
                  >
                    <p className="font-medium text-gray-800">{p.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">{p.content}</p>
                  </Link>
                ))
              )
            ) : myResources.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No resources yet.</p>
            ) : (
              myResources.map((r) => (
                <Link key={r.id} to={`/ResourceDetail?id=${r.id}`} className="block rounded-2xl border border-[#FFE5D9]/60 p-4 hover:bg-[#FFFBF9]">
                  <p className="font-medium text-gray-800">{r.title}</p>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">{r.description}</p>
                </Link>
              ))
            )}
          </div>

          <div className="mt-6">
            <Link to="/EditProfile">
              <Button className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">Edit Profile</Button>
            </Link>
          </div>
        </div>
      </div>

      <Dialog open={followersOpen} onOpenChange={setFollowersOpen}>
        <DialogContent className="rounded-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Followers</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {followers.length === 0 ? (
              <p className="text-sm text-gray-500">No followers yet.</p>
            ) : (
              followers.map((u) => (
                <Link key={u.id} to={`${createPageUrl("UserPublicProfile")}?id=${u.id}`} className="block text-sm text-gray-800 hover:text-[#E8907C]">
                  {u.full_name}
                </Link>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={followingOpen} onOpenChange={setFollowingOpen}>
        <DialogContent className="rounded-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Following</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {followingUsers.length === 0 ? (
              <p className="text-sm text-gray-500">Not following anyone yet.</p>
            ) : (
              followingUsers.map((u) => (
                <Link key={u.id} to={`${createPageUrl("UserPublicProfile")}?id=${u.id}`} className="block text-sm text-gray-800 hover:text-[#E8907C]">
                  {u.full_name}
                </Link>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
