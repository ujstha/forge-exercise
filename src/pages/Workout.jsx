import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Play } from 'lucide-react'
import { useWorkout } from '../hooks/useWorkout'
import SetRow from '../components/SetRow'
import RestTimer from '../components/RestTimer'
import { STORAGE_KEYS, REST_DURATION_OPTIONS } from '../lib/constants'

export default function Workout() {
  const {
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
  } = useWorkout()

  const [expanded, setExpanded] = useState(() => new Set())
  const [restDuration, setRestDuration] = useState(
    () => Number(localStorage.getItem(STORAGE_KEYS.restDurationSec)) || 90,
  )
  const [restActive, setRestActive] = useState(false)
  const [restToken, setRestToken] = useState(0)
  const [summary, setSummary] = useState(null)

  const toggleExpanded = (name) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const changeRestDuration = (value) => {
    setRestDuration(value)
    localStorage.setItem(STORAGE_KEYS.restDurationSec, String(value))
  }

  const handleToggleComplete = async (exerciseName, index) => {
    const nowComplete = await toggleSetComplete(exerciseName, index)
    if (nowComplete) {
      setRestToken((t) => t + 1)
      setRestActive(true)
    }
  }

  const handleFinish = async () => {
    const result = await finishSession()
    setSummary(result)
    setRestActive(false)
  }

  if (loading) {
    return (
      <div className="p-4 pb-24">
        <p className="text-white/40">Loading…</p>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-white">Workout</h1>

      <select
        value={programmeId ?? ''}
        onChange={(e) => setProgrammeId(e.target.value)}
        className="mt-4 w-full rounded-lg border border-white/10 bg-surface px-4 py-3 text-white outline-none focus:border-accent"
      >
        {programmes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <div className="mt-3 flex gap-2 overflow-x-auto">
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => setSessionId(s.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              sessionId === s.id ? 'bg-accent text-black' : 'bg-surface text-white/60'
            }`}
          >
            {s.session_name}
          </button>
        ))}
      </div>

      {currentSession?.warm_up && (
        <p className="mt-3 text-xs text-white/40">
          <span className="font-semibold text-white/60">Warm-up: </span>
          {currentSession.warm_up}
        </p>
      )}

      {!workoutLog && exercises.length > 0 && (
        <button
          onClick={startSession}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-semibold text-black"
        >
          <Play size={18} />
          Start session
        </button>
      )}

      {workoutLog && (
        <div className="mt-4 space-y-3">
          {exercises.map((ex) => {
            const sets = setsByExercise[ex.exercise_name] ?? []
            const prevSets = previousSets[ex.exercise_name] ?? []
            const isOpen = expanded.has(ex.exercise_name)

            return (
              <div key={ex.id} className="rounded-2xl bg-surface p-4">
                <button
                  onClick={() => toggleExpanded(ex.exercise_name)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div>
                    <p className="font-semibold text-white">{ex.exercise_name}</p>
                    <p className="text-xs text-white/40">
                      {ex.target_sets ?? '—'} sets × {ex.target_reps ?? '—'} reps
                    </p>
                  </div>
                  {isOpen ? (
                    <ChevronUp size={18} className="text-white/40" />
                  ) : (
                    <ChevronDown size={18} className="text-white/40" />
                  )}
                </button>

                {isOpen && (
                  <div className="mt-3 space-y-3">
                    {ex.form_cue && (
                      <p className="rounded-lg bg-surface2 p-3 text-xs text-white/60">
                        {ex.form_cue}
                      </p>
                    )}

                    <div className="space-y-2">
                      {sets.map((set, i) => (
                        <SetRow
                          key={i}
                          index={i}
                          set={set}
                          placeholder={prevSets[i]}
                          onChangeKg={(v) => updateSetField(ex.exercise_name, i, 'kg', v)}
                          onChangeReps={(v) => updateSetField(ex.exercise_name, i, 'reps', v)}
                          onToggleComplete={() => handleToggleComplete(ex.exercise_name, i)}
                          onRemove={() => removeSet(ex.exercise_name, i)}
                          canRemove={sets.length > 1}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => addSet(ex.exercise_name)}
                      className="flex items-center gap-1 text-xs font-medium text-accent"
                    >
                      <Plus size={14} />
                      Add set
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex items-center justify-between rounded-2xl bg-surface p-4">
            <p className="text-xs uppercase tracking-wide text-white/40">Rest duration</p>
            <div className="flex gap-1">
              {REST_DURATION_OPTIONS.map((sec) => (
                <button
                  key={sec}
                  onClick={() => changeRestDuration(sec)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    restDuration === sec ? 'bg-accent text-black' : 'bg-surface2 text-white/60'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {!workoutLog.finished_at && (
            <button
              onClick={handleFinish}
              className="w-full rounded-xl border border-accent py-3 font-semibold text-accent"
            >
              Finish session
            </button>
          )}
        </div>
      )}

      {restActive && (
        <RestTimer key={restToken} duration={restDuration} onDone={() => setRestActive(false)} />
      )}

      {summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 text-center">
            <p className="text-sm uppercase tracking-wide text-accent">Session complete</p>
            <h2 className="mt-1 text-xl font-bold text-white">{currentSession?.session_name}</h2>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <SummaryStat label="Sets" value={`${summary.completedSets}/${summary.totalSets}`} />
              <SummaryStat label="Volume" value={`${Math.round(summary.totalVolume)}kg`} />
              <SummaryStat
                label="Duration"
                value={summary.durationMin != null ? `${summary.durationMin}m` : '—'}
              />
            </div>

            <button
              onClick={() => setSummary(null)}
              className="mt-6 w-full rounded-lg bg-accent py-3 font-semibold text-black"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryStat({ label, value }) {
  return (
    <div className="rounded-xl bg-surface2 p-3">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] uppercase text-white/40">{label}</p>
    </div>
  )
}
