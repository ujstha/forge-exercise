import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { todayISO } from '../lib/date'
import { STORAGE_KEYS } from '../lib/constants'

function parseTargetSets(targetSets) {
  const n = parseInt(targetSets, 10)
  return Number.isFinite(n) && n > 0 ? n : 3
}

function emptySet(setNumber) {
  return { id: null, set_number: setNumber, kg: '', reps: '', completed: false, rpe: null }
}

export function useWorkout() {
  const { user } = useAuth()
  const today = todayISO()

  const [programmes, setProgrammes] = useState([])
  const [programmeId, setProgrammeId] = useState(
    () => localStorage.getItem(STORAGE_KEYS.activeProgrammeId) || null,
  )
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [exercises, setExercises] = useState([])
  const [previousSets, setPreviousSets] = useState({}) // exerciseName -> [{kg, reps}]
  const [workoutLog, setWorkoutLog] = useState(null) // today's in-progress/finished log for this session
  const [setsByExercise, setSetsByExercise] = useState({}) // exerciseName -> [set]
  const [loading, setLoading] = useState(true)

  // Load programmes once
  useEffect(() => {
    supabase
      .from('programmes')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setProgrammes(data ?? [])
        setProgrammeId((current) => current || data?.[0]?.id || null)
      })
  }, [])

  // Load sessions when programme changes
  useEffect(() => {
    if (!programmeId) return
    localStorage.setItem(STORAGE_KEYS.activeProgrammeId, programmeId)
    supabase
      .from('programme_sessions')
      .select('*')
      .eq('programme_id', programmeId)
      .order('session_order', { ascending: true })
      .then(({ data }) => {
        setSessions(data ?? [])
        setSessionId((current) =>
          data?.some((s) => s.id === current) ? current : data?.[0]?.id ?? null,
        )
      })
  }, [programmeId])

  // Load exercises + previous session numbers + today's log when session changes
  useEffect(() => {
    if (!user || !sessionId) {
      setExercises([])
      setWorkoutLog(null)
      setSetsByExercise({})
      return
    }

    let cancelled = false
    setLoading(true)

    ;(async () => {
      const { data: exerciseRows } = await supabase
        .from('session_exercises')
        .select('*')
        .eq('session_id', sessionId)
        .order('exercise_order', { ascending: true })

      const { data: todayLog } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('programme_session_id', sessionId)
        .eq('log_date', today)
        .maybeSingle()

      const { data: lastLog } = await supabase
        .from('workout_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('programme_session_id', sessionId)
        .neq('log_date', today)
        .order('log_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      let previous = {}
      if (lastLog) {
        const { data: prevSets } = await supabase
          .from('set_logs')
          .select('*')
          .eq('workout_log_id', lastLog.id)
          .order('set_number', { ascending: true })
        for (const row of prevSets ?? []) {
          previous[row.exercise_name] = previous[row.exercise_name] ?? []
          previous[row.exercise_name].push({ kg: row.kg, reps: row.reps })
        }
      }

      let sets = {}
      if (todayLog) {
        const { data: todaySets } = await supabase
          .from('set_logs')
          .select('*')
          .eq('workout_log_id', todayLog.id)
          .order('set_number', { ascending: true })

        for (const ex of exerciseRows ?? []) {
          const existing = (todaySets ?? []).filter((s) => s.exercise_name === ex.exercise_name)
          sets[ex.exercise_name] = existing.length
            ? existing.map((s) => ({
                id: s.id,
                set_number: s.set_number,
                kg: s.kg ?? '',
                reps: s.reps ?? '',
                completed: s.completed,
                rpe: s.rpe,
              }))
            : Array.from({ length: parseTargetSets(ex.target_sets) }, (_, i) => emptySet(i + 1))
        }
      }

      if (cancelled) return
      setExercises(exerciseRows ?? [])
      setPreviousSets(previous)
      setWorkoutLog(todayLog ?? null)
      setSetsByExercise(sets)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [user, sessionId, today])

  const currentSession = useMemo(
    () => sessions.find((s) => s.id === sessionId) ?? null,
    [sessions, sessionId],
  )

  const startSession = useCallback(async () => {
    if (!user || !currentSession) return
    const { data, error } = await supabase
      .from('workout_logs')
      .insert({
        user_id: user.id,
        log_date: today,
        session_name: currentSession.session_name,
        programme_id: programmeId,
        programme_session_id: sessionId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error

    setWorkoutLog(data)
    setSetsByExercise(
      Object.fromEntries(
        exercises.map((ex) => [
          ex.exercise_name,
          Array.from({ length: parseTargetSets(ex.target_sets) }, (_, i) => emptySet(i + 1)),
        ]),
      ),
    )
  }, [user, currentSession, today, programmeId, sessionId, exercises])

  const updateSetField = useCallback((exerciseName, index, field, value) => {
    setSetsByExercise((prev) => {
      const rows = [...(prev[exerciseName] ?? [])]
      rows[index] = { ...rows[index], [field]: value }
      return { ...prev, [exerciseName]: rows }
    })
  }, [])

  const addSet = useCallback((exerciseName) => {
    setSetsByExercise((prev) => {
      const rows = prev[exerciseName] ?? []
      return { ...prev, [exerciseName]: [...rows, emptySet(rows.length + 1)] }
    })
  }, [])

  const removeSet = useCallback(async (exerciseName, index) => {
    const row = setsByExercise[exerciseName]?.[index]
    if (row?.id) {
      await supabase.from('set_logs').delete().eq('id', row.id)
    }
    setSetsByExercise((prev) => {
      const rows = (prev[exerciseName] ?? [])
        .filter((_, i) => i !== index)
        .map((r, i) => ({ ...r, set_number: i + 1 }))
      return { ...prev, [exerciseName]: rows }
    })
  }, [setsByExercise])

  const persistSet = useCallback(
    async (exerciseName, index, overrides = {}) => {
      if (!workoutLog) return null
      const row = { ...setsByExercise[exerciseName]?.[index], ...overrides }
      const payload = {
        workout_log_id: workoutLog.id,
        exercise_name: exerciseName,
        set_number: row.set_number,
        kg: row.kg === '' ? null : Number(row.kg),
        reps: row.reps === '' ? null : parseInt(row.reps, 10),
        completed: row.completed,
        rpe: row.rpe ?? null,
      }

      if (row.id) {
        await supabase.from('set_logs').update(payload).eq('id', row.id)
        return row.id
      }

      const { data, error } = await supabase.from('set_logs').insert(payload).select().single()
      if (error) throw error

      setSetsByExercise((prev) => {
        const rows = [...(prev[exerciseName] ?? [])]
        rows[index] = { ...rows[index], id: data.id }
        return { ...prev, [exerciseName]: rows }
      })
      return data.id
    },
    [workoutLog, setsByExercise],
  )

  const toggleSetComplete = useCallback(
    async (exerciseName, index) => {
      const row = setsByExercise[exerciseName]?.[index]
      if (!row) return false
      const completed = !row.completed
      updateSetField(exerciseName, index, 'completed', completed)
      await persistSet(exerciseName, index, { completed })
      return completed
    },
    [setsByExercise, updateSetField, persistSet],
  )

  const finishSession = useCallback(
    async (notes) => {
      if (!workoutLog) return null

      for (const exerciseName of Object.keys(setsByExercise)) {
        for (let i = 0; i < setsByExercise[exerciseName].length; i++) {
          const row = setsByExercise[exerciseName][i]
          if (row.kg !== '' || row.reps !== '' || row.completed) {
            await persistSet(exerciseName, i)
          }
        }
      }

      const finishedAt = new Date().toISOString()
      await supabase
        .from('workout_logs')
        .update({ finished_at: finishedAt, notes: notes || null })
        .eq('id', workoutLog.id)

      const allSets = Object.values(setsByExercise).flat()
      const completedSets = allSets.filter((s) => s.completed)
      const totalVolume = completedSets.reduce(
        (sum, s) => sum + (Number(s.kg) || 0) * (Number(s.reps) || 0),
        0,
      )
      const durationMin = workoutLog.started_at
        ? Math.round((new Date(finishedAt) - new Date(workoutLog.started_at)) / 60000)
        : null

      const summary = {
        totalSets: allSets.length,
        completedSets: completedSets.length,
        totalVolume,
        durationMin,
      }

      setWorkoutLog((prev) => ({ ...prev, finished_at: finishedAt, notes }))
      return summary
    },
    [workoutLog, setsByExercise, persistSet],
  )

  return {
    programmes,
    programmeId,
    setProgrammeId,
    sessions,
    sessionId,
    setSessionId,
    currentSession,
    exercises,
    previousSets,
    workoutLog,
    setsByExercise,
    loading,
    startSession,
    addSet,
    removeSet,
    updateSetField,
    toggleSetComplete,
    finishSession,
  }
}
