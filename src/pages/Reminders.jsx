import React, { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { Bell, Calendar, Clock, Mail, Smartphone } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function Reminders() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    category: "other",
    repeat: "none",
    in_app: true,
    email: true,
    sms: false,
  })

  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => base44.entities.Reminder.list("date", 100),
  })

  const createReminder = useMutation({
    mutationFn: () =>
      base44.entities.Reminder.create({
        title: form.title,
        description: form.description,
        date: form.date,
        time: form.time,
        category: form.category,
        repeat: form.repeat,
        is_completed: false,
      }),
    onSuccess: () => {
      setOpen(false)
      setForm({
        title: "",
        description: "",
        date: "",
        time: "",
        category: "other",
        repeat: "none",
        in_app: true,
        email: true,
        sms: false,
      })
      queryClient.invalidateQueries({ queryKey: ["reminders"] })
      queryClient.invalidateQueries({ queryKey: ["upcomingReminders"] })
    },
  })

  const markComplete = useMutation({
    mutationFn: ({ id }) => base44.entities.Reminder.update(id, { is_completed: true }),
    onSuccess: () => {
      toast.success("Moved to Past Reminders")
      queryClient.invalidateQueries({ queryKey: ["reminders"] })
      queryClient.invalidateQueries({ queryKey: ["upcomingReminders"] })
    },
    onError: (err) => toast.error(err?.message || "Could not update reminder"),
  })

  const active = reminders.filter((r) => !r.is_completed)
  const past = reminders.filter((r) => r.is_completed)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-gray-800">Reminders</h1>
            <p className="text-gray-600">Never miss what matters most 💕</p>
          </div>
          <Button onClick={() => setOpen(true)} className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
            + Add Reminder
          </Button>
        </div>

        <h2 className="text-lg font-semibold text-gray-800 mb-3">Active Reminders</h2>
        {active.length === 0 ? (
          <div className="bg-white rounded-3xl p-14 text-center border border-[#FFE5D9]/50">
            <Bell className="w-12 h-12 text-[#F4A896]/40 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No active reminders</p>
            <Button onClick={() => setOpen(true)} className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
              Add Your First Reminder
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-[#FFE5D9]/50 p-4 flex items-start justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-gray-800">{r.title}</p>
                  <p className="text-sm text-gray-500">{r.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {r.date} {r.time ? `· ${r.time}` : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => markComplete.mutate({ id: r.id })}
                  disabled={markComplete.isPending}
                  className="rounded-xl border-[#FFE5D9] text-[#E8907C]"
                >
                  Done
                </Button>
              </div>
            ))}
          </div>
        )}

        <h2 className="text-lg font-semibold text-gray-800 mb-3 mt-10">Past Reminders</h2>
        {past.length === 0 ? (
          <p className="text-sm text-gray-500">No completed reminders yet. Tap &quot;Done&quot; on an active reminder to move it here.</p>
        ) : (
          <div className="space-y-2 opacity-90">
            {past.map((r) => (
              <div
                key={r.id}
                className="bg-white/80 rounded-2xl border border-[#FFE5D9]/40 p-4 flex items-start justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-gray-600 line-through">{r.title}</p>
                  {r.description ? <p className="text-sm text-gray-400 line-through">{r.description}</p> : null}
                  <p className="text-xs text-gray-400 mt-1">
                    {r.date} {r.time ? `· ${r.time}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[620px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create Reminder</DialogTitle>
          </DialogHeader>

          <Input
            placeholder="What do you need to remember?"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />

          <Textarea
            placeholder="Additional details (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-gray-500">Date</label>
              <div className="relative">
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
                <Calendar className="w-4 h-4 absolute right-3 top-3 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-500">Time</label>
              <div className="relative">
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                />
                <Clock className="w-4 h-4 absolute right-3 top-3 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-gray-500">Category</label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="medication">Medication</SelectItem>
                  <SelectItem value="appointment">Appointment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-500">Repeat</label>
              <Select value={form.repeat} onValueChange={(v) => setForm((f) => ({ ...f, repeat: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Notification Type</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, in_app: !f.in_app }))}
                className={`px-3 py-2 rounded-xl border text-sm ${form.in_app ? "border-[#F4A896] bg-[#FFF8F6]" : "border-gray-200"}`}
              >
                In-App
              </button>

              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, email: !f.email }))}
                className={`px-3 py-2 rounded-xl border text-sm ${form.email ? "border-[#F4A896] bg-[#FFF8F6]" : "border-gray-200"}`}
              >
                <Mail className="w-3 h-3 inline mr-1" />
                Email
              </button>

              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, sms: !f.sms }))}
                className={`px-3 py-2 rounded-xl border text-sm ${form.sms ? "border-[#F4A896] bg-[#FFF8F6]" : "border-gray-200"}`}
              >
                <Smartphone className="w-3 h-3 inline mr-1" />
                SMS
              </button>
            </div>
          </div>

          <Button
            disabled={!form.title || !form.date || createReminder.isPending}
            onClick={() => createReminder.mutate()}
            className="w-full rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]"
          >
            Create Reminder
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
