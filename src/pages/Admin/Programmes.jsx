import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Lock,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const EMPTY_PROGRAMME = { name: '', days_per_week: '', description: '' }
const EMPTY_SESSION = { session_name: '', warm_up: '', cardio_after: '' }
const EMPTY_EXERCISE = { exercise_name: '', target_sets: '', target_reps: '', form_cue: '', why: '' }

export default function Programmes() {
  const { user } = useAuth()
  const [programmes, setProgrammes] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [sessions, setSessions] = useState([])
  const [exercisesBySession, setExercisesBySession] = useState({})
  const [expandedSessions, setExpandedSessions] = useState(() => new Set())
  const [loading, setLoading] = useState(true)

  const [programmeModal, setProgrammeModal] = useState(null)
  const [sessionModal, setSessionModal] = useState(null)
  const [exerciseModal, setExerciseModal] = useState(null) // { sessionId, form }

  const loadProgrammes = async () => {
    const { data } = await supabase
      .from('programmes')
      .select('*')
      .order('created_at', { ascending: true })
    setProgrammes(data ?? [])
    setSelectedId((current) => current ?? data?.[0]?.id ?? null)
    setLoading(false)
  }

  const loadSessions = async (programmeId) => {
    if (!programmeId) {
      setSessions([])
      setExercisesBySession({})
      return
    }
    const { data: sessionRows } = await supabase
      .from('programme_sessions')
      .select('*')
      .eq('programme_id', programmeId)
      .order('session_order', { ascending: true })
    setSessions(sessionRows ?? [])

    const sessionIds = (sessionRows ?? []).map((s) => s.id)
    if (sessionIds.length === 0) {
      setExercisesBySession({})
      return
    }
    const { data: exerciseRows } = await supabase
      .from('session_exercises')
      .select('*')
      .in('session_id', sessionIds)
      .order('exercise_order', { ascending: true })

    const grouped = {}
    for (const ex of exerciseRows ?? []) {
      grouped[ex.session_id] = grouped[ex.session_id] ?? []
      grouped[ex.session_id].push(ex)
    }
    setExercisesBySession(grouped)
  }

  useEffect(() => {
    loadProgrammes()
  }, [])

  useEffect(() => {
    loadSessions(selectedId)
  }, [selectedId])

  const toggleExpanded = (sessionId) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev)
      next.has(sessionId) ? next.delete(sessionId) : next.add(sessionId)
      return next
    })
  }

  // Programme CRUD
  const saveProgramme = async (form) => {
    const payload = {
      name: form.name.trim(),
      days_per_week: form.days_per_week === '' ? null : Number(form.days_per_week),
      description: form.description.trim() || null,
    }
    if (form.id) {
      await supabase.from('programmes').update(payload).eq('id', form.id)
    } else {
      const { data } = await supabase
        .from('programmes')
        .insert({ ...payload, user_id: user.id, is_preloaded: false })
        .select()
        .single()
      setSelectedId(data.id)
    }
    setProgrammeModal(null)
    await loadProgrammes()
  }

  const deleteProgramme = async (id) => {
    await supabase.from('programmes').delete().eq('id', id)
    if (selectedId === id) setSelectedId(null)
    await loadProgrammes()
  }

  // Session CRUD
  const saveSession = async (form) => {
    const payload = {
      session_name: form.session_name.trim(),
      warm_up: form.warm_up.trim() || null,
      cardio_after: form.cardio_after.trim() || null,
    }
    if (form.id) {
      await supabase.from('programme_sessions').update(payload).eq('id', form.id)
    } else {
      const nextOrder = sessions.length
        ? Math.max(...sessions.map((s) => s.session_order ?? 0)) + 1
        : 1
      await supabase
        .from('programme_sessions')
        .insert({ ...payload, programme_id: selectedId, session_order: nextOrder })
    }
    setSessionModal(null)
    await loadSessions(selectedId)
  }

  const deleteSession = async (id) => {
    await supabase.from('programme_sessions').delete().eq('id', id)
    await loadSessions(selectedId)
  }

  const moveSession = async (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= sessions.length) return
    const a = sessions[index]
    const b = sessions[target]
    await Promise.all([
      supabase.from('programme_sessions').update({ session_order: b.session_order }).eq('id', a.id),
      supabase.from('programme_sessions').update({ session_order: a.session_order }).eq('id', b.id),
    ])
    await loadSessions(selectedId)
  }

  // Exercise CRUD
  const saveExercise = async (sessionId, form) => {
    const payload = {
      exercise_name: form.exercise_name.trim(),
      target_sets: form.target_sets.trim() || null,
      target_reps: form.target_reps.trim() || null,
      form_cue: form.form_cue.trim() || null,
      why: form.why.trim() || null,
    }
    if (form.id) {
      await supabase.from('session_exercises').update(payload).eq('id', form.id)
    } else {
      const existing = exercisesBySession[sessionId] ?? []
      const nextOrder = existing.length
        ? Math.max(...existing.map((e) => e.exercise_order ?? 0)) + 1
        : 1
      await supabase
        .from('session_exercises')
        .insert({ ...payload, session_id: sessionId, exercise_order: nextOrder })
    }
    setExerciseModal(null)
    await loadSessions(selectedId)
  }

  const deleteExercise = async (id) => {
    await supabase.from('session_exercises').delete().eq('id', id)
    await loadSessions(selectedId)
  }

  const moveExercise = async (sessionId, index, direction) => {
    const list = exercisesBySession[sessionId] ?? []
    const target = index + direction
    if (target < 0 || target >= list.length) return
    const a = list[index]
    const b = list[target]
    await Promise.all([
      supabase.from('session_exercises').update({ exercise_order: b.exercise_order }).eq('id', a.id),
      supabase.from('session_exercises').update({ exercise_order: a.exercise_order }).eq('id', b.id),
    ])
    await loadSessions(selectedId)
  }

  const selectedProgramme = programmes.find((p) => p.id === selectedId) ?? null

  return (
    <div className="p-4 pb-24">
      <div className="mb-4 flex items-center gap-2">
        <Link to="/admin" className="text-white/60">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-white">Workout Programmes</h1>
      </div>

      {loading && <p className="text-white/40">Loading…</p>}

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {programmes.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedId(p.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              selectedId === p.id ? 'bg-accent text-black' : 'bg-surface text-white/60'
            }`}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={() => setProgrammeModal({ ...EMPTY_PROGRAMME })}
          className="flex items-center gap-1 whitespace-nowrap rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/60"
        >
          <Plus size={14} />
          New
        </button>
      </div>

      {selectedProgramme && (
        <>
          <div className="mb-4 rounded-xl bg-surface p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-white">{selectedProgramme.name}</p>
                <p className="text-xs text-white/40">
                  {selectedProgramme.days_per_week
                    ? `${selectedProgramme.days_per_week} days/week`
                    : ''}
                  {selectedProgramme.description ? ` · ${selectedProgramme.description}` : ''}
                </p>
              </div>
              {selectedProgramme.is_preloaded ? (
                <Lock size={16} className="mt-1 shrink-0 text-white/20" />
              ) : (
                <div className="flex shrink-0 gap-3">
                  <button onClick={() => setProgrammeModal(selectedProgramme)} className="text-white/50">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => deleteProgramme(selectedProgramme.id)} className="text-red-400/70">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {!selectedProgramme.is_preloaded && (
            <button
              onClick={() => setSessionModal({ ...EMPTY_SESSION })}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 py-2.5 text-sm font-medium text-white/70"
            >
              <Plus size={16} />
              Add session
            </button>
          )}

          <div className="space-y-3">
            {sessions.map((session, sIndex) => {
              const isOpen = expandedSessions.has(session.id)
              const exercises = exercisesBySession[session.id] ?? []

              return (
                <div key={session.id} className="rounded-2xl bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleExpanded(session.id)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      {isOpen ? (
                        <ChevronUp size={16} className="text-white/40" />
                      ) : (
                        <ChevronDown size={16} className="text-white/40" />
                      )}
                      <div>
                        <p className="font-semibold text-white">{session.session_name}</p>
                        <p className="text-xs text-white/40">{exercises.length} exercises</p>
                      </div>
                    </button>

                    {!selectedProgramme.is_preloaded && (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => moveSession(sIndex, -1)}
                          disabled={sIndex === 0}
                          className="text-white/30 disabled:opacity-20"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => moveSession(sIndex, 1)}
                          disabled={sIndex === sessions.length - 1}
                          className="text-white/30 disabled:opacity-20"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button onClick={() => setSessionModal(session)} className="text-white/50">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => deleteSession(session.id)} className="text-red-400/70">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {isOpen && (
                    <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                      {session.warm_up && (
                        <p className="text-xs text-white/40">
                          <span className="font-semibold text-white/60">Warm-up: </span>
                          {session.warm_up}
                        </p>
                      )}
                      {session.cardio_after && (
                        <p className="text-xs text-white/40">
                          <span className="font-semibold text-white/60">Cardio after: </span>
                          {session.cardio_after}
                        </p>
                      )}

                      {exercises.length > 0 && (
                        <div className="divide-y divide-white/5">
                          {exercises.map((ex, eIndex) => (
                            <div
                              key={ex.id}
                              className="flex items-start justify-between gap-2 py-2.5"
                            >
                              <div>
                                <p className="text-sm font-medium text-white">{ex.exercise_name}</p>
                                <p className="text-xs text-white/40">
                                  {ex.target_sets ?? '—'} sets × {ex.target_reps ?? '—'} reps
                                </p>
                                {ex.form_cue && (
                                  <p className="mt-1 text-xs text-white/30">{ex.form_cue}</p>
                                )}
                              </div>
                              {!selectedProgramme.is_preloaded && (
                                <div className="flex shrink-0 items-center gap-2">
                                  <button
                                    onClick={() => moveExercise(session.id, eIndex, -1)}
                                    disabled={eIndex === 0}
                                    className="text-white/30 disabled:opacity-20"
                                  >
                                    <ArrowUp size={13} />
                                  </button>
                                  <button
                                    onClick={() => moveExercise(session.id, eIndex, 1)}
                                    disabled={eIndex === exercises.length - 1}
                                    className="text-white/30 disabled:opacity-20"
                                  >
                                    <ArrowDown size={13} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setExerciseModal({ sessionId: session.id, form: ex })
                                    }
                                    className="text-white/50"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => deleteExercise(ex.id)}
                                    className="text-red-400/70"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {!selectedProgramme.is_preloaded && (
                        <button
                          onClick={() =>
                            setExerciseModal({ sessionId: session.id, form: { ...EMPTY_EXERCISE } })
                          }
                          className="flex items-center gap-1 text-xs font-medium text-accent"
                        >
                          <Plus size={14} />
                          Add exercise
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {programmeModal && (
        <ProgrammeFormModal
          initial={programmeModal}
          onClose={() => setProgrammeModal(null)}
          onSave={saveProgramme}
        />
      )}

      {sessionModal && (
        <SessionFormModal
          initial={sessionModal}
          onClose={() => setSessionModal(null)}
          onSave={saveSession}
        />
      )}

      {exerciseModal && (
        <ExerciseFormModal
          initial={exerciseModal.form}
          onClose={() => setExerciseModal(null)}
          onSave={(form) => saveExercise(exerciseModal.sessionId, form)}
        />
      )}
    </div>
  )
}

function ModalShell({ title, onClose, onSubmit, children }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60">
      <form
        onSubmit={onSubmit}
        className="max-h-[85vh] w-full space-y-3 overflow-y-auto rounded-t-2xl bg-surface p-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{title}</p>
          <button type="button" onClick={onClose} className="text-white/60">
            <X size={22} />
          </button>
        </div>
        {children}
      </form>
    </div>
  )
}

function TextField({ label, value, onChange, required, type = 'text' }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
        {label}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-surface2 px-3 py-2.5 text-white outline-none focus:border-accent"
      />
    </div>
  )
}

function ProgrammeFormModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({ ...EMPTY_PROGRAMME, ...initial })
  return (
    <ModalShell
      title={form.id ? 'Edit programme' : 'New programme'}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault()
        onSave(form)
      }}
    >
      <TextField label="Name" required value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
      <TextField
        label="Days per week"
        type="number"
        value={form.days_per_week}
        onChange={(v) => setForm((f) => ({ ...f, days_per_week: v }))}
      />
      <TextField
        label="Description"
        value={form.description}
        onChange={(v) => setForm((f) => ({ ...f, description: v }))}
      />
      <button type="submit" className="w-full rounded-lg bg-accent py-3 font-semibold text-black">
        Save
      </button>
    </ModalShell>
  )
}

function SessionFormModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({ ...EMPTY_SESSION, ...initial })
  return (
    <ModalShell
      title={form.id ? 'Edit session' : 'New session'}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault()
        onSave(form)
      }}
    >
      <TextField
        label="Session name"
        required
        value={form.session_name}
        onChange={(v) => setForm((f) => ({ ...f, session_name: v }))}
      />
      <TextField
        label="Warm-up"
        value={form.warm_up}
        onChange={(v) => setForm((f) => ({ ...f, warm_up: v }))}
      />
      <TextField
        label="Cardio after"
        value={form.cardio_after}
        onChange={(v) => setForm((f) => ({ ...f, cardio_after: v }))}
      />
      <button type="submit" className="w-full rounded-lg bg-accent py-3 font-semibold text-black">
        Save
      </button>
    </ModalShell>
  )
}

function ExerciseFormModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({ ...EMPTY_EXERCISE, ...initial })
  return (
    <ModalShell
      title={form.id ? 'Edit exercise' : 'New exercise'}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault()
        onSave(form)
      }}
    >
      <TextField
        label="Exercise name"
        required
        value={form.exercise_name}
        onChange={(v) => setForm((f) => ({ ...f, exercise_name: v }))}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Target sets"
          value={form.target_sets}
          onChange={(v) => setForm((f) => ({ ...f, target_sets: v }))}
        />
        <TextField
          label="Target reps"
          value={form.target_reps}
          onChange={(v) => setForm((f) => ({ ...f, target_reps: v }))}
        />
      </div>
      <TextField
        label="Form cue"
        value={form.form_cue}
        onChange={(v) => setForm((f) => ({ ...f, form_cue: v }))}
      />
      <TextField label="Why" value={form.why} onChange={(v) => setForm((f) => ({ ...f, why: v }))} />
      <button type="submit" className="w-full rounded-lg bg-accent py-3 font-semibold text-black">
        Save
      </button>
    </ModalShell>
  )
}
