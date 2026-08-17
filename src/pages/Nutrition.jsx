import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Check } from 'lucide-react'
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

function macrosForGrams(food, grams) {
  const factor = grams / 100
  return {
    protein_g: Math.round(food.protein_per_100g * factor * 10) / 10,
    carbs_g: Math.round(food.carbs_per_100g * factor * 10) / 10,
    fat_g: Math.round(food.fat_per_100g * factor * 10) / 10,
    kcal: Math.round(food.kcal_per_100g * factor),
  }
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
  const [editError, setEditError] = useState(null)
  const [favorites, setFavorites] = useState([])

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const [profileRes, dayTypeRes, favoritesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('day_type_logs')
          .select('day_type')
          .eq('user_id', user.id)
          .eq('log_date', date)
          .maybeSingle(),
        supabase.from('food_favorites').select('*, food:foods(*)').eq('user_id', user.id),
      ])
      if (profileRes.data) setProfile(profileRes.data)
      setDayType(dayTypeRes.data?.day_type ?? null)
      setFavorites(favoritesRes.data ?? [])
    })()
  }, [user, date])

  const targetKcal = dayType && profile ? profile[TARGET_KCAL_FIELD[dayType]] : null

  const cards = [
    { label: 'Kcal', consumed: totals.kcal, target: targetKcal, unit: '', color: 'accent' },
    {
      label: 'Protein',
      consumed: totals.protein_g,
      target: profile?.target_protein_g,
      unit: 'g',
      color: 'protein',
    },
    {
      label: 'Carbs',
      consumed: totals.carbs_g,
      target: profile?.target_carbs_g,
      unit: 'g',
      color: 'carbs',
    },
    { label: 'Fat', consumed: totals.fat_g, target: profile?.target_fat_g, unit: 'g', color: 'fat' },
  ]

  const logsBySlot = MEAL_SLOTS.reduce((acc, slot) => {
    acc[slot] = logs.filter((l) => l.meal_slot === slot)
    return acc
  }, {})

  const handleAddFood = async (entry) => {
    await addLog(entry)
    setAddingSlot(null)
  }

  const handleQuickLog = async (favorite) => {
    await addLog({
      food_id: favorite.food.id,
      food_name: favorite.food.name,
      meal_slot: favorite.meal_slot,
      grams: favorite.usual_grams,
      ...macrosForGrams(favorite.food, favorite.usual_grams),
    })
  }

  const handleSaveEdit = async (grams) => {
    if (!editingLog) return
    const factor = grams / editingLog.grams
    try {
      await updateLog(editingLog.id, {
        grams,
        protein_g: Math.round(editingLog.protein_g * factor * 10) / 10,
        carbs_g: Math.round(editingLog.carbs_g * factor * 10) / 10,
        fat_g: Math.round(editingLog.fat_g * factor * 10) / 10,
        kcal: Math.round(editingLog.kcal * factor),
      })
      setEditingLog(null)
    } catch (err) {
      setEditError(err.message)
    }
  }

  const handleDelete = async () => {
    if (!editingLog) return
    try {
      await deleteLog(editingLog.id)
      setEditingLog(null)
    } catch (err) {
      setEditError(err.message)
    }
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

          const favoritesForSlot = favorites.filter((f) => f.meal_slot === slot)
          const favoriteFoodIds = new Set(favoritesForSlot.map((f) => f.food_id))
          const loggedByFoodId = new Map(items.map((l) => [l.food_id, l]))
          const extraItems = items.filter((l) => !favoriteFoodIds.has(l.food_id))
          const hasRows = favoritesForSlot.length > 0 || extraItems.length > 0

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

              {hasRows && (
                <div className="mt-3 divide-y divide-white/5">
                  {favoritesForSlot.map((favorite) => {
                    const log = loggedByFoodId.get(favorite.food_id)
                    return (
                      <MealRow
                        key={favorite.id}
                        done={Boolean(log)}
                        primary={log ? log.food_name : favorite.food.name}
                        secondary={log ? `${log.grams}g` : `usual ${favorite.usual_grams}g`}
                        trailing={log ? `${Math.round(log.kcal)} kcal` : null}
                        onClick={() => {
                          if (log) {
                            setEditError(null)
                            setEditingLog(log)
                          } else {
                            handleQuickLog(favorite)
                          }
                        }}
                      />
                    )
                  })}
                  {extraItems.map((log) => (
                    <MealRow
                      key={log.id}
                      done
                      primary={log.food_name}
                      secondary={`${log.grams}g`}
                      trailing={`${Math.round(log.kcal)} kcal`}
                      onClick={() => {
                        setEditError(null)
                        setEditingLog(log)
                      }}
                    />
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
          error={editError}
          onClose={() => setEditingLog(null)}
          onSave={handleSaveEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

function MealRow({ done, primary, secondary, trailing, onClick }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 py-2.5 text-left">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          done ? 'bg-accent text-black' : 'border border-white/20'
        }`}
      >
        {done && <Check size={12} strokeWidth={3} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${done ? 'text-white' : 'text-white/60'}`}>{primary}</p>
        <p className="text-xs text-white/35">{secondary}</p>
      </div>
      {trailing && <p className="shrink-0 text-xs text-white/50">{trailing}</p>}
    </button>
  )
}

const CARD_COLORS = {
  accent: { text: 'text-accent', bg: 'bg-accent', pill: 'bg-accent/10 text-accent' },
  protein: { text: 'text-protein', bg: 'bg-protein', pill: 'bg-protein/10 text-protein' },
  carbs: { text: 'text-carbs', bg: 'bg-carbs', pill: 'bg-carbs/10 text-carbs' },
  fat: { text: 'text-fat', bg: 'bg-fat', pill: 'bg-fat/10 text-fat' },
}

function MacroCard({ label, consumed, target, unit, color }) {
  const hasTarget = target != null
  const remaining = hasTarget ? Math.max(target - consumed, 0) : null
  const pct = hasTarget && target > 0 ? Math.min((consumed / target) * 100, 100) : 0
  const over = hasTarget && consumed > target
  const c = CARD_COLORS[color] ?? CARD_COLORS.accent

  return (
    <div className="rounded-2xl bg-surface p-4">
      <p className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${c.pill}`}>{label}</p>
      <p className={`mt-1.5 font-mono text-xl font-bold ${over ? 'text-red-400' : 'text-white'}`}>
        {hasTarget ? Math.round(remaining) : Math.round(consumed)}
        {unit}
      </p>
      <p className="text-xs text-white/30">{hasTarget ? 'remaining' : 'consumed'}</p>
      {hasTarget && (
        <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
          <div
            className={`h-1.5 rounded-full ${over ? 'bg-red-400' : c.bg}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

function EditLogModal({ log, error, onClose, onSave, onDelete }) {
  const [grams, setGrams] = useState(String(log.grams))
  const gramsNum = Number(grams) || 0

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(gramsNum)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-surface"
      >
        <div className="flex shrink-0 items-center justify-between p-4 pb-3">
          <p className="text-lg font-semibold text-white">{log.food_name}</p>
          <button type="button" onClick={onClose} className="text-white/60">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
            Grams
          </label>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            min="0"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-surface2 px-4 py-3 text-white outline-none focus:border-accent"
          />
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-white/5 p-4">
          <button
            type="button"
            onClick={onDelete}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/30 py-3 font-semibold text-red-400"
          >
            <Trash2 size={16} />
            Delete
          </button>
          <button
            type="submit"
            disabled={gramsNum <= 0}
            className="flex-1 rounded-lg bg-accent py-3 font-semibold text-black disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
