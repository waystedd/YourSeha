import React, { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { base44 } from "@/api/base44Client"
import { BarChart3, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export default function WellnessDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [goal, setGoal] = useState({ title: "", category: "self_care", target_sessions: 7 })

  const { data: entries = [] } = useQuery({ queryKey: ["journalEntries"], queryFn: () => base44.entities.JournalEntry.list("-created_date", 100) })
  const { data: goals = [] } = useQuery({ queryKey: ["wellnessGoals"], queryFn: () => base44.entities.WellnessGoal.list("-created_date", 100) })
  const { data: reminders = [] } = useQuery({ queryKey: ["reminders"], queryFn: () => base44.entities.Reminder.list("-created_date", 100) })

  const addGoal = useMutation({
    mutationFn: async () => base44.entities.WellnessGoal.create(goal),
    onSuccess: () => {
      setOpen(false)
      setGoal({ title: "", category: "self_care", target_sessions: 7 })
      queryClient.invalidateQueries({ queryKey: ["wellnessGoals"] })
    },
  })

  const chartData = useMemo(() => {
    const days = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const key = d.toISOString().slice(0, 10)
      const sameDay = entries.filter((e) => (e.date || "").slice(0, 10) === key)
      const avg = sameDay.length ? sameDay.reduce((s, x) => s + (x.mood_score || 5), 0) / sameDay.length : null
      days.push({ key, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: avg ? Number(avg.toFixed(1)) : null })
    }
    return days
  }, [entries])

  const goalsCompleted = goals.filter((g) => (g.current_progress || 0) >= (g.target_sessions || 1)).length
  const remindersDone = reminders.filter((r) => r.is_completed).length
  const positiveDays = chartData.filter((d) => (d.value || 0) >= 7).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-semibold text-gray-800">Wellness Dashboard</h1>
            <p className="text-gray-600">Track your journey and celebrate your progress 💕</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/Journaling")} className="rounded-xl border-[#FFE5D9]">✎ Log Mood</Button>
            <Button onClick={() => setOpen(true)} className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">+ Add Goal</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl bg-purple-50 p-5"><p className="text-sm text-gray-600">Goals Completed</p><p className="text-4xl font-bold text-gray-800 mt-2">{goals.length ? Math.round((goalsCompleted / goals.length) * 100) : 0}%</p><p className="text-xs text-gray-500">{goalsCompleted}/{goals.length} goals</p></div>
          <div className="rounded-2xl bg-green-50 p-5"><p className="text-sm text-gray-600">Reminders Done</p><p className="text-4xl font-bold text-gray-800 mt-2">{reminders.length ? Math.round((remindersDone / reminders.length) * 100) : 0}%</p><p className="text-xs text-gray-500">{remindersDone}/{reminders.length} tasks</p></div>
          <div className="rounded-2xl bg-orange-50 p-5"><p className="text-sm text-gray-600">Positive Days</p><p className="text-4xl font-bold text-gray-800 mt-2">{Math.round((positiveDays / 14) * 100)}%</p><p className="text-xs text-gray-500">{positiveDays}/14 entries</p></div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#FFE5D9]/50 mb-6">
          <h2 className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#E8907C]" /> Emotional Progress (Last 14 Days)</h2>
          <p className="text-xs text-gray-400 mb-4">Higher score = more positive mood</p>
          <div className="h-56 rounded-2xl border border-[#FFE5D9]/50 bg-gradient-to-b from-white to-[#FFFDFD] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4e2dc" />
                <XAxis dataKey="label" tick={{ fill: "#8b95a7", fontSize: 12 }} />
                <YAxis domain={[1, 9]} tick={{ fill: "#8b95a7", fontSize: 12 }} />
                <Tooltip
                  formatter={(v) => [`${v}/9`, "Mood Score"]}
                  labelFormatter={(l) => l}
                  contentStyle={{ borderRadius: 12, border: "1px solid #f3d4ca" }}
                />
                <Line type="monotone" dataKey="value" connectNulls stroke="#F4A896" strokeWidth={3} dot={{ r: 4, fill: "#E8907C" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-[#FFE5D9]/50">
          <h3 className="font-semibold text-gray-800 mb-3">My Wellness Goals</h3>
          {goals.length === 0 ? (
            <div className="text-center">
              <p className="text-gray-400 mb-3">No goals set yet</p>
              <Button onClick={() => setOpen(true)} className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">Set Your First Goal</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {goals.map((g) => (
                <div key={g.id} className="rounded-xl bg-[#FFF8F6] p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{g.title}</p>
                    <p className="text-sm text-gray-500">{g.category}</p>
                  </div>
                  <span className="text-sm text-[#E8907C]">{g.target_sessions} target</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[640px] rounded-2xl">
          <DialogHeader><DialogTitle>Add Wellness Goal</DialogTitle></DialogHeader>
          <Input value={goal.title} onChange={(e) => setGoal((g) => ({ ...g, title: e.target.value }))} placeholder="Goal title..." />
          <Select value={goal.category} onValueChange={(v) => setGoal((g) => ({ ...g, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="self_care">Self Care</SelectItem>
              <SelectItem value="sleep_energy">Sleep & Energy</SelectItem>
              <SelectItem value="emotional_regulation">Emotional Regulation</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" min="1" value={goal.target_sessions} onChange={(e) => setGoal((g) => ({ ...g, target_sessions: Number(e.target.value || 1) }))} placeholder="Target sessions" />
          <Button disabled={!goal.title || addGoal.isPending} onClick={() => addGoal.mutate()} className="w-full rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
            <Plus className="w-4 h-4 mr-2" /> Add Goal
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

