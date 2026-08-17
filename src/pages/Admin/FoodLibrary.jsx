import { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Pencil, Trash2, X, Lock, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { MEAL_SLOTS } from '../../lib/constants'
import ListSection from '../../components/ListSection'

const EMPTY_FORM = {
  name: '',
  brand: '',
  protein_per_100g: '',
  carbs_per_100g: '',
  fat_per_100g: '',
  kcal_per_100g: '',
  serving_size_g: '',
  serving_name: '',
}

export default function FoodLibrary() {
  const { user } = useAuth()
  const [foods, setFoods] = useState([])
  const [favorites, setFavorites] = useState([])
  const [editingFood, setEditingFood] = useState(null) // null = closed, {} = new, object = editing
  const [favoritingFood, setFavoritingFood] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadFoods = async () => {
    const [foodsRes, favoritesRes] = await Promise.all([
      supabase.from('foods').select('*').order('name', { ascending: true }),
      supabase.from('food_favorites').select('*').eq('user_id', user.id),
    ])
    setFoods(foodsRes.data ?? [])
    setFavorites(favoritesRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (user) loadFoods()
  }, [user])

  const handleSave = async (form) => {
    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      protein_per_100g: Number(form.protein_per_100g) || 0,
      carbs_per_100g: Number(form.carbs_per_100g) || 0,
      fat_per_100g: Number(form.fat_per_100g) || 0,
      kcal_per_100g: Number(form.kcal_per_100g) || 0,
      serving_size_g: form.serving_size_g === '' ? null : Number(form.serving_size_g),
      serving_name: form.serving_name.trim() || null,
    }

    if (form.id) {
      await supabase.from('foods').update(payload).eq('id', form.id)
    } else {
      await supabase.from('foods').insert({ ...payload, user_id: user.id, is_preloaded: false })
    }

    setEditingFood(null)
    await loadFoods()
  }

  const handleDelete = async (id) => {
    await supabase.from('foods').delete().eq('id', id)
    await loadFoods()
  }

  const handleSaveFavorite = async (food, { meal_slot, usual_grams }) => {
    await supabase.from('food_favorites').delete().eq('user_id', user.id).eq('food_id', food.id)
    if (meal_slot) {
      await supabase
        .from('food_favorites')
        .insert({ user_id: user.id, food_id: food.id, meal_slot, usual_grams })
    }
    setFavoritingFood(null)
    await loadFoods()
  }

  return (
    <div className="p-4 pb-24">
      <div className="mb-4 flex items-center gap-2">
        <Link to="/admin" className="text-white/60">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-white">Food Library</h1>
      </div>

      <button
        onClick={() => setEditingFood({ ...EMPTY_FORM })}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-semibold text-black"
      >
        <Plus size={18} />
        Add food
      </button>

      {loading && <p className="text-white/40">Loading…</p>}

      <ListSection>
        {foods.map((food) => {
          const favorite = favorites.find((f) => f.food_id === food.id)
          return (
            <div key={food.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{food.name}</p>
                <p className="text-xs text-white/40">
                  {food.brand ? `${food.brand} · ` : ''}
                  {food.kcal_per_100g} kcal · P{food.protein_per_100g} C{food.carbs_per_100g} F
                  {food.fat_per_100g} /100g
                  {food.serving_name ? ` · ${food.serving_name}` : ''}
                </p>
                {favorite && (
                  <p className="mt-0.5 text-xs text-accent">
                    {favorite.meal_slot} usual · {favorite.usual_grams}g
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <button
                  onClick={() => setFavoritingFood(food)}
                  className={favorite ? 'text-accent' : 'text-white/30'}
                >
                  <Star size={16} fill={favorite ? 'currentColor' : 'none'} />
                </button>
                {food.is_preloaded ? (
                  <Lock size={16} className="text-white/20" />
                ) : (
                  <>
                    <button onClick={() => setEditingFood(food)} className="text-white/50">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(food.id)} className="text-red-400/70">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </ListSection>

      {editingFood && (
        <FoodFormModal
          initial={editingFood}
          onClose={() => setEditingFood(null)}
          onSave={handleSave}
        />
      )}

      {favoritingFood && (
        <FavoriteModal
          food={favoritingFood}
          initial={favorites.find((f) => f.food_id === favoritingFood.id)}
          onClose={() => setFavoritingFood(null)}
          onSave={(values) => handleSaveFavorite(favoritingFood, values)}
        />
      )}
    </div>
  )
}

function FoodFormModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial })

  const field = (key, label, opts = {}) => (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
        {label}
      </label>
      <input
        type={opts.type ?? 'text'}
        inputMode={opts.type === 'number' ? 'decimal' : undefined}
        required={opts.required}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full rounded-lg border border-white/10 bg-surface2 px-3 py-2.5 text-white outline-none focus:border-accent"
      />
    </div>
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-surface"
      >
        <div className="flex shrink-0 items-center justify-between p-4 pb-3">
          <p className="text-lg font-semibold text-white">{form.id ? 'Edit food' : 'Add food'}</p>
          <button type="button" onClick={onClose} className="text-white/60">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4">
          {field('name', 'Name', { required: true })}
          {field('brand', 'Brand (optional)')}

          <div className="grid grid-cols-2 gap-3">
            {field('protein_per_100g', 'Protein / 100g', { type: 'number', required: true })}
            {field('carbs_per_100g', 'Carbs / 100g', { type: 'number', required: true })}
            {field('fat_per_100g', 'Fat / 100g', { type: 'number', required: true })}
            {field('kcal_per_100g', 'Kcal / 100g', { type: 'number', required: true })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field('serving_size_g', 'Serving size (g)', { type: 'number' })}
            {field('serving_name', 'Serving name')}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/5 p-4">
          <button type="submit" className="w-full rounded-lg bg-accent py-3 font-semibold text-black">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

function FavoriteModal({ food, initial, onClose, onSave }) {
  const [mealSlot, setMealSlot] = useState(initial?.meal_slot ?? '')
  const [usualGrams, setUsualGrams] = useState(initial ? String(initial.usual_grams) : '')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ meal_slot: mealSlot || null, usual_grams: Number(usualGrams) || 0 })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-surface"
      >
        <div className="flex shrink-0 items-center justify-between p-4 pb-3">
          <p className="text-lg font-semibold text-white">Quick-tick for {food.name}</p>
          <button type="button" onClick={onClose} className="text-white/60">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 space-y-3 px-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
              Meal slot
            </label>
            <select
              value={mealSlot}
              onChange={(e) => setMealSlot(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-surface2 px-3 py-2.5 text-white outline-none focus:border-accent"
            >
              <option value="">Not a favorite</option>
              {MEAL_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
          {mealSlot && (
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
                Usual grams
              </label>
              <input
                type="number"
                inputMode="decimal"
                required
                value={usualGrams}
                onChange={(e) => setUsualGrams(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-surface2 px-3 py-2.5 text-white outline-none focus:border-accent"
              />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-white/5 p-4">
          <button type="submit" className="w-full rounded-lg bg-accent py-3 font-semibold text-black">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
