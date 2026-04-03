import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { Search, Sparkles, Clock, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"

const CATEGORY_LABELS = [
  ["all", "All"],
  ["asd", "ASD / Tips"],
  ["mental_wellness", "Mental Wellness"],
  ["burnout_stress", "Burnout & Stress"],
  ["sleep_energy", "Sleep & Energy"],
  ["relationships", "Relationships"],
  ["emotional_regulation", "Emotional Regulation"],
  ["work_life_balance", "Work-Life Balance"],
  ["self_care", "Self Care"],
]

const NORMALIZED = {
  asd: "asd",
  "asd tips": "asd",
  asd_tips: "asd",
  anxiety: "mental_wellness",
  depression: "mental_wellness",
  therapy_tips: "mental_wellness",
  therapytips: "mental_wellness",
  mindfulness: "self_care",
  parenting: "relationships",
  sleep_energy: "sleep_energy",
  burnout_stress: "burnout_stress",
  emotional_regulation: "emotional_regulation",
  work_life_balance: "work_life_balance",
  self_care: "self_care",
  sensory: "mental_wellness",
  communication: "relationships",
}

function normalizeCategory(value) {
  const raw = String(value || "").trim().toLowerCase().replace(/[\s&-]+/g, "_")
  return NORMALIZED[raw] || raw || "mental_wellness"
}

function prettyCategory(value) {
  const normalized = normalizeCategory(value)
  return CATEGORY_LABELS.find(([key]) => key === normalized)?.[1] || "General"
}

export default function Resources() {
  const [audience, setAudience] = useState("mothers")
  const [category, setCategory] = useState("all")
  const [query, setQuery] = useState("")

  const { data: resources = [] } = useQuery({
    queryKey: ["resources"],
    queryFn: () => base44.entities.Resource.list("-created_date", 100),
  })

  const { data: authorProfiles = [] } = useQuery({
    queryKey: ["directoryProfiles"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
  })
  const authorById = useMemo(() => new Map(authorProfiles.map((p) => [p.id, p])), [authorProfiles])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return resources.filter((resource) => {
      const t = resource.target
      const targetOk = !t || t === "all" || t === audience
      const categoryOk = category === "all" || normalizeCategory(resource.category) === category
      const text = `${resource.title || ""} ${resource.description || ""} ${resource.content || ""}`.toLowerCase()
      const textOk = !q || text.includes(q)
      return targetOk && categoryOk && textOk
    })
  }, [resources, audience, category, query])

  const recommended = filtered.slice(0, 6)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-800 mb-2">Resources</h1>
          <p className="text-gray-600">Wellness guides and support materials for caregivers and children 💕</p>
        </div>

        <div className="bg-white rounded-3xl border border-[#FFE5D9]/50 p-5 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setAudience("mothers")} className={`px-4 py-2 rounded-full text-sm ${audience === "mothers" ? "bg-[#F4A896] text-white" : "bg-[#FFF8F6] text-gray-600 border border-[#FFE5D9]"}`}>
                For Caregivers
              </button>
              <button onClick={() => setAudience("children")} className={`px-4 py-2 rounded-full text-sm ${audience === "children" ? "bg-[#F4A896] text-white" : "bg-[#FFF8F6] text-gray-600 border border-[#FFE5D9]"}`}>
                For Children
              </button>
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search resources..." className="pl-9 rounded-xl" />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Filter className="w-4 h-4 text-[#E8907C]" /> Category
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_LABELS.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    category === key
                      ? "bg-[#FFF8F6] border-[#F4A896] text-[#E8907C]"
                      : "border-[#FFE5D9] text-gray-600 hover:bg-[#FFF8F6]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#E8907C]" /> Recommended for You
        </h2>

        {recommended.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#FFE5D9]/50 p-10 text-center text-gray-400">
            No resources found matching your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {recommended.map((resource) => (
              <Link
                key={resource.id}
                to={`/ResourceDetail?id=${resource.id}`}
                className="block bg-white rounded-2xl border border-[#FFE5D9]/50 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="h-28 bg-gradient-to-br from-[#FFF8F6] to-[#FFE5D9] flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-[#E8907C]/60" />
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500">{prettyCategory(resource.category)} · {resource.type}</p>
                  <p className="font-semibold text-gray-800 mt-1">{resource.title}</p>
                  {resource.created_by ? (
                    <p className="text-xs text-[#6b7a90] mt-1">
                      Posted by{" "}
                      <span className="font-medium text-[#25364f]">
                        {authorById.get(resource.created_by)?.full_name?.trim() || "Member"}
                      </span>
                    </p>
                  ) : null}
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{resource.description}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    <Clock className="w-3 h-3 inline mr-1" /> {Math.max(5, ((resource.description?.length || 50) / 20) | 0)} min
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
