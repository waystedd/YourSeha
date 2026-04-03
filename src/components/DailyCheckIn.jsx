import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { Button } from "@/components/ui/button"

const MOODS = [
  { label: "Overwhelmed", emoji: "😵‍💫", score: 3 },
  { label: "Anxious", emoji: "😰", score: 4 },
  { label: "Tired", emoji: "😴", score: 5 },
  { label: "Calm", emoji: "😌", score: 7 },
  { label: "Hopeful", emoji: "🌟", score: 8 },
  { label: "Happy", emoji: "😊", score: 9 },
]

export default function DailyCheckIn() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState(null)

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  })

  const { data: entries = [] } = useQuery({
    queryKey: ["journalEntries"],
    queryFn: () => base44.entities.JournalEntry.list("-created_at", 60),
    enabled: !!user,
  })

  const today = new Date().toISOString().slice(0, 10)
  const todaysEntry = useMemo(
    () => entries.find((entry) => String(entry.date || "").slice(0, 10) === today),
    [entries, today]
  )

  const saveCheckIn = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Please choose a mood")
      return base44.entities.JournalEntry.create({
        title: `${selected.label} check-in`,
        mood: selected.label,
        mood_score: selected.score,
        content: "Daily check-in",
        date: today,
      })
    },
    onSuccess: () => {
      setSelected(null)
      queryClient.invalidateQueries({ queryKey: ["journalEntries"] })
    },
  })

  if (!user) return null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
      <div className="rounded-3xl border border-[#FFE5D9] bg-white/85 backdrop-blur px-5 py-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="font-semibold text-gray-900">Daily Check-In</div>
            <div className="text-sm text-gray-600">
              {todaysEntry
                ? `You checked in today as ${todaysEntry.mood}.`
                : "How are you feeling today? Pick a mood to log a quick wellness check-in."}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {MOODS.map((mood) => {
              const active = todaysEntry?.mood === mood.label || selected?.label === mood.label
              return (
                <button
                  key={mood.label}
                  type="button"
                  disabled={!!todaysEntry}
                  onClick={() => setSelected(mood)}
                  className={`px-3 py-2 rounded-2xl border text-sm transition-all ${
                    active
                      ? "border-[#F4A896] bg-[#FFF8F6] text-[#E8907C]"
                      : "border-[#FFE5D9] text-gray-600 hover:bg-[#FFF8F6]"
                  } ${todaysEntry ? "cursor-default" : "cursor-pointer"}`}
                >
                  <span className="mr-1.5">{mood.emoji}</span>
                  {mood.label}
                </button>
              )
            })}

            {!todaysEntry ? (
              <Button
                disabled={!selected || saveCheckIn.isPending}
                onClick={() => saveCheckIn.mutate()}
                className="rounded-2xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]"
              >
                {saveCheckIn.isPending ? "Saving..." : "Save Check-In"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
