import { useEffect, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { todayISO, addDaysISO } from '../lib/date'
import { TARGET_KCAL_FIELD } from '../lib/constants'

const CHART_AXIS_COLOR = 'rgba(255,255,255,0.4)'
const CHART_GRID_COLOR = 'rgba(255,255,255,0.08)'

function formatShortDate(dateISO) {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}

export default function Progress() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [bodyLogs, setBodyLogs] = useState([])
  const [exerciseNames, setExerciseNames] = useState([])
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [strengthData, setStrengthData] = useState([])
  const [weekStats, setWeekStats] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const [profileRes, bodyLogsRes, exerciseRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('body_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('log_date', { ascending: true }),
        supabase
          .from('set_logs')
          .select('exercise_name, workout_logs!inner(user_id)')
          .eq('workout_logs.user_id', user.id),
      ])

      if (profileRes.data) setProfile(profileRes.data)
      setBodyLogs(bodyLogsRes.data ?? [])

      const names = [...new Set((exerciseRes.data ?? []).map((r) => r.exercise_name))].sort()
      setExerciseNames(names)
      setSelectedExercise((current) => current ?? names[0] ?? null)
    })()
  }, [user])

  useEffect(() => {
    if (!user || !selectedExercise) {
      setStrengthData([])
      return
    }
    ;(async () => {
      const { data } = await supabase
        .from('set_logs')
        .select('kg, reps, completed, workout_logs!inner(user_id, log_date)')
        .eq('exercise_name', selectedExercise)
        .eq('workout_logs.user_id', user.id)
        .eq('completed', true)

      const byDate = {}
      for (const row of data ?? []) {
        const date = row.workout_logs.log_date
        const kg = Number(row.kg) || 0
        if (!byDate[date] || kg > byDate[date]) byDate[date] = kg
      }

      setStrengthData(
        Object.entries(byDate)
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([date, kg]) => ({ date, label: formatShortDate(date), kg })),
      )
    })()
  }, [user, selectedExercise])

  useEffect(() => {
    if (!user || !profile) return
    ;(async () => {
      const today = todayISO()
      const weekDates = Array.from({ length: 7 }, (_, i) => addDaysISO(today, -i))

      const [foodLogsRes, dayTypesRes] = await Promise.all([
        supabase
          .from('food_logs')
          .select('log_date, kcal, protein_g')
          .eq('user_id', user.id)
          .in('log_date', weekDates),
        supabase
          .from('day_type_logs')
          .select('log_date, day_type')
          .eq('user_id', user.id)
          .in('log_date', weekDates),
      ])

      const dayTypeByDate = Object.fromEntries(
        (dayTypesRes.data ?? []).map((r) => [r.log_date, r.day_type]),
      )

      const totalsByDate = {}
      for (const row of foodLogsRes.data ?? []) {
        totalsByDate[row.log_date] = totalsByDate[row.log_date] ?? { kcal: 0, protein_g: 0 }
        totalsByDate[row.log_date].kcal += Number(row.kcal)
        totalsByDate[row.log_date].protein_g += Number(row.protein_g)
      }

      let proteinHits = 0
      let kcalHits = 0
      let loggedDays = 0

      for (const date of weekDates) {
        const totals = totalsByDate[date]
        if (!totals) continue
        loggedDays += 1

        if (totals.protein_g >= profile.target_protein_g) proteinHits += 1

        const dayType = dayTypeByDate[date]
        const kcalTarget = dayType ? profile[TARGET_KCAL_FIELD[dayType]] : null
        if (kcalTarget && totals.kcal <= kcalTarget * 1.05) kcalHits += 1
      }

      setWeekStats({ loggedDays, proteinHits, kcalHits, totalDays: weekDates.length })
    })()
  }, [user, profile])

  const latestWeight = useMemo(() => bodyLogs[bodyLogs.length - 1]?.weight_kg, [bodyLogs])

  const saveMeasurement = async (entry) => {
    const { data: existing } = await supabase
      .from('body_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('log_date', entry.log_date)
      .maybeSingle()

    if (existing) {
      await supabase.from('body_logs').update(entry).eq('id', existing.id)
    } else {
      await supabase.from('body_logs').insert({ user_id: user.id, ...entry })
    }

    const { data } = await supabase
      .from('body_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('log_date', { ascending: true })
    setBodyLogs(data ?? [])
    setShowAddModal(false)
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Progress</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-black"
        >
          <Plus size={14} />
          Log measurement
        </button>
      </div>

      <section className="mt-6 rounded-2xl bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-wide text-white/40">Body weight</p>
          {latestWeight != null && (
            <p className="text-sm font-semibold text-white">{latestWeight} kg</p>
          )}
        </div>
        <div className="mt-2 h-48">
          {bodyLogs.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bodyLogs.map((b) => ({ ...b, label: formatShortDate(b.log_date) }))}>
                <CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} />
                <XAxis dataKey="label" stroke={CHART_AXIS_COLOR} fontSize={11} tickLine={false} />
                <YAxis
                  stroke={CHART_AXIS_COLOR}
                  fontSize={11}
                  tickLine={false}
                  domain={['dataMin - 1', 'dataMax + 1']}
                />
                <Tooltip
                  contentStyle={{ background: '#1e1e1e', border: 'none', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="weight_kg" stroke="#c8f135" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/30">
              Log at least two entries to see a trend.
            </div>
          )}
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-surface p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-white/40">Strength</p>
          {exerciseNames.length > 0 && (
            <select
              value={selectedExercise ?? ''}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="rounded-lg border border-white/10 bg-surface2 px-2 py-1 text-xs text-white outline-none"
            >
              {exerciseNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="mt-2 h-48">
          {strengthData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={strengthData}>
                <CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} />
                <XAxis dataKey="label" stroke={CHART_AXIS_COLOR} fontSize={11} tickLine={false} />
                <YAxis stroke={CHART_AXIS_COLOR} fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e1e1e', border: 'none', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="kg" stroke="#c8f135" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/30">
              {exerciseNames.length === 0
                ? 'Complete a logged set to see strength trends.'
                : 'Log this exercise on two or more dates to see a trend.'}
            </div>
          )}
        </div>
      </section>

      {weekStats && (
        <section className="mt-4 rounded-2xl bg-surface p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-white/40">
            Last 7 days ({weekStats.loggedDays} logged)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface2 p-3 text-center">
              <p className="text-xl font-bold text-white">
                {weekStats.proteinHits}/{weekStats.totalDays}
              </p>
              <p className="text-[10px] uppercase text-white/40">Protein target hit</p>
            </div>
            <div className="rounded-xl bg-surface2 p-3 text-center">
              <p className="text-xl font-bold text-white">
                {weekStats.kcalHits}/{weekStats.totalDays}
              </p>
              <p className="text-[10px] uppercase text-white/40">Calorie target hit</p>
            </div>
          </div>
        </section>
      )}

      <section className="mt-4 rounded-2xl bg-surface p-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-white/40">Measurements</p>
        {bodyLogs.length === 0 && <p className="text-sm text-white/30">No measurements logged yet.</p>}
        <div className="space-y-2">
          {[...bodyLogs]
            .reverse()
            .slice(0, 10)
            .map((log) => (
              <div key={log.id} className="rounded-lg bg-surface2 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{formatShortDate(log.log_date)}</span>
                  {log.weight_kg != null && <span className="text-white/60">{log.weight_kg} kg</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/40">
                  {log.body_fat_pct != null && <span>BF {log.body_fat_pct}%</span>}
                  {log.waist_cm != null && <span>Waist {log.waist_cm}cm</span>}
                  {log.chest_cm != null && <span>Chest {log.chest_cm}cm</span>}
                  {log.arm_cm != null && <span>Arm {log.arm_cm}cm</span>}
                  {log.thigh_cm != null && <span>Thigh {log.thigh_cm}cm</span>}
                </div>
              </div>
            ))}
        </div>
      </section>

      {showAddModal && (
        <MeasurementModal onClose={() => setShowAddModal(false)} onSave={saveMeasurement} />
      )}
    </div>
  )
}

function MeasurementModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    log_date: todayISO(),
    weight_kg: '',
    body_fat_pct: '',
    waist_cm: '',
    chest_cm: '',
    arm_cm: '',
    thigh_cm: '',
    notes: '',
  })

  const field = (key, label, type = 'number') => (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
        {label}
      </label>
      <input
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full rounded-lg border border-white/10 bg-surface2 px-3 py-2.5 text-white outline-none focus:border-accent"
      />
    </div>
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    const entry = { log_date: form.log_date, notes: form.notes || null }
    for (const key of ['weight_kg', 'body_fat_pct', 'waist_cm', 'chest_cm', 'arm_cm', 'thigh_cm']) {
      entry[key] = form[key] === '' ? null : Number(form[key])
    }
    onSave(entry)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="max-h-[85vh] w-full space-y-3 overflow-y-auto rounded-t-2xl bg-surface p-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-white">Log measurement</p>
          <button type="button" onClick={onClose} className="text-white/60">
            <X size={22} />
          </button>
        </div>

        {field('log_date', 'Date', 'date')}
        <div className="grid grid-cols-2 gap-3">
          {field('weight_kg', 'Weight (kg)')}
          {field('body_fat_pct', 'Body fat %')}
          {field('waist_cm', 'Waist (cm)')}
          {field('chest_cm', 'Chest (cm)')}
          {field('arm_cm', 'Arm (cm)')}
          {field('thigh_cm', 'Thigh (cm)')}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
            Notes
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full rounded-lg border border-white/10 bg-surface2 px-3 py-2.5 text-white outline-none focus:border-accent"
          />
        </div>

        <button type="submit" className="w-full rounded-lg bg-accent py-3 font-semibold text-black">
          Save
        </button>
      </form>
    </div>
  )
}
