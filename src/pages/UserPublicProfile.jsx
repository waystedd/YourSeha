import React, { useMemo, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { createPageUrl } from "@/utils"
import { useQuery } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { ArrowLeft, Users, Grid3x3, BookOpen } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function UserPublicProfile() {
  const location = useLocation()
  const id = useMemo(() => new URLSearchParams(location.search).get("id"), [location.search])
  const [followersOpen, setFollowersOpen] = useState(false)
  const [followingOpen, setFollowingOpen] = useState(false)
  const [tab, setTab] = useState("posts")

  const { data: viewer } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  })

  const { data: profileRows = [], isLoading } = useQuery({
    queryKey: ["publicProfile", id],
    queryFn: () => base44.entities.User.filter({ id }, "-created_date", 1),
    enabled: !!id,
  })
  const profile = profileRows[0]

  const { data: users = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list("-created_date", 300),
    enabled: !!profile,
  })

  const { data: theirPosts = [] } = useQuery({
    queryKey: ["publicProfilePosts", id],
    queryFn: () => base44.entities.CommunityPost.filter({ author_id: id }, "-created_date", 120),
    enabled: !!id,
  })
  const communityPosts = (theirPosts || []).filter((p) => !p.group_id)

  const { data: theirResources = [] } = useQuery({
    queryKey: ["publicProfileResources", id],
    queryFn: () => base44.entities.Resource.filter({ created_by: id }, "-created_date", 80),
    enabled: !!id,
  })

  const followers = profile ? users.filter((u) => (u.following || []).includes(profile.id)) : []
  const followingUsers = profile ? users.filter((u) => (profile.following || []).includes(u.id)) : []

  const isOwn = Boolean(viewer?.id && profile?.id && viewer.id === profile.id)

  if (!id) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8 px-4 text-center">
        <p className="text-gray-600">No profile selected.</p>
        <Link to={createPageUrl("Community")} className="text-[#E8907C] mt-2 inline-block">
          Back to Community
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
        <div className="max-w-4xl mx-auto px-4 animate-pulse space-y-4">
          <div className="h-8 w-40 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-100 rounded-3xl" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8 px-4 text-center">
        <p className="text-gray-600">No profile found for this link.</p>
        <Link to={createPageUrl("Community")} className="text-[#E8907C] mt-2 inline-block">
          Back to Community
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Link to={createPageUrl("Community")} className="inline-flex items-center gap-2 text-[#25364f] hover:text-[#E8907C] mb-5">
          <ArrowLeft className="w-5 h-5" /> Back
        </Link>
        <div className="bg-white rounded-3xl border border-[#FFE5D9]/60 p-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#F4A896] to-[#FFDDD2] flex items-center justify-center text-white text-2xl font-semibold overflow-hidden">
              {profile.profile_photo ? (
                <img src={profile.profile_photo} alt="" className="w-full h-full object-cover" />
              ) : (
                profile.full_name?.charAt(0) || "U"
              )}
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-gray-800">{profile.full_name}</h1>
              {isOwn ? <p className="text-gray-500 text-sm">{profile.email}</p> : null}
              <p className="text-sm text-gray-500 mt-1 capitalize">{profile.role === "psychologist" ? "Psychologist" : "Caregiver"}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-6 text-center border-t border-b border-[#FFE5D9]/60 py-4">
            <button type="button" onClick={() => setTab("posts")} className="rounded-xl py-2 hover:bg-[#FFF8F6]">
              <p className="text-xl font-bold text-gray-900">{communityPosts.length}</p>
              <p className="text-xs text-gray-500">Posts</p>
            </button>
            {isOwn ? (
              <button type="button" onClick={() => setFollowersOpen(true)} className="rounded-xl py-2 hover:bg-[#FFF8F6]">
                <p className="text-xl font-bold text-gray-900">{followers.length}</p>
                <p className="text-xs text-gray-500 inline-flex items-center gap-1 justify-center">
                  <Users className="w-3 h-3" /> Followers
                </p>
              </button>
            ) : (
              <div className="rounded-xl py-2">
                <p className="text-xl font-bold text-gray-900">{followers.length}</p>
                <p className="text-xs text-gray-500">Followers</p>
              </div>
            )}
            {isOwn ? (
              <button type="button" onClick={() => setFollowingOpen(true)} className="rounded-xl py-2 hover:bg-[#FFF8F6]">
                <p className="text-xl font-bold text-gray-900">{followingUsers.length}</p>
                <p className="text-xs text-gray-500">Following</p>
              </button>
            ) : (
              <div className="rounded-xl py-2">
                <p className="text-xl font-bold text-gray-900">{followingUsers.length}</p>
                <p className="text-xs text-gray-500">Following</p>
              </div>
            )}
          </div>

          {!isOwn ? (
            <p className="text-xs text-gray-400 mt-3 text-center">Follower and following lists are private. Only you can see names on your own profile.</p>
          ) : null}

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

          <div className="mt-4 space-y-3">
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
            ) : theirResources.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No resources published.</p>
            ) : (
              theirResources.map((r) => (
                <Link
                  key={r.id}
                  to={`/ResourceDetail?id=${r.id}`}
                  className="block rounded-2xl border border-[#FFE5D9]/60 p-4 hover:bg-[#FFFBF9]"
                >
                  <p className="font-medium text-gray-800">{r.title}</p>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">{r.description}</p>
                </Link>
              ))
            )}
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
