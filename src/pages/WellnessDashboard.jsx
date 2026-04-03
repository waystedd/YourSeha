import React, { useMemo, useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { base44 } from "@/api/base44Client"
import { BarChart3, Plus, Check, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { toLocalDateString, normalizeDateKey } from "@/lib/dateUtils"
import { toast } from "sonner"

const TARGET_PRESETS = [
  { value: "3", label: "3 check-ins (light)" },
  { value: "7", label: "7 check-ins (~1 week)" },
  { value: "14", label: "14 check-ins (~2 weeks)" },
  { value: "30", label: "30 check-ins (~1 month)" },
  { value: "custom", label: "Custom amount…" },
]

const CATEGORY_PRESETS = [
  { value: "self_care", label: "Self Care" },
  { value: "sleep_energy", label: "Sleep & Energy" },
  { value: "emotional_regulation", label: "Emotional Regulation" },
]

function formatCategoryLabel(cat) {
  if (!cat) return ""
  const found = CATEGORY_PRESETS.find((p) => p.value === cat)
  if (found) return found.label
  return cat
}

function clampTarget(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 7
  return Math.min(52, Math.max(1, Math.round(x)))
}

function resolveCategoryForSave({ mode, preset, custom }) {
  if (mode === "custom") {
    const t = String(custom || "").trim()
    return t.slice(0, 120) || "general"
  }
  return preset || "self_care"
}

function inferCategoryForm(goal) {
  const c = String(goal?.category || "").trim()
  if (!c) return { mode: "preset", preset: "self_care", custom: "" }
  const isPreset = CATEGORY_PRESETS.some((p) => p.value === c)
  if (isPreset) return { mode: "preset", preset: c, custom: "" }
  return { mode: "custom", preset: "self_care", custom: c }
}

function GoalCheckInRow({ goal, target, current, remaining, onLog, busy, onEdit, onDelete }) {
  const [amount, setAmount] = useState("1")

  useEffect(() => {
    setAmount(remaining > 0 ? "1" : "0")
  }, [remaining, goal.id])

  const onAmountChange = (e) => {
    const v = e.target.value
    if (v === "") {
      setAmount("")
      return
    }
    const n = Math.floor(Number(v) || 0)
    if (!Number.isFinite(n)) {
      setAmount(v)
      return
    }
    setAmount(String(Math.min(remaining, Math.max(0, n))))
  }

  const submit = () => {
    if (remaining <= 0) return
    let n = Math.floor(Number(String(amount).trim()) || 0)
    if (n < 1) n = 1
    n = Math.min(remaining, n)
    onLog(n)
  }

  const addOne = () => {
    if (remaining <= 0) return
    onLog(1)
  }

  return (
    <div className="rounded-xl border border-[#FFE5D9]/60 bg-[#FFF8F6] p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-gray-800">{goal.title}</p>
          <p className="text-sm text-gray-500">{formatCategoryLabel(goal.category)}</p>
          <p className="text-sm font-medium text-[#E8907C] mt-1">
            Progress: {current}/{target} check-ins
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-gray-500" onClick={() => onEdit(goal)} aria-label="Edit goal">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => onDelete(goal)} aria-label="Delete goal">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {remaining > 0 ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-gray-500 mb-1 block">Check-ins to log (max {remaining})</label>
            <Input
              type="number"
              min={1}
              max={remaining}
              value={amount}
              onChange={onAmountChange}
              onBlur={() => {
                if (amount === "") setAmount(remaining > 0 ? "1" : "0")
                else {
                  const n = Math.min(remaining, Math.max(1, Math.floor(Number(amount) || 1)))
                  setAmount(String(n))
                }
              }}
              className="rounded-xl"
            />
          </div>
          <Button
            type="button"
            className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]"
            disabled={busy || remaining < 1}
            onClick={submit}
          >
            Log check-ins
          </Button>
          <Button type="button" variant="outline" className="rounded-xl border-[#FFE5D9]" disabled={busy || remaining < 1} onClick={addOne}>
            +1
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function GoalFormFields({
  title,
  setTitle,
  categoryMode,
  setCategoryMode,
  categoryPreset,
  setCategoryPreset,
  customCategory,
  setCustomCategory,
  targetMode,
  setTargetMode,
  customTarget,
  setCustomTarget,
  idPrefix = "",
}) {
  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}title`} className="text-sm text-gray-600 block">
          Goal title
        </label>
        <Input
          id={`${idPrefix}title`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Goal title..."
          className="rounded-xl mt-1"
        />
      </div>
      <div>
        <span className="text-sm text-gray-600 block">Category</span>
        <Select value={categoryMode} onValueChange={setCategoryMode}>
          <SelectTrigger className="rounded-xl mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="preset">Choose a category</SelectItem>
            <SelectItem value="custom">Custom category…</SelectItem>
          </SelectContent>
        </Select>
        {categoryMode === "preset" ? (
          <Select value={categoryPreset} onValueChange={setCategoryPreset}>
            <SelectTrigger className="rounded-xl mt-2">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder="e.g. Mindfulness, Exercise, Nutrition…"
            className="rounded-xl mt-2"
            maxLength={120}
          />
        )}
      </div>
      <div>
        <span className="text-sm text-gray-600 block">Check-in target</span>
        <Select value={targetMode} onValueChange={setTargetMode}>
          <SelectTrigger className="rounded-xl mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TARGET_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {targetMode === "custom" && (
          <Input
            type="number"
            min={1}
            max={52}
            className="mt-2 rounded-xl"
            value={customTarget}
            onChange={(e) => setCustomTarget(e.target.value)}
            placeholder="1–52 check-ins"
          />
        )}
      </div>
    </>
  )
}

export default function WellnessDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)

  const [targetMode, setTargetMode] = useState("7")
  const [customTarget, setCustomTarget] = useState("7")
  const [goal, setGoal] = useState({ title: "" })
  const [categoryMode, setCategoryMode] = useState("preset")
  const [categoryPreset, setCategoryPreset] = useState("self_care")
  const [customCategory, setCustomCategory] = useState("")

  const [editTargetMode, setEditTargetMode] = useState("7")
  const [editCustomTarget, setEditCustomTarget] = useState("7")
  const [editForm, setEditForm] = useState({ title: "" })
  const [editCategoryMode, setEditCategoryMode] = useState("preset")
  const [editCategoryPreset, setEditCategoryPreset] = useState("self_care")
  const [editCustomCategory, setEditCustomCategory] = useState("")

  const { data: entries = [] } = useQuery({
    queryKey: ["journalEntries"],
    queryFn: () => base44.entities.JournalEntry.list("-created_date", 100),
  })
  const { data: goals = [] } = useQuery({
    queryKey: ["wellnessGoals"],
    queryFn: () => base44.entities.WellnessGoal.list("-created_date", 100),
  })
  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => base44.entities.Reminder.list("-created_date", 100),
  })

  const resetAddForm = () => {
    setGoal({ title: "" })
    setTargetMode("7")
    setCustomTarget("7")
    setCategoryMode("preset")
    setCategoryPreset("self_care")
    setCustomCategory("")
  }

  const openEdit = (g) => {
    setEditingGoal(g)
    setEditForm({ title: g.title || "" })
    const inferred = inferCategoryForm(g)
    setEditCategoryMode(inferred.mode)
    setEditCategoryPreset(inferred.preset)
    setEditCustomCategory(inferred.custom)
    const ts = g.target_sessions || 7
    const preset = TARGET_PRESETS.find((p) => p.value !== "custom" && Number(p.value) === ts)
    if (preset) {
      setEditTargetMode(preset.value)
      setEditCustomTarget(String(ts))
    } else {
      setEditTargetMode("custom")
      setEditCustomTarget(String(ts))
    }
    setEditOpen(true)
  }

  const addGoal = useMutation({
    mutationFn: async () => {
      const ts = targetMode === "custom" ? clampTarget(customTarget) : clampTarget(targetMode)
      const cat = resolveCategoryForSave({ mode: categoryMode, preset: categoryPreset, custom: customCategory })
      await base44.entities.WellnessGoal.create({
        title: goal.title.trim(),
        category: cat,
        target_sessions: ts,
        current_progress: 0,
      })
    },
    onSuccess: () => {
      setOpen(false)
      resetAddForm()
      queryClient.invalidateQueries({ queryKey: ["wellnessGoals"] })
      toast.success("Goal added")
    },
    onError: (e) => toast.error(e?.message || "Could not add goal"),
  })

  const updateGoal = useMutation({
    mutationFn: async () => {
      if (!editingGoal?.id) return
      const ts = editTargetMode === "custom" ? clampTarget(editCustomTarget) : clampTarget(editTargetMode)
      const cat = resolveCategoryForSave({
        mode: editCategoryMode,
        preset: editCategoryPreset,
        custom: editCustomCategory,
      })
      const cur = editingGoal.current_progress || 0
      const nextProgress = Math.min(cur, ts)
      await base44.entities.WellnessGoal.update(editingGoal.id, {
        title: editForm.title.trim(),
        category: cat,
        target_sessions: ts,
        current_progress: nextProgress,
        is_completed: nextProgress >= ts,
      })
    },
    onSuccess: () => {
      setEditOpen(false)
      setEditingGoal(null)
      queryClient.invalidateQueries({ queryKey: ["wellnessGoals"] })
      toast.success("Goal updated")
    },
    onError: (e) => toast.error(e?.message || "Could not update goal"),
  })

  const deleteGoal = useMutation({
    mutationFn: async (id) => base44.entities.WellnessGoal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wellnessGoals"] })
      toast.success("Goal deleted")
    },
    onError: (e) => toast.error(e?.message || "Could not delete goal"),
  })

  const confirmDelete = (g) => {
    if (window.confirm(`Delete “${g.title}”? This cannot be undone.`)) {
      deleteGoal.mutate(g.id)
    }
  }

  const logCheckIns = useMutation({
    mutationFn: async ({ id, current, target, add }) => {
      const t = Math.max(1, target || 1)
      const c = Math.max(0, current || 0)
      const maxAdd = Math.max(0, t - c)
      const n = Math.min(maxAdd, Math.max(0, Math.floor(Number(add) || 0)))
      if (n <= 0) return
      const next = c + n
      await base44.entities.WellnessGoal.update(id, {
        current_progress: next,
        is_completed: next >= t,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wellnessGoals"] }),
  })

  const resetGoalProgress = useMutation({
    mutationFn: async ({ id }) => {
      await base44.entities.WellnessGoal.update(id, {
        is_completed: false,
        current_progress: 0,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wellnessGoals"] }),
  })

  const chartData = useMemo(() => {
    const days = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const key = toLocalDateString(d)
      const sameDay = entries.filter((e) => normalizeDateKey(e.date) === key)
      const avg = sameDay.length
        ? sameDay.reduce((s, x) => {
            const raw = x.mood_score
            const v = typeof raw === "number" ? raw : 5
            return s + v
          }, 0) / sameDay.length
        : null
      days.push({
        key,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: avg != null ? Number(avg.toFixed(1)) : null,
      })
    }
    return days
  }, [entries])

  const achievedGoalsList = goals.filter(
    (g) => g.is_completed || (g.current_progress || 0) >= (g.target_sessions || 1)
  )
  const activeGoalsList = goals.filter(
    (g) => !g.is_completed && (g.current_progress || 0) < (g.target_sessions || 1)
  )
  const goalsCompleted = achievedGoalsList.length

  const remindersDone = reminders.filter((r) => r.is_completed).length
  const positiveDays = chartData.filter((d) => (d.value || 0) >= 7).length

  const goalsPct = goals.length ? Math.round((goalsCompleted / goals.length) * 100) : 0
  const remindersPct = reminders.length ? Math.round((remindersDone / reminders.length) * 100) : 0

  const addValid =
    goal.title?.trim() &&
    (categoryMode === "preset" || (categoryMode === "custom" && customCategory.trim()))

  const editValid =
    editForm.title?.trim() &&
    (editCategoryMode === "preset" || (editCategoryMode === "custom" && editCustomCategory.trim()))

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-semibold text-gray-800">Wellness Dashboard</h1>
            <p className="text-gray-600">Track your journey and celebrate your progress 💕</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/Journaling")} className="rounded-xl border-[#FFE5D9]">
              ✎ Log Mood
            </Button>
            <Button onClick={() => setOpen(true)} className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
              + Add Goal
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl bg-purple-50 p-5">
            <p className="text-sm text-gray-600">Goals Completed</p>
            <p className="text-4xl font-bold text-gray-800 mt-2">{goalsPct}%</p>
            <p className="text-xs text-gray-500">
              {goalsCompleted}/{goals.length} goals
            </p>
          </div>
          <div className="rounded-2xl bg-green-50 p-5">
            <p className="text-sm text-gray-600">Reminders Done</p>
            <p className="text-4xl font-bold text-gray-800 mt-2">{remindersPct}%</p>
            <p className="text-xs text-gray-500">
              {remindersDone}/{reminders.length} tasks
            </p>
          </div>
          <div className="rounded-2xl bg-orange-50 p-5">
            <p className="text-sm text-gray-600">Positive Days</p>
            <p className="text-4xl font-bold text-gray-800 mt-2">{Math.round((positiveDays / 14) * 100)}%</p>
            <p className="text-xs text-gray-500">{positiveDays}/14 entries</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#FFE5D9]/50 mb-6">
          <h2 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#E8907C]" /> Emotional Progress (Last 14 Days)
          </h2>
          <p className="text-xs text-gray-400 mb-4">Mood score from 1 (low) to 10 (great)</p>
          <div className="h-56 rounded-2xl border border-[#FFE5D9]/50 bg-gradient-to-b from-white to-[#FFFDFD] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4e2dc" />
                <XAxis dataKey="label" tick={{ fill: "#8b95a7", fontSize: 12 }} />
                <YAxis domain={[1, 10]} ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} tick={{ fill: "#8b95a7", fontSize: 12 }} />
                <Tooltip
                  formatter={(v) => (v != null ? [`${v}/10`, "Mood Score"] : ["—", "Mood Score"])}
                  labelFormatter={(l) => l}
                  contentStyle={{ borderRadius: 12, border: "1px solid #f3d4ca" }}
                />
                <Line type="monotone" dataKey="value" connectNulls stroke="#F4A896" strokeWidth={3} dot={{ r: 4, fill: "#E8907C" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-[#FFE5D9]/50 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">My Wellness Goals</h3>
          {goals.length === 0 ? (
            <div className="text-center">
              <p className="text-gray-400 mb-3">No goals set yet</p>
              <Button onClick={() => setOpen(true)} className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
                Set Your First Goal
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeGoalsList.map((g) => {
                const target = g.target_sessions || 1
                const current = g.current_progress || 0
                const remaining = Math.max(0, target - current)
                return (
                  <GoalCheckInRow
                    key={g.id}
                    goal={g}
                    target={target}
                    current={current}
                    remaining={remaining}
                    onLog={(add) =>
                      logCheckIns.mutate({
                        id: g.id,
                        current,
                        target,
                        add,
                      })
                    }
                    busy={logCheckIns.isPending}
                    onEdit={openEdit}
                    onDelete={confirmDelete}
                  />
                )
              })}
              {activeGoalsList.length === 0 && <p className="text-sm text-gray-500">No active goals — see Achieved below.</p>}
            </div>
          )}
        </div>

        {achievedGoalsList.length > 0 && (
          <div className="bg-white rounded-3xl p-8 border border-[#FFE5D9]/50">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" /> Achieved Goals
            </h3>
            <div className="space-y-2">
              {achievedGoalsList.map((g) => (
                <div
                  key={g.id}
                  className="rounded-xl border border-green-200/80 bg-green-50/90 p-4 flex items-start gap-3 justify-between flex-wrap"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="mt-0.5 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="font-medium text-gray-800 line-through opacity-90">{g.title}</p>
                      <p className="text-sm text-gray-500">{formatCategoryLabel(g.category)}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {g.current_progress || 0}/{g.target_sessions} check-ins
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-gray-500" onClick={() => openEdit(g)} aria-label="Edit goal">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => confirmDelete(g)} aria-label="Delete goal">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-gray-500"
                      disabled={resetGoalProgress.isPending}
                      onClick={() => resetGoalProgress.mutate({ id: g.id })}
                    >
                      Undo
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[640px] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Wellness Goal</DialogTitle>
          </DialogHeader>
          <GoalFormFields
            title={goal.title}
            setTitle={(t) => setGoal((g) => ({ ...g, title: t }))}
            categoryMode={categoryMode}
            setCategoryMode={setCategoryMode}
            categoryPreset={categoryPreset}
            setCategoryPreset={setCategoryPreset}
            customCategory={customCategory}
            setCustomCategory={setCustomCategory}
            targetMode={targetMode}
            setTargetMode={setTargetMode}
            customTarget={customTarget}
            setCustomTarget={setCustomTarget}
            idPrefix="add-"
          />
          <Button
            disabled={!addValid || addGoal.isPending}
            onClick={() => addGoal.mutate()}
            className="w-full rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Goal
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditingGoal(null) }}>
        <DialogContent className="sm:max-w-[640px] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit goal</DialogTitle>
          </DialogHeader>
          <GoalFormFields
            title={editForm.title}
            setTitle={(t) => setEditForm((f) => ({ ...f, title: t }))}
            categoryMode={editCategoryMode}
            setCategoryMode={setEditCategoryMode}
            categoryPreset={editCategoryPreset}
            setCategoryPreset={setEditCategoryPreset}
            customCategory={editCustomCategory}
            setCustomCategory={setEditCustomCategory}
            targetMode={editTargetMode}
            setTargetMode={setEditTargetMode}
            customTarget={editCustomTarget}
            setCustomTarget={setEditCustomTarget}
            idPrefix="edit-"
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]"
              disabled={!editValid || !editingGoal || updateGoal.isPending}
              onClick={() => updateGoal.mutate()}
            >
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
