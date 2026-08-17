import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Check, Dumbbell } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useFoodLog } from '../hooks/useFoodLog'
import MacroRing from '../components/MacroRing'
import { todayISO } from '../lib/date'
import { DAY_TYPES, TARGET_KCAL_FIELD, WEEKDAYS, WEEKDAY_LABELS } from '../lib/constants'

function startOfWeek(date) {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7 // 0 = Monday
  d.setDate(d.getDate() - day)
  return d
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function computeStreak(logDates) {
  const dates = new Set(logDates)
  const today = todayISO()
  let cursor = new Date(`${today}T00:00:00`)
  if (!dates.has(today)) cursor.setDate(cursor.getDate() - 1)

  let streak = 0
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export default function Dashboard() {
  const { user } = useAuth()
  const today = todayISO()
  const { totals } = useFoodLog(today)

  const [profile, setProfile] = useState(null)
  const [dayType, setDayType] = useState(null)
  const [supplements, setSupplements] = useState([])
  const [takenIds, setTakenIds] = useState(new Set())
  const [session, setSession] = useState(null)
  const [weekData, setWeekData] = useState([])
  const [streak, setStreak] = useState(0)
  const [weightStat, setWeightStat] = useState(null)

  const loadDashboard = useCallback(async () => {
    if (!user) return

    const [profileRes, dayTypeRes, supplementsRes, supplementLogsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('day_type_logs')
        .select('day_type')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .maybeSingle(),
      supabase
        .from('supplements')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true }),
      supabase
        .from('supplement_logs')
        .select('supplement_id')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .eq('taken', true),
    ])

    if (profileRes.data) setProfile(profileRes.data)
    setDayType(dayTypeRes.data?.day_type ?? null)
    setSupplements(supplementsRes.data ?? [])
    setTakenIds(new Set((supplementLogsRes.data ?? []).map((r) => r.supplement_id)))

    const weekStart = startOfWeek(new Date())
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d.toISOString().slice(0, 10)
    })

    const [weekDayTypes, weekWorkouts] = await Promise.all([
      supabase
        .from('day_type_logs')
        .select('log_date, day_type')
        .eq('user_id', user.id)
        .in('log_date', weekDates),
      supabase
        .from('workout_logs')
        .select('log_date')
        .eq('user_id', user.id)
        .in('log_date', weekDates),
    ])

    const dayTypeByDate = Object.fromEntries(
      (weekDayTypes.data ?? []).map((r) => [r.log_date, r.day_type]),
    )
    const completedDates = new Set((weekWorkouts.data ?? []).map((r) => r.log_date))

    setWeekData(
      weekDates.map((date, i) => ({
        date,
        label: WEEKDAY_LABELS[WEEKDAYS[i]],
        dayType: dayTypeByDate[date] ?? null,
        completed: completedDates.has(date),
        isToday: date === today,
      })),
    )

    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    const [recentWorkoutDates, recentWeights] = await Promise.all([
      supabase
        .from('workout_logs')
        .select('log_date')
        .eq('user_id', user.id)
        .gte('log_date', sixtyDaysAgo.toISOString().slice(0, 10)),
      supabase
        .from('body_logs')
        .select('weight_kg, log_date')
        .eq('user_id', user.id)
        .not('weight_kg', 'is', null)
        .order('log_date', { ascending: false })
        .limit(2),
    ])

    setStreak(computeStreak((recentWorkoutDates.data ?? []).map((r) => r.log_date)))

    const [latest, previous] = recentWeights.data ?? []
    setWeightStat(
      latest
        ? { kg: latest.weight_kg, delta: previous ? latest.weight_kg - previous.weight_kg : null }
        : null,
    )

    // Today's session: next session in rotation for the first preloaded programme
    const { data: programme } = await supabase
      .from('programmes')
      .select('id')
      .eq('is_preloaded', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (programme) {
      const { data: sessions } = await supabase
        .from('programme_sessions')
        .select('*')
        .eq('programme_id', programme.id)
        .order('session_order', { ascending: true })

      const { count } = await supabase
        .from('workout_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('programme_id', programme.id)

      if (sessions?.length) {
        setSession(sessions[(count ?? 0) % sessions.length])
      }
    }
  }, [user, today])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const setDayTypeForToday = async (value) => {
    setDayType(value)
    await supabase
      .from('day_type_logs')
      .upsert({ user_id: user.id, log_date: today, day_type: value }, { onConflict: 'user_id,log_date' })
  }

  const toggleSupplement = async (supplementId) => {
    const taken = takenIds.has(supplementId)
    const next = new Set(takenIds)
    if (taken) {
      next.delete(supplementId)
      await supabase
        .from('supplement_logs')
        .delete()
        .eq('user_id', user.id)
        .eq('supplement_id', supplementId)
        .eq('log_date', today)
    } else {
      next.add(supplementId)
      await supabase
        .from('supplement_logs')
        .upsert(
          { user_id: user.id, supplement_id: supplementId, log_date: today, taken: true },
          { onConflict: 'user_id,supplement_id,log_date' },
        )
    }
    setTakenIds(next)
  }

  const targetKcal = dayType && profile ? profile[TARGET_KCAL_FIELD[dayType]] : null
  const weekSessionsCount = weekData.filter((d) => d.completed).length
  const takenCount = takenIds.size

  return (
    <div className="p-4 pb-24">
      <h1 className="font-display text-4xl tracking-wide text-white">
        {greeting()}{profile?.name ? `, ${profile.name}` : ''}
      </h1>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatTile value={streak} label="Day streak" sub="active training" />
        <StatTile
          value={weightStat ? weightStat.kg : '—'}
          unit={weightStat ? 'kg' : ''}
          label="Weight"
          sub={
            weightStat?.delta != null
              ? `${weightStat.delta > 0 ? '↑' : weightStat.delta < 0 ? '↓' : '·'} ${Math.abs(weightStat.delta).toFixed(1)}kg`
              : 'no history yet'
          }
        />
        <StatTile value={weekSessionsCount} label="Sessions" sub="this week" />
      </div>

      {supplements.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-xs uppercase tracking-wide text-white/40">Supplements</p>
            <p className="font-mono text-xs text-white/40">
              {takenCount}/{supplements.length} taken
            </p>
          </div>
          <div className="space-y-2">
            {supplements.map((s) => {
              const taken = takenIds.has(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSupplement(s.id)}
                  className="flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3 text-left"
                >
                  <div>
                    <p className={`font-medium ${taken ? 'text-white/40 line-through' : 'text-white'}`}>
                      {s.name}
                    </p>
                    {s.dose && <p className="text-xs text-white/40">{s.dose}</p>}
                  </div>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                      taken ? 'border-accent bg-accent text-black' : 'border-white/20 text-transparent'
                    }`}
                  >
                    <Check size={16} />
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-2 overflow-x-auto">
        {DAY_TYPES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setDayTypeForToday(value)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              dayType === value ? 'bg-accent text-black' : 'bg-surface text-white/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {dayType && targetKcal != null && (
        <div className="mt-6 flex items-center justify-around rounded-2xl bg-surface p-6">
          <MacroRing consumed={totals.kcal} target={targetKcal} label="kcal" />
          <div className="space-y-3">
            <MacroStat
              label="Protein"
              consumed={totals.protein_g}
              target={profile.target_protein_g}
              color="protein"
            />
            <MacroStat
              label="Carbs"
              consumed={totals.carbs_g}
              target={profile.target_carbs_g}
              color="carbs"
            />
            <MacroStat label="Fat" consumed={totals.fat_g} target={profile.target_fat_g} color="fat" />
          </div>
        </div>
      )}

      {session && (
        <Link
          to="/workout"
          className="mt-6 flex items-center justify-between rounded-2xl bg-surface p-5 transition hover:bg-surface2"
        >
          <div>
            <p className="text-xs uppercase tracking-wide text-white/40">Today's session</p>
            <p className="mt-1 text-lg font-semibold text-white">{session.session_name}</p>
          </div>
          <Dumbbell className="text-accent" size={28} />
        </Link>
      )}

      {weekData.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs uppercase tracking-wide text-white/40">This week</p>
          <div className="flex justify-between rounded-2xl bg-surface p-4">
            {weekData.map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-1.5">
                <span className={`text-xs ${d.isToday ? 'text-accent' : 'text-white/40'}`}>
                  {d.label}
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    d.dayType ? 'bg-accent' : 'bg-white/15'
                  }`}
                />
                <span
                  className={`h-2 w-2 rounded-full ${
                    d.completed ? 'bg-white' : 'bg-transparent'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const MACRO_COLORS = {
  protein: { text: 'text-protein', bg: 'bg-protein', pill: 'bg-protein/10 text-protein' },
  carbs: { text: 'text-carbs', bg: 'bg-carbs', pill: 'bg-carbs/10 text-carbs' },
  fat: { text: 'text-fat', bg: 'bg-fat', pill: 'bg-fat/10 text-fat' },
}

function MacroStat({ label, consumed, target, color }) {
  const remaining = Math.max((target ?? 0) - consumed, 0)
  const pct = target ? Math.min((consumed / target) * 100, 100) : 0
  const over = consumed > (target ?? 0)
  const c = MACRO_COLORS[color]

  return (
    <div className="w-32">
      <div className="flex items-center justify-between text-xs">
        <span className={`rounded px-1.5 py-0.5 font-medium ${c.pill}`}>{label}</span>
        <span className={over ? 'text-red-400' : 'font-mono text-white/70'}>
          {Math.round(remaining)}g
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-white/10">
        <div
          className={`h-1.5 rounded-full ${over ? 'bg-red-400' : c.bg}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function StatTile({ value, unit = '', label, sub }) {
  return (
    <div className="rounded-2xl bg-surface p-3 text-center">
      <p className="font-display text-3xl leading-none text-accent">
        {value}
        {unit && <span className="text-lg text-white/50">{unit}</span>}
      </p>
      <p className="mt-1.5 text-[11px] text-white/50">{label}</p>
      <p className="font-mono text-[10px] text-white/30">{sub}</p>
    </div>
  )
}
