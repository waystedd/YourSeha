import React, { useMemo } from "react"
import { Link, useLocation } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { ArrowLeft, Clock, Eye } from "lucide-react"

export default function ResourceDetail() {
  const location = useLocation()
  const id = useMemo(() => new URLSearchParams(location.search).get("id"), [location.search])
  const { data: resources = [] } = useQuery({ queryKey: ["resources"], queryFn: () => base44.entities.Resource.list("-created_date", 100) })
  const resource = resources.find((r) => r.id === id)
  if (!resource) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Link to="/Resources" className="inline-flex items-center gap-2 text-[#25364f] hover:text-[#E8907C] mb-6">
          <ArrowLeft className="w-5 h-5" /> Back to Resources
        </Link>
        <div className="bg-white rounded-3xl border border-[#FFE5D9]/60 p-8">
          <div className="flex flex-wrap gap-2 mb-4 text-sm">
            <span className="px-3 py-1 rounded-full bg-[#FFF8F6] text-[#E8907C]">{resource.type}</span>
            <span className="px-3 py-1 rounded-full border inline-flex items-center gap-1"><Clock className="w-3 h-3" /> 5 min</span>
            <span className="px-3 py-1 rounded-full border inline-flex items-center gap-1"><Eye className="w-3 h-3" /> {resource.views_count || 0} views</span>
          </div>
          <h1 className="text-5xl font-semibold text-[#122745] leading-tight mb-4">{resource.title}</h1>
          <p className="text-[#25364f] text-2xl mb-8">{resource.description}</p>
          {resource.file_url ? (
            <div className="mb-8">
              <h2 className="text-3xl font-semibold text-[#122745] mb-3">Attached File</h2>
              {String(resource.file_type || "").includes("pdf") ? (
                <iframe title="resource-pdf-preview" src={resource.file_url} className="w-full h-[520px] rounded-2xl border border-[#FFE5D9]" />
              ) : (
                <a href={resource.file_url} target="_blank" rel="noreferrer" className="inline-flex px-4 py-2 rounded-xl bg-[#FFF8F6] border border-[#FFE5D9] text-[#E8907C]">
                  Open File: {resource.file_name || "Download"}
                </a>
              )}
            </div>
          ) : null}
          <div className="prose prose-slate max-w-none">
            {resource.content ? (
              <p className="text-[#25364f] text-xl whitespace-pre-wrap">{resource.content}</p>
            ) : (
              <p className="text-[#25364f] text-xl">No detailed content added yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

