import { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Pencil, Trash2, X, ArrowUp, ArrowDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const EMPTY_FORM = { name: '', dose: '', notes: '', status: 'continue' }

export default function Supplements() {
  const { user } = useAuth()
  const [supplements, setSupplements] = useState([])
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data } = await supabase
      .from('supplements')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true })
    setSupplements(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (user) load()
  }, [user])

  const handleSave = async (form) => {
    const payload = {
      name: form.name.trim(),
      dose: form.dose.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status,
    }

    if (form.id) {
      await supabase.from('supplements').update(payload).eq('id', form.id)
    } else {
      const nextOrder = supplements.length
        ? Math.max(...supplements.map((s) => s.display_order ?? 0)) + 1
        : 1
      await supabase
        .from('supplements')
        .insert({ ...payload, user_id: user.id, display_order: nextOrder })
    }

    setEditing(null)
    await load()
  }

  const handleDelete = async (id) => {
    await supabase.from('supplements').delete().eq('id', id)
    await load()
  }

  const toggleStatus = async (s) => {
    await supabase
      .from('supplements')
      .update({ status: s.status === 'continue' ? 'finish' : 'continue' })
      .eq('id', s.id)
    await load()
  }

  const move = async (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= supplements.length) return
    const a = supplements[index]
    const b = supplements[target]
    await Promise.all([
      supabase.from('supplements').update({ display_order: b.display_order }).eq('id', a.id),
      supabase.from('supplements').update({ display_order: a.display_order }).eq('id', b.id),
    ])
    await load()
  }

  return (
    <div className="p-4 pb-24">
      <div className="mb-4 flex items-center gap-2">
        <Link to="/admin" className="text-white/60">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-white">Supplements</h1>
      </div>

      <button
        onClick={() => setEditing({ ...EMPTY_FORM })}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-semibold text-black"
      >
        <Plus size={18} />
        Add supplement
      </button>

      {loading && <p className="text-white/40">Loading…</p>}

      <div className="space-y-2">
        {supplements.map((s, i) => (
          <div key={s.id} className="rounded-xl bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white">{s.name}</p>
                  <button
                    onClick={() => toggleStatus(s)}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      s.status === 'continue'
                        ? 'bg-accent/20 text-accent'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {s.status}
                  </button>
                </div>
                {s.dose && <p className="mt-0.5 text-xs text-white/40">{s.dose}</p>}
                {s.notes && <p className="mt-0.5 text-xs text-white/30">{s.notes}</p>}
              </div>

              <div className="flex shrink-0 flex-col items-center gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="text-white/30 disabled:opacity-20"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === supplements.length - 1}
                    className="text-white/30 disabled:opacity-20"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setEditing(s)} className="text-white/50">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="text-red-400/70">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <SupplementFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

function SupplementFormModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial })

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
          <p className="text-lg font-semibold text-white">
            {form.id ? 'Edit supplement' : 'Add supplement'}
          </p>
          <button type="button" onClick={onClose} className="text-white/60">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
              Name
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-surface2 px-3 py-2.5 text-white outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
              Dose
            </label>
            <input
              value={form.dose}
              onChange={(e) => setForm((f) => ({ ...f, dose: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-surface2 px-3 py-2.5 text-white outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
              Notes
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-surface2 px-3 py-2.5 text-white outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
              Status
            </label>
            <div className="flex gap-2">
              {['continue', 'finish'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status }))}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize ${
                    form.status === status ? 'bg-accent text-black' : 'bg-surface2 text-white/60'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
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
