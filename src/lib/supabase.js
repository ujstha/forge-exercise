import { createClient } from '@supabase/supabase-js'
import { ENV } from './constants'
import { createMockSupabase, shouldUseMockSupabase } from './mockSupabase'

const useMockSupabase = shouldUseMockSupabase()

if (useMockSupabase) {
  console.warn('FORGE is running in local mock mode because Supabase env vars are missing.')
}

export const supabase = useMockSupabase
  ? createMockSupabase()
  : createClient(ENV.supabase.url, ENV.supabase.anonKey)

export const isMockSupabase = useMockSupabase
