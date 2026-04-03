import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { base44, supabase } from '@/api/base44Client'
import { Calendar, Loader2, CheckCircle2, XCircle, Link as LinkIcon, Video } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const PRESET_SLOTS = [30, 60]
const PRESET_DURATIONS = [30, 60, 90, 120]

const tabs = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

const WEEK_DAYS = [
  { id: 'sun', label: 'Sun' },
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
]

function parseAvailabilityNotes(raw) {
  const empty = {
    workDays: [],
    workStart: '08:00',
    workEnd: '14:00',
    scheduleText: '',
    slotIntervalMinutes: 30,
    caregiverDurationMinutes: 120,
    slotIntervalCustom: false,
    caregiverDurationCustom: false,
  }
  if (!raw) return empty
  try {
    const j = JSON.parse(raw)
    if (j && typeof j === 'object') {
      const si = Number(j.slotIntervalMinutes) || 30
      const cd = Number(j.caregiverDurationMinutes) || 120
      return {
        workDays: Array.isArray(j.workDays) ? j.workDays : [],
        workStart: j.workStart || '08:00',
        workEnd: j.workEnd || '14:00',
        scheduleText: j.scheduleText || j.scheduledText || '',
        slotIntervalMinutes: si,
        caregiverDurationMinutes: cd,
        slotIntervalCustom: j.slotIntervalCustom === true || !PRESET_SLOTS.includes(si),
        caregiverDurationCustom: j.caregiverDurationCustom === true || !PRESET_DURATIONS.includes(cd),
      }
    }
  } catch {
    /* legacy plain text */
  }
  return {
    ...empty,
    scheduleText: String(raw),
  }
}

function buildScheduleSummary(workDays, workStart, workEnd) {
  const order = WEEK_DAYS.map((d) => d.id)
  const sorted = [...new Set(workDays)].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  if (sorted.length === 0) return ''
  const labels = sorted.map((id) => WEEK_DAYS.find((d) => d.id === id)?.label || id).join(', ')
  return `${labels}: ${workStart} – ${workEnd} (your local times)`
}

export default function PsychologistAppointments() {
  const queryClient = useQueryClient()
  const [active, setActive] = useState('upcoming')
  const [zoomDrafts, setZoomDrafts] = useState({})
  const [scheduleForm, setScheduleForm] = useState({
    workDays: ['sun', 'mon', 'tue', 'wed', 'thu'],
    workStart: '08:00',
    workEnd: '14:00',
    scheduleText: '',
    slotIntervalMinutes: 30,
    caregiverDurationMinutes: 120,
    slotIntervalCustom: false,
    caregiverDurationCustom: false,
  })
  const [savingSchedule, setSavingSchedule] = useState(false)

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() })
  const { data: psychologistRows = [] } = useQuery({
    queryKey: ['myPsychologistProfile', user?.id],
    queryFn: () => base44.entities.Psychologist.filter({ user_id: user?.id }, '-created_date', 1),
    enabled: !!user?.id,
  })
  const psychologist = psychologistRows[0]

  const { data: psychNotesRow } = useQuery({
    queryKey: ['psychologistAvailabilityJson', user?.id],
    queryFn: async () => {
      const uid = user.id
      const { data, error } = await supabase.from('psychologists').select('availability_notes').eq('user_id', uid).maybeSingle()
      if (error) {
        const code = error?.code
        const msg = String(error.message || '')
        if (code === '42703' || msg.includes('availability_notes') || msg.includes('schema cache') || msg.includes('PGRST204')) {
          return { availability_notes: null }
        }
        throw new Error(error.message)
      }
      return data
    },
    enabled: !!user?.id && user?.role === 'psychologist',
  })

  useEffect(() => {
    if (!psychNotesRow || psychNotesRow.availability_notes == null) return
    const raw = psychNotesRow.availability_notes
    if (raw === '') return
    const p = parseAvailabilityNotes(raw)
    setScheduleForm({
      workDays: p.workDays.length ? p.workDays : ['sun', 'mon', 'tue', 'wed', 'thu'],
      workStart: p.workStart,
      workEnd: p.workEnd,
      scheduleText: p.scheduleText,
      slotIntervalMinutes: p.slotIntervalMinutes,
      caregiverDurationMinutes: p.caregiverDurationMinutes,
      slotIntervalCustom: p.slotIntervalCustom,
      caregiverDurationCustom: p.caregiverDurationCustom,
    })
  }, [psychNotesRow])

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['allAppointments'],
    queryFn: () => base44.entities.Appointment.list('-date', 200),
  })

  useEffect(() => {
    setZoomDrafts((current) => {
      const next = { ...current }
      appointments.forEach((appointment) => {
        next[appointment.id] = current[appointment.id] ?? appointment.meeting_link ?? ''
      })
      return next
    })
  }, [appointments])

  const saveWeeklySchedule = async () => {
    if (!scheduleForm.workDays.length) {
      toast.error('Pick at least one working day')
      return
    }
    setSavingSchedule(true)
    try {
      const prev = parseAvailabilityNotes(psychNotesRow?.availability_notes || '')
      const autoSummary = buildScheduleSummary(scheduleForm.workDays, scheduleForm.workStart, scheduleForm.workEnd)
      const slotMin = Math.max(15, Number(scheduleForm.slotIntervalMinutes) || 30)
      const careMin = Math.max(15, Number(scheduleForm.caregiverDurationMinutes) || 120)
      const scheduleText =
        scheduleForm.scheduleText?.trim() ||
        autoSummary ||
        prev.scheduleText
      await base44.auth.updatePsychologistAvailabilityNotes({
        workDays: scheduleForm.workDays,
        workStart: scheduleForm.workStart,
        workEnd: scheduleForm.workEnd,
        scheduleText,
        slotIntervalMinutes: slotMin,
        caregiverDurationMinutes: careMin,
        slotIntervalCustom: scheduleForm.slotIntervalCustom,
        caregiverDurationCustom: scheduleForm.caregiverDurationCustom,
      })
      queryClient.invalidateQueries({ queryKey: ['psychologistAvailabilityJson', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['psychologistAvailability', user?.id] })
      toast.success('Schedule saved')
    } catch (e) {
      toast.error(e?.message || 'Could not save schedule')
    } finally {
      setSavingSchedule(false)
    }
  }

  const saveZoomLink = useMutation({
    mutationFn: async (appointment) => {
      const meetingLink = (zoomDrafts[appointment.id] || '').trim()
      if (!meetingLink) throw new Error('Please enter the Zoom link first')

      await base44.entities.Appointment.update(appointment.id, {
        meeting_link: meetingLink,
        meeting_provider: 'zoom',
      })

      if (appointment.user_id) {
        await base44.entities.Notification.create({
          user_id: appointment.user_id,
          title: 'Zoom link shared',
          message: `Your session on ${appointment.date} at ${appointment.time} now has a Zoom link available.`,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAppointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Zoom link saved')
    },
    onError: (error) => toast.error(error?.message || 'Could not save the Zoom link'),
  })

  const updateStatus = useMutation({
    mutationFn: async ({ appointment, status }) => {
      await base44.entities.Appointment.update(appointment.id, { status })

      if (status === 'cancelled' && appointment.availability_slot_id) {
        await base44.entities.PsychologistAvailability.update(appointment.availability_slot_id, { is_booked: false })
      }

      if (appointment.user_id) {
        await base44.entities.Notification.create({
          user_id: appointment.user_id,
          title: status === 'completed' ? 'Session completed' : 'Session cancelled',
          message: status === 'completed'
            ? `Your session on ${appointment.date} at ${appointment.time} has been marked as completed.`
            : `Your session on ${appointment.date} at ${appointment.time} has been cancelled.`,
        })
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allAppointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success(variables.status === 'completed' ? 'Session marked as completed' : 'Session cancelled')
    },
    onError: (error) => toast.error(error?.message || 'Could not update this session'),
  })

  const counts = useMemo(() => {
    const byStatus = { upcoming: 0, completed: 0, cancelled: 0 }
    for (const appointment of appointments) {
      if (appointment.status && byStatus[appointment.status] != null) byStatus[appointment.status] += 1
    }
    return byStatus
  }, [appointments])

  const filtered = useMemo(
    () => appointments.filter((appointment) => (appointment.status || 'upcoming') === active),
    [appointments, active],
  )

  const summaryLine = useMemo(
    () => buildScheduleSummary(scheduleForm.workDays, scheduleForm.workStart, scheduleForm.workEnd),
    [scheduleForm],
  )

  const toggleDay = (id) => {
    setScheduleForm((f) => ({
      ...f,
      workDays: f.workDays.includes(id) ? f.workDays.filter((d) => d !== id) : [...f.workDays, id],
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F4FF] to-white py-8">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-500" /> Appointments
          </h1>
          <p className="text-gray-500 text-sm">Set working hours, booking intervals, and notes for caregivers. Session list is below.</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Schedule &amp; availability</h2>
            {!psychologist ? <span className="text-xs text-orange-500">Complete your profile to save this</span> : null}
          </div>
          <p className="text-sm text-gray-600">
            Choose the days you work and your usual start/end times (e.g. Sunday–Thursday, 8:00 to 14:00).
          </p>
          <div className="flex flex-wrap gap-2">
            {WEEK_DAYS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleDay(d.id)}
                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  scheduleForm.workDays.includes(d.id)
                    ? 'bg-gradient-to-r from-[#F4A896] to-[#E8907C] text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#F4A896]'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Start</label>
              <Input
                type="time"
                value={scheduleForm.workStart}
                onChange={(e) => setScheduleForm((f) => ({ ...f, workStart: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">End</label>
              <Input
                type="time"
                value={scheduleForm.workEnd}
                onChange={(e) => setScheduleForm((f) => ({ ...f, workEnd: e.target.value }))}
                className="rounded-xl"
              />
            </div>
          </div>
          {summaryLine ? (
            <p className="text-sm text-gray-700 rounded-xl bg-[#FFF8F6] border border-[#FFE5D9]/60 px-3 py-2">
              <span className="font-medium">Summary:</span> {summaryLine}
            </p>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Slot interval (offered to patients)</label>
              <select
                value={scheduleForm.slotIntervalCustom ? 'custom' : String(scheduleForm.slotIntervalMinutes)}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === 'custom') setScheduleForm((f) => ({ ...f, slotIntervalCustom: true }))
                  else setScheduleForm((f) => ({ ...f, slotIntervalCustom: false, slotIntervalMinutes: Number(v) }))
                }}
                className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm bg-white"
              >
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="custom">Custom…</option>
              </select>
              {scheduleForm.slotIntervalCustom ? (
                <Input
                  type="number"
                  min={15}
                  step={5}
                  value={scheduleForm.slotIntervalMinutes}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, slotIntervalMinutes: Number(e.target.value) || 30 }))}
                  className="rounded-xl border-gray-200 mt-2"
                  placeholder="Minutes (e.g. 45)"
                />
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Max session length caregivers can book</label>
              <select
                value={scheduleForm.caregiverDurationCustom ? 'custom' : String(scheduleForm.caregiverDurationMinutes)}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === 'custom') setScheduleForm((f) => ({ ...f, caregiverDurationCustom: true }))
                  else setScheduleForm((f) => ({ ...f, caregiverDurationCustom: false, caregiverDurationMinutes: Number(v) }))
                }}
                className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm bg-white"
              >
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
                <option value="custom">Custom…</option>
              </select>
              {scheduleForm.caregiverDurationCustom ? (
                <Input
                  type="number"
                  min={15}
                  step={5}
                  value={scheduleForm.caregiverDurationMinutes}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, caregiverDurationMinutes: Number(e.target.value) || 120 }))}
                  className="rounded-xl border-gray-200 mt-2"
                  placeholder="Minutes (e.g. 150)"
                />
              ) : null}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Weekly availability notes</label>
            <Textarea
              value={scheduleForm.scheduleText}
              onChange={(e) => setScheduleForm((f) => ({ ...f, scheduleText: e.target.value }))}
              placeholder="e.g. Sun–Thu 8am–2pm (online), breaks at noon…"
              className="rounded-xl border-gray-200 min-h-[88px] resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Extra detail for your listing. If you leave this blank, the auto summary from your selected days and times is used.
            </p>
          </div>

          <Button
            disabled={!psychologist || savingSchedule || !scheduleForm.workDays.length}
            onClick={saveWeeklySchedule}
            className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]"
          >
            {savingSchedule ? 'Saving…' : 'Save schedule'}
          </Button>
        </div>

        <div className="flex gap-2 mb-0 bg-gray-100 rounded-xl p-1 w-full md:w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${active === tab.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label} ({counts[tab.id] || 0})
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{active === 'upcoming' ? 'No upcoming sessions, your schedule is clear' : `No ${active} sessions`}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((appointment) => (
                <div key={appointment.id} className="rounded-2xl p-5 border border-gray-100 bg-white shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
                    <div>
                      <p className="font-semibold text-gray-800">{appointment.user_email || 'Patient Session'}</p>
                      <p className="text-sm text-gray-500 mt-1">{appointment.date} · {appointment.time}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 inline-flex items-center gap-1">
                          <Video className="w-3 h-3" /> {appointment.meeting_provider === 'zoom' || appointment.session_type === 'online' ? 'Zoom' : (appointment.session_type || 'Session')}
                        </span>
                        {appointment.quoted_price ? <span className="px-2 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-100">{appointment.quoted_price} QAR</span> : null}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {active === 'upcoming' ? (
                        <>
                          <Button variant="outline" onClick={() => updateStatus.mutate({ appointment, status: 'completed' })} className="rounded-xl border-green-200 text-green-700 hover:bg-green-50">
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Complete
                          </Button>
                          <Button variant="outline" onClick={() => updateStatus.mutate({ appointment, status: 'cancelled' })} className="rounded-xl border-red-200 text-red-600 hover:bg-red-50">
                            <XCircle className="w-4 h-4 mr-2" /> Cancel
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {active === 'upcoming' ? (
                    <div className="rounded-2xl border border-[#FFE5D9]/60 bg-[#FFF8F6] p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <LinkIcon className="w-4 h-4 text-[#E8907C]" />
                        <p className="font-medium text-gray-800">Zoom meeting link</p>
                      </div>
                      <div className="flex flex-col md:flex-row gap-3">
                        <Input
                          value={zoomDrafts[appointment.id] || ''}
                          onChange={(e) => setZoomDrafts((current) => ({ ...current, [appointment.id]: e.target.value }))}
                          placeholder="https://zoom.us/j/..."
                          className="rounded-xl bg-white"
                        />
                        <Button onClick={() => saveZoomLink.mutate(appointment)} className="rounded-xl bg-gradient-to-r from-[#F4A896] to-[#E8907C]">
                          Save Link
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Once saved, the caregiver will see the Zoom join button in their appointment page.</p>
                    </div>
                  ) : appointment.meeting_link ? (
                    <a href={appointment.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-[#E8907C] hover:underline">
                      <Video className="w-4 h-4" /> Open saved Zoom link
                    </a>
                  ) : null}

                  {appointment.notes ? <p className="text-sm text-gray-600 italic">“{appointment.notes}”</p> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
