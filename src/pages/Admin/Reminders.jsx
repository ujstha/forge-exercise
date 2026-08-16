import { useState } from 'react'
import { ArrowLeft, Plus, X, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useReminders } from '../../hooks/useReminders'
import ReminderCard from '../../components/ReminderCard'
import { WEEKDAYS, REMINDER_CONDITIONS } from '../../lib/constants'

const EMPTY_FORM = {
  label: '',
  time_of_day: '07:00',
  days: [...WEEKDAYS],
  only_on: '',
  message: '',
  is_active: true,
}

export default function Reminders() {
  const { reminders, loading, addReminder, updateReminder, deleteReminder, toggleActive } =
    useReminders()
  const [editing, setEditing] = useState(null)

  const handleSave = async (form) => {
    const payload = {
      label: form.label.trim(),
      time_of_day: form.time_of_day,
      days: form.days,
      only_on: form.only_on || null,
      message: form.message.trim() || null,
      is_active: form.is_active,
    }

    if (form.id) {
      await updateReminder(form.id, payload)
    } else {
      await addReminder(payload)
    }
    setEditing(null)
  }

  const handleDelete = async (id) => {
    await deleteReminder(id)
    setEditing(null)
  }

  return (
    <div className="p-4 pb-24">
      <div className="mb-4 flex items-center gap-2">
        <Link to="/admin" className="text-white/60">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-white">Reminders</h1>
      </div>

      <button
        onClick={() => setEditing({ ...EMPTY_FORM })}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-semibold text-black"
      >
        <Plus size={18} />
        Add reminder
      </button>

      {loading && <p className="text-white/40">Loading…</p>}

      <div className="space-y-2">
        {reminders.map((r) => (
          <ReminderCard
            key={r.id}
            reminder={r}
            onToggle={() => toggleActive(r)}
            onEdit={() => setEditing(r)}
          />
        ))}
      </div>

      {editing && (
        <ReminderFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onDelete={editing.id ? () => handleDelete(editing.id) : null}
        />
      )}
    </div>
  )
}

function ReminderFormModal({ initial, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial, only_on: initial.only_on ?? '' })

  const toggleDay = (day) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="max-h-[85vh] w-full space-y-4 overflow-y-auto rounded-t-2xl bg-surface p-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-white">
            {form.id ? 'Edit reminder' : 'Add reminder'}
          </p>
          <button type="button" onClick={onClose} className="text-white/60">
            <X size={22} />
          </button>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
            Label
          </label>
          <input
            required
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-surface2 px-3 py-2.5 text-white outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
            Time
          </label>
          <input
            type="time"
            required
            value={form.time_of_day.slice(0, 5)}
            onChange={(e) => setForm((f) => ({ ...f, time_of_day: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-surface2 px-3 py-2.5 text-white outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-white/50">
            Days
          </label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                  form.days.includes(day) ? 'bg-accent text-black' : 'bg-surface2 text-white/60'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
            Condition
          </label>
          <select
            value={form.only_on}
            onChange={(e) => setForm((f) => ({ ...f, only_on: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-surface2 px-3 py-2.5 text-white outline-none focus:border-accent"
          >
            {REMINDER_CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
            Notification message
          </label>
          <textarea
            rows={2}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-surface2 px-3 py-2.5 text-white outline-none focus:border-accent"
          />
        </div>

        <label className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-2.5">
          <span className="text-sm text-white">Active</span>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            className="h-5 w-5 accent-accent"
          />
        </label>

        <div className="flex gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/30 py-3 font-semibold text-red-400"
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
          <button type="submit" className="flex-1 rounded-lg bg-accent py-3 font-semibold text-black">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
