import { WEEKDAYS, REMINDER_CONDITIONS } from '../lib/constants'

function formatTime(timeOfDay) {
  const [h, m] = timeOfDay.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

function formatDays(days) {
  if (!days || days.length === 7) return 'Every day'
  const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri']
  if (days.length === 5 && weekdays.every((d) => days.includes(d))) return 'Weekdays'
  return WEEKDAYS.filter((d) => days.includes(d))
    .map((d) => d[0].toUpperCase() + d.slice(1))
    .join(', ')
}

export default function ReminderCard({ reminder, onToggle, onEdit }) {
  return (
    <button
      onClick={onEdit}
      className="flex w-full items-center justify-between rounded-xl bg-surface p-4 text-left"
    >
      <div className={reminder.is_active ? '' : 'opacity-40'}>
        <p className="text-xl font-semibold text-white">{formatTime(reminder.time_of_day)}</p>
        <p className="mt-0.5 text-sm text-white">{reminder.label}</p>
        <p className="mt-0.5 text-xs text-white/40">
          {formatDays(reminder.days)}
          {reminder.only_on
            ? ` · ${REMINDER_CONDITIONS.find((c) => c.value === reminder.only_on)?.label ?? reminder.only_on}`
            : ''}
        </p>
      </div>

      <span
        role="switch"
        aria-checked={reminder.is_active}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          reminder.is_active ? 'bg-accent' : 'bg-white/15'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            reminder.is_active ? 'left-6' : 'left-1'
          }`}
        />
      </span>
    </button>
  )
}
