import React, { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { toLocalDateString, todayLocalDateString, normalizeDateKey } from "@/lib/dateUtils"

/** Mood scores use a 1–10 scale (aligned with Wellness Dashboard chart). */
const MOODS = [
  { label: "Overwhelmed", emoji: "😵‍💫", score: 2 },
  { label: "Anxious", emoji: "😰", score: 3 },
  { label: "Tired", emoji: "😴", score: 4 },
  { label: "Frustrated", emoji: "😣", score: 4 },
  { label: "Calm", emoji: "😌", score: 6 },
  { label: "Hopeful", emoji: "🌟", score: 8 },
  { label: "Grateful", emoji: "🙏", score: 9 },
  { label: "Happy", emoji: "😊", score: 10 },
]

const MOOD_COLORS = {
  1: "bg-red-200",
  2: "bg-red-100",
  3: "bg-orange-100",
  4: "bg-orange-100",
  5: "bg-yellow-100",
  6: "bg-green-100",
  7: "bg-green-100",
  8: "bg-emerald-100",
  9: "bg-teal-100",
  10: "bg-teal-100",
}

export default function Journaling() {
  const queryClient = useQueryClient()
  const { data: entries = [] } = useQuery({ queryKey: ["journalEntries"], queryFn: () => base44.entities.JournalEntry.list("-created_at", 200) })
  const [open, setOpen] = useState(false)
  const [selectedMood, setSelectedMood] = useState(MOODS[4])
  const [content, setContent] = useState("")
  const [monthOffset, setMonthOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(null)

  const saveEntry = useMutation({
    mutationFn: async () => base44.entities.JournalEntry.create({
      title: `${selectedMood.label} day`,
      mood: selectedMood.label,
      mood_score: selectedMood.score,
      content,
      date: todayLocalDateString(),
    }),
    onSuccess: () => { setOpen(false); setContent(""); queryClient.invalidateQueries({ queryKey: ["journalEntries"] }) },
  })

  // Build dynamic calendar
  const { cells, monthLabel, year, month } = useMemo(() => {
    const base = new Date()
    base.setDate(1)
    base.setMonth(base.getMonth() + monthOffset)
    const y = base.getFullYear(), m = base.getMonth()
    const label = base.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    const startDay = new Date(y, m, 1).getDay()
    const totalDays = new Date(y, m + 1, 0).getDate()
    const prevTotal = new Date(y, m, 0).getDate()
    const arr = []
    for (let i = 0; i < startDay; i++) {
      const d = prevTotal - startDay + i + 1
      arr.push({ day: d, date: toLocalDateString(new Date(y, m - 1, d)), muted: true })
    }
    for (let d = 1; d <= totalDays; d++) {
      arr.push({ day: d, date: toLocalDateString(new Date(y, m, d)), muted: false })
    }
    while (arr.length % 7 !== 0) {
      const d = arr.length - startDay - totalDays + 1
      arr.push({ day: d, date: toLocalDateString(new Date(y, m + 1, d)), muted: true })
    }
    return { cells: arr, monthLabel: label, year: y, month: m }
  }, [monthOffset])

  const entryByDate = useMemo(() => {
    const map = {}
    for (const e of entries) {
      const d = normalizeDateKey(e.date)
      if (!d) continue
      if (!map[d]) map[d] = []
      map[d].push(e)
    }
    return map
  }, [entries])

  const moodCounts = useMemo(() => {
    const c = {}
    for (const e of entries) { if (e.mood) c[e.mood] = (c[e.mood] || 0) + 1 }
    return c
  }, [entries])

  const today = todayLocalDateString()
  const selectedEntries = selectedDate ? (entryByDate[selectedDate] || []) : []

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-gray-800">Journaling</h1>
            <p className="text-gray-600">Track your feelings and reflect on your journey 💕</p>
          </div>
          <Button onClick={() => setOpen(true)} className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">+ New Entry</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#FFE5D9]/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">{monthLabel}</h2>
              <div className="flex gap-1">
                <button onClick={() => setMonthOffset(o => o - 1)} className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-[#FFF8F6]"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setMonthOffset(0)} className="px-2 h-8 rounded-lg border text-xs hover:bg-[#FFF8F6]">Today</button>
                <button onClick={() => setMonthOffset(o => o + 1)} className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-[#FFF8F6]"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-2">
              {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((c, i) => {
                const dayEntries = entryByDate[c.date] || []
                const moodScore = dayEntries[0]?.mood_score
                const bg = moodScore ? MOOD_COLORS[moodScore] || "bg-gray-100" : ""
                return (
                  <button
                    key={i}
                    onClick={() => !c.muted && setSelectedDate(c.date === selectedDate ? null : c.date)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm relative
                      ${c.muted ? "text-gray-300" : "text-gray-700 hover:bg-[#FFF8F6]"}
                      ${c.date === today ? "ring-2 ring-[#F4A896]" : ""}
                      ${c.date === selectedDate ? "bg-[#FFF8F6] border border-[#F4A896]" : bg}
                    `}
                  >
                    {c.day}
                    {dayEntries.length > 0 && !c.muted && (
                      <span className="text-[8px] text-[#E8907C]">{MOODS.find(m => m.label === dayEntries[0].mood)?.emoji || "•"}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {selectedDate && (
              <div className="mt-4 p-4 rounded-2xl bg-[#FFF8F6] border border-[#FFE5D9]/50">
                <h3 className="font-medium text-gray-800 mb-2">{selectedDate}</h3>
                {selectedEntries.length === 0
                  ? <p className="text-sm text-gray-400">No entries for this day</p>
                  : selectedEntries.map(e => (
                    <div key={e.id} className="mb-2">
                      <p className="text-sm font-medium">{MOODS.find(m => m.label === e.mood)?.emoji} {e.title}</p>
                      {e.content && <p className="text-xs text-gray-500">{e.content}</p>}
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-[#FFE5D9]/50">
              <h3 className="font-semibold text-gray-800 mb-3">📈 Mood Trends</h3>
              {[["Anxious","😰"],["Tired","😴"],["Calm","😌"],["Hopeful","🌟"],["Happy","😊"]].map(([m, emoji]) => {
                const count = moodCounts[m] || 0
                const max = Math.max(...Object.values(moodCounts), 1)
                return (
                  <div key={m} className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1.5">{emoji} {m}</span>
                      <span>{count}</span>
                    </div>
                    <div className="h-1.5 bg-[#FFF4EF] rounded-full mt-1">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-[#F4A896] to-[#E8907C] transition-all" style={{ width: `${Math.round((count / max) * 100)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="bg-gradient-to-br from-[#FAD1C8] to-[#F6C3B8] rounded-3xl p-5 text-gray-800">
              <h3 className="font-semibold mb-2">Remember 💕</h3>
              <p className="text-sm">Every emotion you feel is valid. Taking time to check in with yourself is a beautiful act of self-care.</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-[#FFE5D9]/50">
              <h3 className="font-semibold text-gray-800 mb-3">Your Journey</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl bg-[#FFF8F6] p-3"><p className="text-2xl font-bold text-[#E8907C]">{entries.length}</p><p className="text-xs text-gray-500">Total Entries</p></div>
                <div className="rounded-xl bg-[#FFF8F6] p-3"><p className="text-2xl font-bold text-[#E8907C]">{entries.filter(e => new Date(e.created_at || Date.now()) > new Date(Date.now() - 7*86400000)).length}</p><p className="text-xs text-gray-500">This Week</p></div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent entries */}
        <div className="mt-7 bg-white rounded-3xl p-5 border border-[#FFE5D9]/50">
          <h3 className="font-semibold text-gray-800 mb-3">Recent Entries</h3>
          <div className="space-y-2">
            {entries.slice(0, 6).map(e => (
              <div key={e.id} className="rounded-xl bg-[#FFF8F6] p-3">
                <p className="font-medium text-gray-800 inline-flex items-center gap-2">
                  {MOODS.find(m => m.label === e.mood)?.emoji || "🙂"} {e.title}
                  <span className="text-xs text-gray-400 font-normal ml-auto">{(e.date || "").slice(0, 10)}</span>
                </p>
                {e.content && <p className="text-sm text-gray-500 mt-1">{e.content}</p>}
              </div>
            ))}
            {entries.length === 0 && <p className="text-sm text-gray-400">No entries yet. Start by logging how you feel today 💕</p>}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[620px] rounded-2xl">
          <DialogHeader><DialogTitle>How are you feeling today?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">Select the mood that best describes how you're feeling right now</p>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {MOODS.map(m => (
              <button key={m.label} onClick={() => setSelectedMood(m)} className={`rounded-xl border px-3 py-2 text-sm ${selectedMood.label === m.label ? "border-[#F4A896] bg-[#FFF8F6]" : "border-gray-200"}`}>
                <div className="text-xl">{m.emoji}</div>
                <div className="text-xs mt-1">{m.label}</div>
              </button>
            ))}
          </div>
          <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write about your day, what's on your mind..." className="min-h-[120px] rounded-xl mt-2" />
          <Button disabled={saveEntry.isPending} onClick={() => saveEntry.mutate()} className="w-full rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
            {saveEntry.isPending ? "Saving..." : "Save Entry"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
