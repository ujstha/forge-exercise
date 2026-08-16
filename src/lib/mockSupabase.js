import { ENV } from './constants'

const MOCK_DB_KEY = 'forge_mock_db_v1'
const MOCK_SESSION_KEY = 'forge_mock_session_v1'

function nowIso() {
  return new Date().toISOString()
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

function randomId(prefix = 'id') {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return `${prefix}_${globalThis.crypto.randomUUID()}`
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function seedDatabase() {
  const createdAt = nowIso()
  return {
    profiles: [],
    day_type_logs: [],
    foods: [
      {
        id: 'food_chicken_breast',
        user_id: null,
        is_preloaded: true,
        name: 'Chicken Breast',
        brand: null,
        protein_per_100g: 31,
        carbs_per_100g: 0,
        fat_per_100g: 3.6,
        kcal_per_100g: 165,
        serving_size_g: 120,
        serving_name: '1 fillet',
        created_at: createdAt,
      },
      {
        id: 'food_rice_cooked',
        user_id: null,
        is_preloaded: true,
        name: 'Rice (Cooked)',
        brand: null,
        protein_per_100g: 2.7,
        carbs_per_100g: 28,
        fat_per_100g: 0.3,
        kcal_per_100g: 130,
        serving_size_g: 150,
        serving_name: '1 cup',
        created_at: createdAt,
      },
      {
        id: 'food_egg_whole',
        user_id: null,
        is_preloaded: true,
        name: 'Egg (Whole)',
        brand: null,
        protein_per_100g: 13,
        carbs_per_100g: 1.1,
        fat_per_100g: 11,
        kcal_per_100g: 155,
        serving_size_g: 50,
        serving_name: '1 egg',
        created_at: createdAt,
      },
    ],
    food_logs: [],
    supplements: [],
    supplement_logs: [],
    programmes: [
      {
        id: 'prog_foundation',
        name: 'Foundation Strength',
        days_per_week: 3,
        description: 'Simple full-body progression.',
        is_preloaded: true,
        created_at: createdAt,
      },
    ],
    programme_sessions: [
      {
        id: 'session_a',
        programme_id: 'prog_foundation',
        session_name: 'Session A',
        session_order: 1,
        warm_up: '5-10 min light cardio + mobility',
        cardio_after: null,
        created_at: createdAt,
      },
      {
        id: 'session_b',
        programme_id: 'prog_foundation',
        session_name: 'Session B',
        session_order: 2,
        warm_up: '5-10 min light cardio + mobility',
        cardio_after: null,
        created_at: createdAt,
      },
    ],
    session_exercises: [
      {
        id: 'ex_a1',
        session_id: 'session_a',
        exercise_name: 'Back Squat',
        target_sets: '3',
        target_reps: '5',
        form_cue: 'Brace hard, drive through mid-foot.',
        why: null,
        exercise_order: 1,
        created_at: createdAt,
      },
      {
        id: 'ex_a2',
        session_id: 'session_a',
        exercise_name: 'Bench Press',
        target_sets: '3',
        target_reps: '5',
        form_cue: 'Shoulders back, controlled touch point.',
        why: null,
        exercise_order: 2,
        created_at: createdAt,
      },
      {
        id: 'ex_b1',
        session_id: 'session_b',
        exercise_name: 'Deadlift',
        target_sets: '3',
        target_reps: '5',
        form_cue: 'Hinge with neutral spine.',
        why: null,
        exercise_order: 1,
        created_at: createdAt,
      },
      {
        id: 'ex_b2',
        session_id: 'session_b',
        exercise_name: 'Overhead Press',
        target_sets: '3',
        target_reps: '5',
        form_cue: 'Stack wrist-elbow-bar over mid-foot.',
        why: null,
        exercise_order: 2,
        created_at: createdAt,
      },
    ],
    workout_logs: [],
    set_logs: [],
    reminders: [],
    body_logs: [],
  }
}

function loadDatabase() {
  try {
    const raw = localStorage.getItem(MOCK_DB_KEY)
    if (!raw) return seedDatabase()
    const parsed = JSON.parse(raw)
    return { ...seedDatabase(), ...parsed }
  } catch {
    return seedDatabase()
  }
}

function saveDatabase(db) {
  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db))
}

function normalizeName(email) {
  if (!email || !email.includes('@')) return 'Athlete'
  const part = email.split('@')[0]
  return part
    .split(/[._-]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ') || 'Athlete'
}

function defaultProfile(user) {
  return {
    id: user.id,
    name: normalizeName(user.email),
    start_date: null,
    weight_kg: 75,
    height_cm: 175,
    body_fat_pct: null,
    lean_mass_kg: null,
    bmr: null,
    target_kcal_gym: 2400,
    target_kcal_football: 2600,
    target_kcal_gymfootball: 2800,
    target_kcal_rest: 2100,
    target_protein_g: 160,
    target_carbs_g: 260,
    target_fat_g: 70,
    push_subscription: null,
    created_at: nowIso(),
  }
}

function ensureUserData(db, user) {
  if (!db.profiles.some((profile) => profile.id === user.id)) {
    db.profiles.push(defaultProfile(user))
  }

  const hasSupplements = db.supplements.some((item) => item.user_id === user.id)
  if (!hasSupplements) {
    db.supplements.push(
      {
        id: randomId('supp'),
        user_id: user.id,
        name: 'Creatine',
        dose: '5g',
        notes: null,
        status: 'continue',
        display_order: 1,
        created_at: nowIso(),
      },
      {
        id: randomId('supp'),
        user_id: user.id,
        name: 'Vitamin D3',
        dose: '2000 IU',
        notes: null,
        status: 'continue',
        display_order: 2,
        created_at: nowIso(),
      },
    )
  }

  saveDatabase(db)
}

function getFieldValue(db, row, field) {
  if (!field.includes('.')) return row[field]

  const [head, ...rest] = field.split('.')
  if (head === 'workout_logs') {
    const workout = db.workout_logs.find((log) => log.id === row.workout_log_id)
    if (!workout) return undefined
    return rest.reduce((acc, key) => (acc ? acc[key] : undefined), workout)
  }

  return rest.reduce((acc, key) => (acc ? acc[key] : undefined), row[head])
}

function applyInnerWorkoutJoin(db, rows, selectClause) {
  if (!selectClause || !selectClause.includes('workout_logs!inner')) return rows
  return rows
    .map((row) => {
      const workout = db.workout_logs.find((item) => item.id === row.workout_log_id)
      if (!workout) return null
      return { ...row, workout_logs: workout }
    })
    .filter(Boolean)
}

function parseOrExpression(expression) {
  const conditions = expression.split(',').map((part) => part.trim()).filter(Boolean)
  return conditions
    .map((condition) => {
      const segments = condition.split('.')
      if (segments.length < 3) return null
      const [field, op, ...valueParts] = segments
      const value = valueParts.join('.')
      return { field, op, value }
    })
    .filter(Boolean)
}

function ilikeMatch(value, pattern) {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*')
  const regex = new RegExp(`^${escaped}$`, 'i')
  return regex.test(String(value ?? ''))
}

class MockQuery {
  constructor(client, table) {
    this.client = client
    this.table = table
    this.operation = 'select'
    this.selectClause = '*'
    this.selectOptions = {}
    this.filters = []
    this.orGroups = []
    this.ordering = null
    this.limitCount = null
    this.payload = null
    this.onConflict = null
    this.expectSingle = false
    this.expectMaybeSingle = false
    this.returning = false
  }

  select(columns = '*', options = {}) {
    this.selectClause = columns
    this.selectOptions = options
    this.returning = true
    return this
  }

  insert(payload) {
    this.operation = 'insert'
    this.payload = Array.isArray(payload) ? payload : [payload]
    return this
  }

  update(payload) {
    this.operation = 'update'
    this.payload = payload
    return this
  }

  upsert(payload, options = {}) {
    this.operation = 'upsert'
    this.payload = Array.isArray(payload) ? payload : [payload]
    this.onConflict = options.onConflict ?? null
    return this
  }

  delete() {
    this.operation = 'delete'
    return this
  }

  eq(field, value) {
    this.filters.push((row) => getFieldValue(this.client.db, row, field) === value)
    return this
  }

  neq(field, value) {
    this.filters.push((row) => getFieldValue(this.client.db, row, field) !== value)
    return this
  }

  in(field, values) {
    this.filters.push((row) => values.includes(getFieldValue(this.client.db, row, field)))
    return this
  }

  ilike(field, pattern) {
    this.filters.push((row) => ilikeMatch(getFieldValue(this.client.db, row, field), pattern))
    return this
  }

  or(expression) {
    const group = parseOrExpression(expression)
    if (group.length > 0) {
      this.orGroups.push(group)
    }
    return this
  }

  order(field, { ascending = true } = {}) {
    this.ordering = { field, ascending }
    return this
  }

  limit(count) {
    this.limitCount = count
    return this
  }

  single() {
    this.expectSingle = true
    return this
  }

  maybeSingle() {
    this.expectMaybeSingle = true
    return this
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject)
  }

  catch(reject) {
    return this.execute().catch(reject)
  }

  finally(onFinally) {
    return this.execute().finally(onFinally)
  }

  _getTable() {
    if (!this.client.db[this.table]) {
      this.client.db[this.table] = []
    }
    return this.client.db[this.table]
  }

  _applyFilters(rows) {
    let filtered = rows

    for (const predicate of this.filters) {
      filtered = filtered.filter((row) => predicate(row))
    }

    for (const group of this.orGroups) {
      filtered = filtered.filter((row) =>
        group.some(({ field, op, value }) => {
          const current = getFieldValue(this.client.db, row, field)
          if (op === 'eq') return String(current) === value
          if (op === 'is' && value === 'null') return current == null
          return false
        }),
      )
    }

    return filtered
  }

  _applySortAndLimit(rows) {
    const ordered = [...rows]

    if (this.ordering) {
      const { field, ascending } = this.ordering
      ordered.sort((a, b) => {
        const left = getFieldValue(this.client.db, a, field)
        const right = getFieldValue(this.client.db, b, field)
        if (left == null && right == null) return 0
        if (left == null) return 1
        if (right == null) return -1
        if (left < right) return ascending ? -1 : 1
        if (left > right) return ascending ? 1 : -1
        return 0
      })
    }

    if (typeof this.limitCount === 'number') {
      return ordered.slice(0, this.limitCount)
    }

    return ordered
  }

  _resultFromRows(rows) {
    if (this.selectOptions.count === 'exact' && this.selectOptions.head) {
      return { data: null, error: null, count: rows.length }
    }

    if (this.expectSingle) {
      if (rows.length !== 1) {
        return {
          data: null,
          error: { message: `Expected single row, found ${rows.length}.` },
          count: null,
        }
      }
      return { data: clone(rows[0]), error: null, count: null }
    }

    if (this.expectMaybeSingle) {
      if (rows.length === 0) return { data: null, error: null, count: null }
      if (rows.length === 1) return { data: clone(rows[0]), error: null, count: null }
      return {
        data: null,
        error: { message: `Expected zero or one row, found ${rows.length}.` },
        count: null,
      }
    }

    return {
      data: clone(rows),
      error: null,
      count: this.selectOptions.count === 'exact' ? rows.length : null,
    }
  }

  async execute() {
    const table = this._getTable()

    if (this.operation === 'select') {
      let rows = applyInnerWorkoutJoin(this.client.db, table, this.selectClause)
      rows = this._applyFilters(rows)
      rows = this._applySortAndLimit(rows)
      return this._resultFromRows(rows)
    }

    if (this.operation === 'insert') {
      const inserted = this.payload.map((item) => ({
        id: item.id ?? randomId(this.table),
        created_at: item.created_at ?? nowIso(),
        ...item,
      }))
      table.push(...inserted)
      saveDatabase(this.client.db)

      if (this.returning || this.expectSingle || this.expectMaybeSingle) {
        return this._resultFromRows(inserted)
      }
      return { data: null, error: null, count: null }
    }

    if (this.operation === 'upsert') {
      const rows = []
      const conflictFields = (this.onConflict ?? '')
        .split(',')
        .map((field) => field.trim())
        .filter(Boolean)

      for (const item of this.payload) {
        let matchIndex = -1

        if (conflictFields.length > 0) {
          matchIndex = table.findIndex((row) =>
            conflictFields.every((field) => String(row[field]) === String(item[field])),
          )
        }

        if (matchIndex >= 0) {
          table[matchIndex] = { ...table[matchIndex], ...item }
          rows.push(table[matchIndex])
        } else {
          const inserted = {
            id: item.id ?? randomId(this.table),
            created_at: item.created_at ?? nowIso(),
            ...item,
          }
          table.push(inserted)
          rows.push(inserted)
        }
      }

      saveDatabase(this.client.db)

      if (this.returning || this.expectSingle || this.expectMaybeSingle) {
        return this._resultFromRows(rows)
      }
      return { data: null, error: null, count: null }
    }

    if (this.operation === 'update') {
      const targets = this._applyFilters(table)
      const updated = targets.map((row) => {
        Object.assign(row, this.payload)
        return row
      })
      saveDatabase(this.client.db)

      if (this.returning || this.expectSingle || this.expectMaybeSingle) {
        return this._resultFromRows(updated)
      }
      return { data: null, error: null, count: null }
    }

    if (this.operation === 'delete') {
      const targets = new Set(this._applyFilters(table).map((row) => row.id))
      const deleted = table.filter((row) => targets.has(row.id))
      this.client.db[this.table] = table.filter((row) => !targets.has(row.id))
      saveDatabase(this.client.db)

      if (this.returning || this.expectSingle || this.expectMaybeSingle) {
        return this._resultFromRows(deleted)
      }
      return { data: null, error: null, count: null }
    }

    return { data: null, error: { message: `Unsupported operation: ${this.operation}` }, count: null }
  }
}

function buildMockAuth(client) {
  const listeners = new Set()

  function readSession() {
    try {
      const raw = localStorage.getItem(MOCK_SESSION_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  function writeSession(session) {
    if (!session) {
      localStorage.removeItem(MOCK_SESSION_KEY)
      return
    }
    localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session))
  }

  let session = readSession()

  function emit(event) {
    for (const callback of listeners) {
      callback(event, clone(session))
    }
  }

  function setSession(nextSession, event) {
    session = nextSession
    writeSession(session)
    if (session?.user) {
      ensureUserData(client.db, session.user)
    }
    emit(event)
  }

  return {
    async getSession() {
      return { data: { session: clone(session) }, error: null }
    },

    onAuthStateChange(callback) {
      listeners.add(callback)
      return {
        data: {
          subscription: {
            unsubscribe: () => listeners.delete(callback),
          },
        },
      }
    },

    async signUp({ email }) {
      const nextSession = {
        access_token: 'mock_access_token',
        token_type: 'bearer',
        user: {
          id: `mock_user_${String(email || 'demo').toLowerCase()}`,
          email: email || 'demo@local.dev',
        },
      }
      setSession(nextSession, 'SIGNED_IN')
      return { data: { user: clone(nextSession.user), session: clone(nextSession) }, error: null }
    },

    async signInWithPassword({ email }) {
      const nextSession = {
        access_token: 'mock_access_token',
        token_type: 'bearer',
        user: {
          id: `mock_user_${String(email || 'demo').toLowerCase()}`,
          email: email || 'demo@local.dev',
        },
      }
      setSession(nextSession, 'SIGNED_IN')
      return { data: { user: clone(nextSession.user), session: clone(nextSession) }, error: null }
    },

    async signOut() {
      setSession(null, 'SIGNED_OUT')
      return { error: null }
    },
  }
}

export function createMockSupabase() {
  const existing = globalThis.__forgeMockSupabase
  if (existing) return existing

  const db = loadDatabase()
  const client = {
    db,
    from(table) {
      return new MockQuery(client, table)
    },
    auth: null,
  }
  client.auth = buildMockAuth(client)

  globalThis.__forgeMockSupabase = client
  return client
}

export function shouldUseMockSupabase() {
  return !ENV.supabase.url || !ENV.supabase.anonKey
}
