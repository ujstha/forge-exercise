// Central home for env vars and app-wide constants — import from here
// instead of reading import.meta.env or re-declaring these inline.

export const ENV = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  push: {
    vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
  },
}

export const STORAGE_KEYS = {
  activeProgrammeId: 'forge_active_programme_id',
  restDurationSec: 'forge_rest_duration_sec',
}

export const DAY_TYPES = [
  { value: 'gym', label: 'Gym' },
  { value: 'football', label: 'Football' },
  { value: 'gymfootball', label: 'Gym + Football' },
  { value: 'rest', label: 'Rest' },
]

export const TARGET_KCAL_FIELD = {
  gym: 'target_kcal_gym',
  football: 'target_kcal_football',
  gymfootball: 'target_kcal_gymfootball',
  rest: 'target_kcal_rest',
}

export const MEAL_SLOTS = ['Breakfast', 'Snack', 'Lunch', 'Post-workout', 'Dinner', 'Evening snack']

export const REST_DURATION_OPTIONS = [60, 90, 120, 180]

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export const WEEKDAY_LABELS = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
}

export const REMINDER_CONDITIONS = [
  { value: '', label: 'Always' },
  { value: 'gym', label: 'Gym days' },
  { value: 'football', label: 'Football days' },
  { value: 'gymfootball', label: 'Gym + football days' },
  { value: 'rest', label: 'Rest days' },
]
