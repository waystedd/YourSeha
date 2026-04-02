import React, { useMemo } from "react"
import { Link, useLocation } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { ArrowLeft, Check, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GroupDetail() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const groupId = useMemo(() => new URLSearchParams(location.search).get("id"), [location.search])

  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() })
  const { data: groups = [] } = useQuery({
    queryKey: ["communityGroups"],
    queryFn: () => base44.entities.CommunityGroup.list("-created_at", 50),
  })
  const { data: posts = [] } = useQuery({
    queryKey: ["groupPosts", groupId],
    queryFn: () => base44.entities.CommunityPost.filter({ group_id: groupId }, "-created_at", 100),
    enabled: !!groupId,
  })

  const group = groups.find((g) => g.id === groupId)
  const joined = !!group?.members?.includes(user?.email)

  const joinGroup = useMutation({
    mutationFn: async () => {
      if (!group || joined) return
      await base44.entities.CommunityGroup.update(group.id, {
        members: [...(group.members || []), user?.id],
        member_count: (group.member_count || 0) + 1,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["communityGroups"] }),
  })

  if (!group) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        <Link to="/Community" className="inline-flex items-center gap-2 text-[#25364f] hover:text-[#E8907C] mb-5">
          <ArrowLeft className="w-5 h-5" /> Back to Community
        </Link>

        <div className="rounded-3xl bg-[#F6B8A7] p-7 mb-7">
          <div className="flex items-start justify-between gap-5">
            <div>
              <h1 className="text-4xl font-semibold text-[#122745] mb-2">{group.name}</h1>
              <p className="text-[#25364f] text-2xl max-w-3xl">{group.description}</p>
              <p className="inline-flex items-center gap-2 text-[#25364f] mt-3"><Users className="w-4 h-4" /> {group.member_count || 0} members</p>
            </div>
            <Button
              onClick={() => joinGroup.mutate()}
              variant="outline"
              className={`rounded-2xl px-6 ${joined ? "border-green-300 text-green-700 bg-white" : "border-white text-[#E8907C] bg-white"}`}
            >
              <Check className="w-4 h-4 mr-2" /> {joined ? "Joined" : "Join Group"}
            </Button>
          </div>
        </div>

        <h2 className="text-3xl font-semibold text-[#122745] mb-4">Group Posts</h2>
        <div className="rounded-3xl border border-[#FFE5D9]/60 bg-white p-12 text-center">
          {posts.length === 0 ? (
            <p className="text-[#5B6D83] text-2xl">No posts in this group yet</p>
          ) : (
            <div className="space-y-3 text-left">
              {posts.map((p) => (
                <div key={p.id} className="p-4 rounded-2xl bg-[#FFF8F6]">
                  <p className="font-semibold text-gray-800">{p.title}</p>
                  <p className="text-gray-600">{p.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

