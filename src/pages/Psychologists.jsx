import React, { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { base44 } from "@/api/base44Client"
import { Search, Star, MapPin, Video } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function Psychologists() {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")

  const { data: psychologists = [] } = useQuery({
    queryKey: ["psychologists"],
    queryFn: () => base44.entities.Psychologist.list("-rating", 50),
  })

  const list = useMemo(() => {
    const q = query.toLowerCase().trim()
    return psychologists.filter((p) => {
      const matchesSearch = !q || p.name?.toLowerCase().includes(q) || p.specialty?.toLowerCase().includes(q)
      if (!matchesSearch) return false
      if (filter === "available") return !!p.available_now
      if (filter === "online") return !!p.online_available
      return true
    })
  }, [psychologists, query, filter])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-gray-800 mb-2">Talk to a Psychologist</h1>
        <p className="text-gray-600 mb-6">Find the right professional to support your journey 💕</p>

        <div className="bg-white rounded-3xl p-5 border border-[#FFE5D9]/50 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or specialty..." className="pl-9 rounded-xl" />
          </div>
          <div className="flex gap-2 mt-3">
            {[
              { id: "all", label: "All" },
              { id: "available", label: "Available Now" },
              { id: "online", label: "Online Only" },
            ].map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)} className={`px-3 py-1 rounded-full text-xs border ${filter === f.id ? "bg-[#FFF8F6] border-[#F4A896] text-[#E8907C]" : "border-gray-200 text-gray-600"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl p-4 border border-[#FFE5D9]/50 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-[#F4A896] to-[#FFDDD2] flex items-center justify-center">
                  {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-semibold">{p.name?.charAt(0)}</span>}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{p.name}</p>
                  <p className="text-sm text-gray-600">{p.specialty}</p>
                  <p className="text-xs text-amber-500 mt-1 flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> {p.rating} <span className="text-gray-400">({p.reviews_count} reviews)</span></p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-3 line-clamp-2">{p.bio}</p>
              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                {p.available_now ? <span className="px-2 py-1 rounded-full bg-green-50 text-green-600">● Available Now</span> : null}
                {p.online_available ? <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600"><Video className="w-3 h-3 inline mr-1" /> Online</span> : null}
                {p.location ? <span className="px-2 py-1 rounded-full bg-gray-50 text-gray-600"><MapPin className="w-3 h-3 inline mr-1" /> {p.location}</span> : null}
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-700">200 QAR/session</span>
                <Link to={`/PsychologistProfile?id=${p.id}`}>
                  <Button size="sm" className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">View Profile</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

