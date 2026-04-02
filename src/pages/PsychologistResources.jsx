import React, { useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { BookOpen, Eye, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { motion } from "framer-motion"

const CATEGORIES = ["ASD", "Anxiety", "Self-Care", "Parenting", "Mindfulness", "Depression", "Therapy Tips", "Other"]

export default function PsychologistResources() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const fileRef = useRef(null)
  const [form, setForm] = useState({
    title: "",
    description: "",
    content: "",
    type: "article",
    target: "mothers",
    category: "ASD",
    file_url: "",
    file_name: "",
    file_type: "",
  })

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["myResources"],
    queryFn: () => base44.entities.Resource.list("-created_date", 200),
  })

  const createResource = useMutation({
    mutationFn: (data) => base44.entities.Resource.create({ ...data, views_count: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myResources"] })
      queryClient.invalidateQueries({ queryKey: ["resources"] })
      toast.success("Resource published!")
      setCreateOpen(false)
      setForm({ title: "", description: "", content: "", type: "article", target: "mothers", category: "ASD", file_url: "", file_name: "", file_type: "" })
    },
  })

  const deleteResource = useMutation({
    mutationFn: (id) => base44.entities.Resource.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myResources"] })
      toast.success("Resource deleted")
    },
  })

  const updateResource = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Resource.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myResources"] })
      queryClient.invalidateQueries({ queryKey: ["resources"] })
      toast.success("Resource updated")
      setCreateOpen(false)
      setEditingId(null)
      setForm({ title: "", description: "", content: "", type: "article", target: "mothers", category: "ASD", file_url: "", file_name: "", file_type: "" })
    },
  })

  const typeColors = useMemo(
    () => ({
      article: "bg-blue-50 text-blue-600",
      guide: "bg-purple-50 text-purple-600",
      exercise: "bg-green-50 text-green-600",
      video: "bg-orange-50 text-orange-600",
    }),
    []
  )

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file })
      setForm((f) => ({
        ...f,
        file_url,
        file_name: file.name,
        file_type: file.type || "",
      }))
      toast.success("File attached")
    } finally {
      setUploadingFile(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F4FF] to-white py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[#E8907C]" /> Resources
            </h1>
            <p className="text-sm text-gray-500 mt-1">Share articles and guides with caregivers</p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C] gap-2"
          >
            <Plus className="w-4 h-4" /> New Resource
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#E8907C]" />
          </div>
        ) : resources.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No resources yet</p>
            <Button
              onClick={() => setCreateOpen(true)}
              className="mt-4 rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]"
            >
              Create First Resource
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {resources.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[r.type] || "bg-gray-100 text-gray-600"}`}>
                        {r.type}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{r.category}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Eye className="w-3 h-3" />
                        {r.views_count || 0} views
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-800">{r.title}</h3>
                    {r.description ? <p className="text-sm text-gray-500 mt-1 line-clamp-2">{r.description}</p> : null}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(r.id)
                        setForm({
                          title: r.title || "",
                          description: r.description || "",
                          content: r.content || "",
                          type: r.type || "article",
                          target: r.target || "mothers",
                          category: r.category || "ASD",
                          file_url: r.file_url || "",
                          file_name: r.file_name || "",
                          file_type: r.file_type || "",
                        })
                        setCreateOpen(true)
                      }}
                      className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl flex-shrink-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteResource.mutate(r.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Resource" : "Create Resource"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input
              placeholder="Title..."
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="rounded-xl border-gray-200"
            />
            <Input
              placeholder="Short description..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="rounded-xl border-gray-200"
            />
            <Textarea
              placeholder="Full content..."
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="rounded-xl border-gray-200 min-h-[120px] resize-none"
            />
            <div className="space-y-2">
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt" className="hidden" onChange={handleFileUpload} />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadingFile} className="w-full rounded-xl border-[#FFE5D9] text-[#E8907C]">
                {uploadingFile ? "Uploading file..." : "Attach File (PDF/Docs)"}
              </Button>
              {form.file_name ? <p className="text-xs text-gray-500">Attached: {form.file_name}</p> : null}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="guide">Guide</SelectItem>
                  <SelectItem value="exercise">Exercise</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.target} onValueChange={(v) => setForm((f) => ({ ...f, target: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mothers">Mothers</SelectItem>
                  <SelectItem value="children">Children</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => {
                if (editingId) {
                  updateResource.mutate({ id: editingId, data: form })
                } else {
                  createResource.mutate(form)
                }
              }}
              disabled={!form.title || !form.description || createResource.isPending || updateResource.isPending}
              className="w-full rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C] h-11"
            >
              {createResource.isPending || updateResource.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                editingId ? "Save Changes" : "Publish Resource"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

