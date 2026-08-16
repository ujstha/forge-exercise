import { useEffect, useState } from 'react'
import { X, ChevronLeft, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

function computeMacros(food, grams) {
  const factor = grams / 100
  return {
    protein_g: Math.round(food.protein_per_100g * factor * 10) / 10,
    carbs_g: Math.round(food.carbs_per_100g * factor * 10) / 10,
    fat_g: Math.round(food.fat_per_100g * factor * 10) / 10,
    kcal: Math.round(food.kcal_per_100g * factor),
  }
}

export default function FoodSearch({ open, mealSlot, onClose, onConfirm }) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedFood, setSelectedFood] = useState(null)
  const [grams, setGrams] = useState('100')

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setSelectedFood(null)
      setGrams('100')
    }
  }, [open])

  useEffect(() => {
    if (!open || !user || selectedFood) return

    const handle = setTimeout(async () => {
      let q = supabase.from('foods').select('*').order('name', { ascending: true }).limit(30)
      q = query.trim()
        ? q.or(`user_id.is.null,user_id.eq.${user.id}`).ilike('name', `%${query.trim()}%`)
        : q.or(`user_id.is.null,user_id.eq.${user.id}`)
      const { data } = await q
      setResults(data ?? [])
    }, 200)

    return () => clearTimeout(handle)
  }, [query, open, user, selectedFood])

  if (!open) return null

  const selectFood = (food) => {
    setSelectedFood(food)
    setGrams(food.serving_size_g ? String(food.serving_size_g) : '100')
  }

  const gramsNum = Number(grams) || 0
  const preview = selectedFood ? computeMacros(selectedFood, gramsNum) : null

  const handleConfirm = (e) => {
    e.preventDefault()
    if (!selectedFood || gramsNum <= 0) return
    onConfirm({
      food_id: selectedFood.id,
      food_name: selectedFood.name,
      meal_slot: mealSlot,
      grams: gramsNum,
      ...computeMacros(selectedFood, gramsNum),
    })
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (results.length === 1) selectFood(results[0])
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60">
      <div className="flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-surface">
        <div className="flex shrink-0 items-center justify-between p-4 pb-3">
          {selectedFood ? (
            <button
              onClick={() => setSelectedFood(null)}
              className="flex items-center gap-1 text-white/60"
            >
              <ChevronLeft size={20} />
              Back
            </button>
          ) : (
            <p className="text-sm font-semibold text-white">
              Add to <span className="text-accent">{mealSlot}</span>
            </p>
          )}
          <button onClick={onClose} className="text-white/60">
            <X size={22} />
          </button>
        </div>

        {!selectedFood && (
          <form onSubmit={handleSearchSubmit} className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="relative mb-3">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search foods…"
                className="w-full rounded-lg border border-white/10 bg-surface2 py-3 pl-9 pr-3 text-white outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1">
              {results.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => selectFood(food)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition hover:bg-surface2"
                >
                  <div>
                    <p className="font-medium text-white">{food.name}</p>
                    <p className="text-xs text-white/40">
                      {food.brand ? `${food.brand} · ` : ''}
                      {food.kcal_per_100g} kcal / 100g
                      {food.serving_name ? ` · ${food.serving_name}` : ''}
                    </p>
                  </div>
                </button>
              ))}
              {results.length === 0 && (
                <p className="py-6 text-center text-sm text-white/30">No foods found.</p>
              )}
            </div>
          </form>
        )}

        {selectedFood && (
          <form onSubmit={handleConfirm} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4">
              <p className="text-lg font-semibold text-white">{selectedFood.name}</p>
              {selectedFood.serving_name && (
                <p className="mb-4 text-xs text-white/40">
                  Serving: {selectedFood.serving_name}
                  {selectedFood.serving_size_g ? ` (${selectedFood.serving_size_g}g)` : ''}
                </p>
              )}

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

              {preview && (
                <div className="mt-4 grid grid-cols-4 gap-2 rounded-lg bg-surface2 p-3 text-center">
                  <div>
                    <p className="text-sm font-semibold text-white">{preview.kcal}</p>
                    <p className="text-[10px] uppercase text-white/40">kcal</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{preview.protein_g}g</p>
                    <p className="text-[10px] uppercase text-white/40">protein</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{preview.carbs_g}g</p>
                    <p className="text-[10px] uppercase text-white/40">carbs</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{preview.fat_g}g</p>
                    <p className="text-[10px] uppercase text-white/40">fat</p>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-white/5 p-4">
              <button
                type="submit"
                disabled={gramsNum <= 0}
                className="w-full rounded-lg bg-accent py-3 font-semibold text-black disabled:opacity-50"
              >
                Add to {mealSlot}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
