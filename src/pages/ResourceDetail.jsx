import React, { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useSearchParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { createPageUrl } from "@/utils"
import { ArrowLeft, Clock, Eye, FileText, LayoutGrid, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import * as mammoth from "mammoth"

function viewStorageKey(viewerId, resourceId) {
  return `yourseha:rv:${viewerId || "anon"}:${resourceId}`
}

export default function ResourceDetail() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const id = useMemo(() => searchParams.get("id"), [searchParams])
  const [viewMode, setViewMode] = useState("text")
  const [extractedText, setExtractedText] = useState("")
  const [extracting, setExtracting] = useState(false)

  const { data: viewer } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() })

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["resourceById", id],
    queryFn: () => base44.entities.Resource.filter({ id }, "-created_date", 1),
    enabled: !!id,
  })
  const resource = rows[0]

  const { data: authorRows = [] } = useQuery({
    queryKey: ["resourceAuthor", resource?.created_by],
    queryFn: () => base44.entities.User.filter({ id: resource.created_by }, "-created_date", 1),
    enabled: !!resource?.created_by,
  })
  const author = authorRows[0]
  const authorName = author?.full_name?.trim() || "Member"
  const authorProfileHref = author?.id ? `${createPageUrl("UserPublicProfile")}?id=${author.id}` : null

  useEffect(() => {
    if (!resource?.id) return
    const vid = viewer?.id || "anon"
    const key = viewStorageKey(vid, resource.id)
    const storage = vid === "anon" ? sessionStorage : localStorage
    try {
      if (storage.getItem(key)) return
    } catch {
      /* private mode — still try one server bump per mount */
    }

    ;(async () => {
      let counted = false
      try {
        await base44.auth.incrementResourceView(resource.id)
        counted = true
      } catch {
        try {
          const next = (resource.views_count || 0) + 1
          await base44.entities.Resource.update(resource.id, { views_count: next })
          counted = true
        } catch {
          /* RLS / no RPC */
        }
      }
      if (counted) {
        try {
          storage.setItem(key, "1")
        } catch {
          /* ignore */
        }
        queryClient.invalidateQueries({ queryKey: ["resourceById", id] })
        queryClient.invalidateQueries({ queryKey: ["resources"] })
      }
    })()
  }, [resource?.id, viewer?.id, id, queryClient])

  const fromPsych = location.state?.from === "psych" || new URLSearchParams(location.search).get("src") === "psych"

  const backHref = fromPsych ? "/PsychologistResources" : "/Resources"

  const isPdf = String(resource?.file_type || resource?.file_name || "").toLowerCase().includes("pdf")
  const isDocx =
    String(resource?.file_type || resource?.file_name || "")
      .toLowerCase()
      .match(/word|officedocument|docx|doc/)

  const extractFromFile = async () => {
    if (!resource?.file_url) return
    setExtracting(true)
    setExtractedText("")
    try {
      const res = await fetch(resource.file_url)
      const buf = await res.arrayBuffer()
      if (isPdf) {
        const pdfjs = await import("pdfjs-dist")
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
        const pdf = await pdfjs.getDocument({ data: buf }).promise
        let text = ""
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          text += content.items.map((it) => (it.str ? `${it.str} ` : "")).join("")
        }
        setExtractedText(text.trim() || "(No text could be extracted from this PDF.)")
      } else if (isDocx) {
        const result = await mammoth.extractRawText({ arrayBuffer: buf })
        setExtractedText(result.value?.trim() || "(No text extracted.)")
      } else {
        toast.info("Text extraction works best for PDF and Word files.")
      }
    } catch (e) {
      toast.error(e?.message || "Could not extract text")
    } finally {
      setExtracting(false)
    }
  }

  if (!id) {
    return (
      <div className="min-h-screen py-10 text-center text-gray-600">
        <Link to={backHref} className="text-[#E8907C]">
          Back
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-16 text-center text-gray-500">
        Loading…
      </div>
    )
  }

  if (!resource) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-16 text-center">
        <p className="text-gray-600">Resource not found.</p>
        <Link to={backHref} className="text-[#E8907C] mt-2 inline-block">
          Back
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Link to={backHref} className="inline-flex items-center gap-2 text-[#25364f] hover:text-[#E8907C] mb-6">
          <ArrowLeft className="w-5 h-5" /> {fromPsych ? "Back to my resources" : "Back to Resources"}
        </Link>
        <div className="bg-white rounded-3xl border border-[#FFE5D9]/60 p-8">
          <div className="flex flex-wrap gap-2 mb-4 text-sm">
            <span className="px-3 py-1 rounded-full bg-[#FFF8F6] text-[#E8907C]">{resource.type}</span>
            <span className="px-3 py-1 rounded-full border inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> 5 min
            </span>
            <span className="px-3 py-1 rounded-full border inline-flex items-center gap-1">
              <Eye className="w-3 h-3" /> {resource.views_count || 0} views
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold text-[#122745] leading-tight mb-4">{resource.title}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#6b7a90] mb-6">
            <span className="inline-flex items-center gap-1.5">
              <User className="w-4 h-4" />
              Posted by <span className="font-medium text-[#25364f]">{authorName}</span>
            </span>
            {authorProfileHref ? (
              <Link to={authorProfileHref} className="text-[#E8907C] font-medium hover:underline">
                View profile
              </Link>
            ) : null}
          </div>
          <p className="text-[#25364f] text-xl mb-8">{resource.description}</p>

          {resource.file_url && (isPdf || isDocx) ? (
            <div className="mb-8 space-y-3">
              <p className="text-sm font-medium text-gray-700">How do you want to read this file?</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={viewMode === "text" ? "default" : "outline"}
                  className="rounded-xl gap-2"
                  onClick={() => setViewMode("text")}
                >
                  <FileText className="w-4 h-4" /> View as text
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "embed" ? "default" : "outline"}
                  className="rounded-xl gap-2"
                  onClick={() => setViewMode("embed")}
                >
                  <LayoutGrid className="w-4 h-4" /> Embedded reader
                </Button>
              </div>
              {viewMode === "text" ? (
                <div className="rounded-2xl border border-[#FFE5D9] bg-[#FFFBF9] p-4 min-h-[200px]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-500">Extracted text</span>
                    <Button size="sm" variant="outline" className="rounded-lg" disabled={extracting} onClick={extractFromFile}>
                      {extracting ? "Extracting…" : extractedText ? "Re-extract" : "Load text from file"}
                    </Button>
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">
                    {extractedText || resource.content || "Tap “Load text from file” to extract text from your PDF or Word file, or read the summary above."}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#FFE5D9] overflow-hidden bg-gray-50">
                  {isPdf ? (
                    <iframe title="resource-pdf" src={resource.file_url} className="w-full h-[min(70vh,720px)]" />
                  ) : (
                    <iframe title="resource-doc" src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(resource.file_url)}`} className="w-full h-[min(70vh,720px)]" />
                  )}
                </div>
              )}
            </div>
          ) : resource.file_url ? (
            <div className="mb-8">
              <a
                href={resource.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex px-4 py-2 rounded-xl bg-[#FFF8F6] border border-[#FFE5D9] text-[#E8907C]"
              >
                Open attached file: {resource.file_name || "Download"}
              </a>
            </div>
          ) : null}

          <div className="prose prose-slate max-w-none border-t border-[#FFE5D9]/60 pt-6">
            <h2 className="text-lg font-semibold text-[#122745] mb-2">Article text</h2>
            {resource.content ? (
              <p className="text-[#25364f] text-lg whitespace-pre-wrap">{resource.content}</p>
            ) : (
              <p className="text-gray-500">No additional article text.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
