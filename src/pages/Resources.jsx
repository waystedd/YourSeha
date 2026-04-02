import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { Search, Sparkles, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function Resources() {
  const [tab, setTab] = useState("mothers")
  const [query, setQuery] = useState("")

  const { data: resources = [] } = useQuery({
    queryKey: ["resources"],
    queryFn: () => base44.entities.Resource.list("-created_date", 100),
  })

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return resources.filter((r) => {
      const targetOk = tab === "mothers" ? r.target === "mothers" : r.target === "children"
      const textOk = !q || r.title?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)
      return targetOk && textOk
    })
  }, [resources, tab, query])

  const recommended = filtered.slice(0, 3)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-800 mb-2">Resources</h1>
          <p className="text-gray-600">Wellness guides and support materials for you and your child 💕</p>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          <button onClick={() => setTab("mothers")} className={`px-4 py-1 rounded-full text-sm ${tab === "mothers" ? "bg-[#F4A896] text-white" : "bg-white border text-gray-600"}`}>♡ For Mothers</button>
          <button onClick={() => setTab("children")} className={`px-4 py-1 rounded-full text-sm ${tab === "children" ? "bg-[#F4A896] text-white" : "bg-white border text-gray-600"}`}>✨ For Children</button>
        </div>

        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search resources..." className="pl-9 rounded-xl" />
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#E8907C]" /> Recommended for You</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {recommended.map((r) => (
            <Link key={r.id} to={`/ResourceDetail?id=${r.id}`} className="block bg-white rounded-2xl border border-[#FFE5D9]/50 overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-28 bg-gradient-to-br from-[#FFF8F6] to-[#FFE5D9] flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-[#E8907C]/60" />
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-500">{r.category} · {r.type}</p>
                <p className="font-semibold text-gray-800 mt-1">{r.title}</p>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{r.description}</p>
                <p className="text-xs text-gray-400 mt-2"><Clock className="w-3 h-3 inline mr-1" /> {Math.max(5, (r.description?.length || 50) / 20 | 0)} min</p>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 ? <p className="text-center text-gray-400">No resources found matching your criteria</p> : null}
      </div>
    </div>
  )
}

