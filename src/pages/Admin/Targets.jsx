import { useEffect, useState } from 'react'
import { ArrowLeft, Bell, BellOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '../../lib/pushNotifications'

const NUMERIC_FIELDS = [
  'weight_kg',
  'height_cm',
  'body_fat_pct',
  'lean_mass_kg',
  'bmr',
  'target_kcal_gym',
  'target_kcal_football',
  'target_kcal_gymfootball',
  'target_kcal_rest',
  'target_protein_g',
  'target_carbs_g',
  'target_fat_g',
]

function toFormState(profile) {
  const form = { name: profile.name ?? '', start_date: profile.start_date ?? '' }
  for (const key of NUMERIC_FIELDS) {
    form[key] = profile[key] ?? ''
  }
  return form
}

export default function Targets() {
  const { user } = useAuth()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pushSupported, setPushSupported] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushError, setPushError] = useState(null)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) setForm(toFormState(data))
      setPushEnabled(Boolean(data?.push_subscription))
      setPushSupported(await isPushSupported())
    })()
  }, [user])

  const field = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const payload = { name: form.name.trim() || null, start_date: form.start_date || null }
    for (const key of NUMERIC_FIELDS) {
      payload[key] = form[key] === '' ? null : Number(form[key])
    }

    await supabase.from('profiles').update(payload).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const togglePush = async () => {
    setPushBusy(true)
    setPushError(null)
    try {
      if (pushEnabled) {
        await unsubscribeFromPush(user.id)
        setPushEnabled(false)
      } else {
        await subscribeToPush(user.id)
        setPushEnabled(true)
      }
    } catch (err) {
      setPushError(err.message)
    } finally {
      setPushBusy(false)
    }
  }

  if (!form) {
    return (
      <div className="p-4 pb-24">
        <p className="text-white/40">Loading…</p>
      </div>
    )
  }

  const numberField = (key, label) => (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
        {label}
      </label>
      <input
        type="number"
        inputMode="decimal"
        value={form[key]}
        onChange={field(key)}
        className="w-full rounded-lg border border-white/10 bg-surface2 px-3 py-2.5 text-white outline-none focus:border-accent"
      />
    </div>
  )

  return (
    <div className="p-4 pb-24">
      <div className="mb-4 flex items-center gap-2">
        <Link to="/admin" className="text-white/60">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-white">Personal Targets</h1>
      </div>

      <div className="mb-4 rounded-2xl bg-surface p-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-white/40">Push notifications</p>
        {!pushSupported && (
          <p className="text-sm text-white/40">Not supported in this browser.</p>
        )}
        {pushSupported && (
          <>
            <button
              type="button"
              onClick={togglePush}
              disabled={pushBusy}
              className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 font-semibold disabled:opacity-50 ${
                pushEnabled ? 'border border-white/10 text-white' : 'bg-accent text-black'
              }`}
            >
              {pushEnabled ? <BellOff size={18} /> : <Bell size={18} />}
              {pushBusy ? 'Please wait…' : pushEnabled ? 'Disable notifications' : 'Enable notifications'}
            </button>
            {pushError && <p className="mt-2 text-xs text-red-400">{pushError}</p>}
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-2xl bg-surface p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-white/40">Profile</p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
                Name
              </label>
              <input
                value={form.name}
                onChange={field('name')}
                className="w-full rounded-lg border border-white/10 bg-surface2 px-3 py-2.5 text-white outline-none focus:border-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {numberField('weight_kg', 'Weight (kg)')}
              {numberField('height_cm', 'Height (cm)')}
              {numberField('body_fat_pct', 'Body fat %')}
              {numberField('lean_mass_kg', 'Lean mass (kg)')}
              {numberField('bmr', 'BMR')}
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
                  Start date
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={field('start_date')}
                  className="w-full rounded-lg border border-white/10 bg-surface2 px-3 py-2.5 text-white outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-white/40">Calorie targets</p>
          <div className="grid grid-cols-2 gap-3">
            {numberField('target_kcal_gym', 'Gym day')}
            {numberField('target_kcal_football', 'Football day')}
            {numberField('target_kcal_gymfootball', 'Gym + football')}
            {numberField('target_kcal_rest', 'Rest day')}
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-white/40">Macro targets (g)</p>
          <div className="grid grid-cols-3 gap-3">
            {numberField('target_protein_g', 'Protein')}
            {numberField('target_carbs_g', 'Carbs')}
            {numberField('target_fat_g', 'Fat')}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-accent py-3 font-semibold text-black disabled:opacity-50"
        >
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
