import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useFoodLog } from '../hooks/useFoodLog'
import FoodSearch from '../components/FoodSearch'
import { todayISO, addDaysISO } from '../lib/date'
import { TARGET_KCAL_FIELD, MEAL_SLOTS } from '../lib/constants'

function formatDisplayDate(dateISO) {
  const d = new Date(`${dateISO}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function Nutrition() {
  const { user } = useAuth()
  const today = todayISO()
  const [date, setDate] = useState(today)
  const { logs, totals, addLog, updateLog, deleteLog } = useFoodLog(date)

  const [profile, setProfile] = useState(null)
  const [dayType, setDayType] = useState(null)
  const [addingSlot, setAddingSlot] = useState(null)
  const [editingLog, setEditingLog] = useState(null)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const [profileRes, dayTypeRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('day_type_logs')
          .select('day_type')
          .eq('user_id', user.id)
          .eq('log_date', date)
          .maybeSingle(),
      ])
      if (profileRes.data) setProfile(profileRes.data)
      setDayType(dayTypeRes.data?.day_type ?? null)
    })()
  }, [user, date])

  const targetKcal = dayType && profile ? profile[TARGET_KCAL_FIELD[dayType]] : null

  const cards = [
    { label: 'Kcal', consumed: totals.kcal, target: targetKcal, unit: '' },
    { label: 'Protein', consumed: totals.protein_g, target: profile?.target_protein_g, unit: 'g' },
    { label: 'Carbs', consumed: totals.carbs_g, target: profile?.target_carbs_g, unit: 'g' },
    { label: 'Fat', consumed: totals.fat_g, target: profile?.target_fat_g, unit: 'g' },
  ]

  const logsBySlot = MEAL_SLOTS.reduce((acc, slot) => {
    acc[slot] = logs.filter((l) => l.meal_slot === slot)
    return acc
  }, {})

  const handleAddFood = async (entry) => {
    await addLog(entry)
    setAddingSlot(null)
  }

  const handleSaveEdit = async (grams) => {
    if (!editingLog) return
    const factor = grams / editingLog.grams
    await updateLog(editingLog.id, {
      grams,
      protein_g: Math.round(editingLog.protein_g * factor * 10) / 10,
      carbs_g: Math.round(editingLog.carbs_g * factor * 10) / 10,
      fat_g: Math.round(editingLog.fat_g * factor * 10) / 10,
      kcal: Math.round(editingLog.kcal * factor),
    })
    setEditingLog(null)
  }

  const handleDelete = async () => {
    if (!editingLog) return
    await deleteLog(editingLog.id)
    setEditingLog(null)
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setDate((d) => addDaysISO(d, -1))}
          className="rounded-full p-2 text-white/60 hover:bg-surface"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="text-center">
          <p className="font-semibold text-white">{formatDisplayDate(date)}</p>
          {date !== today && (
            <button onClick={() => setDate(today)} className="text-xs text-accent">
              Today
            </button>
          )}
        </div>
        <button
          onClick={() => setDate((d) => addDaysISO(d, 1))}
          className="rounded-full p-2 text-white/60 hover:bg-surface"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <MacroCard key={c.label} {...c} />
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {MEAL_SLOTS.map((slot) => {
          const items = logsBySlot[slot]
          const slotTotal = items.reduce(
            (acc, l) => ({
              kcal: acc.kcal + Number(l.kcal),
              protein_g: acc.protein_g + Number(l.protein_g),
              carbs_g: acc.carbs_g + Number(l.carbs_g),
              fat_g: acc.fat_g + Number(l.fat_g),
            }),
            { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
          )

          return (
            <div key={slot} className="rounded-2xl bg-surface p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{slot}</p>
                  {items.length > 0 && (
                    <p className="text-xs text-white/40">
                      {Math.round(slotTotal.kcal)} kcal · P{Math.round(slotTotal.protein_g)} · C
                      {Math.round(slotTotal.carbs_g)} · F{Math.round(slotTotal.fat_g)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setAddingSlot(slot)}
                  className="flex items-center gap-1 rounded-full bg-surface2 px-3 py-1.5 text-xs font-medium text-accent"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>

              {items.length > 0 && (
                <div className="mt-3 space-y-2">
                  {items.map((log) => (
                    <button
                      key={log.id}
                      onClick={() => setEditingLog(log)}
                      className="flex w-full items-center justify-between rounded-lg bg-surface2 px-3 py-2 text-left"
                    >
                      <div>
                        <p className="text-sm text-white">{log.food_name}</p>
                        <p className="text-xs text-white/40">{log.grams}g</p>
                      </div>
                      <p className="text-xs text-white/50">{Math.round(log.kcal)} kcal</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <FoodSearch
        open={addingSlot !== null}
        mealSlot={addingSlot}
        onClose={() => setAddingSlot(null)}
        onConfirm={handleAddFood}
      />

      {editingLog && (
        <EditLogModal
          log={editingLog}
          onClose={() => setEditingLog(null)}
          onSave={handleSaveEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

function MacroCard({ label, consumed, target, unit }) {
  const hasTarget = target != null
  const remaining = hasTarget ? Math.max(target - consumed, 0) : null
  const pct = hasTarget && target > 0 ? Math.min((consumed / target) * 100, 100) : 0
  const over = hasTarget && consumed > target

  return (
    <div className="rounded-2xl bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className={`mt-1 text-xl font-bold ${over ? 'text-red-400' : 'text-white'}`}>
        {hasTarget ? Math.round(remaining) : Math.round(consumed)}
        {unit}
      </p>
      <p className="text-xs text-white/30">{hasTarget ? 'remaining' : 'consumed'}</p>
      {hasTarget && (
        <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
          <div
            className={`h-1.5 rounded-full ${over ? 'bg-red-400' : 'bg-accent'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

function EditLogModal({ log, onClose, onSave, onDelete }) {
  const [grams, setGrams] = useState(String(log.grams))
  const gramsNum = Number(grams) || 0

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60">
      <div className="w-full rounded-t-2xl bg-surface p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{log.food_name}</p>
          <button onClick={onClose} className="text-white/60">
            <X size={22} />
          </button>
        </div>

        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
          Grams
        </label>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-surface2 px-4 py-3 text-white outline-none focus:border-accent"
        />

        <div className="mt-4 flex gap-2">
          <button
            onClick={onDelete}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/30 py-3 font-semibold text-red-400"
          >
            <Trash2 size={16} />
            Delete
          </button>
          <button
            onClick={() => onSave(gramsNum)}
            disabled={gramsNum <= 0}
            className="flex-1 rounded-lg bg-accent py-3 font-semibold text-black disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
