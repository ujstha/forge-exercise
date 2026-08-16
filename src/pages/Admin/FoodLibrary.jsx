import { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Pencil, Trash2, X, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

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
  const [editingFood, setEditingFood] = useState(null) // null = closed, {} = new, object = editing
  const [loading, setLoading] = useState(true)

  const loadFoods = async () => {
    const { data } = await supabase.from('foods').select('*').order('name', { ascending: true })
    setFoods(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadFoods()
  }, [])

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

      <div className="space-y-2">
        {foods.map((food) => (
          <div key={food.id} className="rounded-xl bg-surface p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-white">{food.name}</p>
                <p className="text-xs text-white/40">
                  {food.brand ? `${food.brand} · ` : ''}
                  {food.kcal_per_100g} kcal · P{food.protein_per_100g} C{food.carbs_per_100g} F
                  {food.fat_per_100g} /100g
                  {food.serving_name ? ` · ${food.serving_name}` : ''}
                </p>
              </div>

              {food.is_preloaded ? (
                <Lock size={16} className="mt-1 shrink-0 text-white/20" />
              ) : (
                <div className="flex shrink-0 gap-3">
                  <button onClick={() => setEditingFood(food)} className="text-white/50">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(food.id)} className="text-red-400/70">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {editingFood && (
        <FoodFormModal
          initial={editingFood}
          onClose={() => setEditingFood(null)}
          onSave={handleSave}
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
    <div className="fixed inset-0 z-50 flex items-end bg-black/60">
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
