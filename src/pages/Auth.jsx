import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    const { data, error } =
      mode === 'login' ? await signIn(email, password) : await signUp(email, password)

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    if (mode === 'signup') {
      const alreadyRegistered = data?.user?.identities?.length === 0
      setInfo(
        alreadyRegistered
          ? 'This email is already registered. Log in instead.'
          : 'Account created. Check your email to confirm, then log in.',
      )
    }
  }

  return (
    <div className="min-h-screen bg-base flex flex-col justify-center px-6">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="font-display text-5xl tracking-wide text-white">
            FORGE
          </h1>
          <p className="mt-1 text-sm text-white/50">Training OS</p>
        </div>

        <div className="mb-6 flex rounded-xl bg-surface p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              mode === 'login' ? 'bg-accent text-black' : 'text-white/60'
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              mode === 'signup' ? 'bg-accent text-black' : 'text-white/60'
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-surface px-4 py-3 text-white outline-none focus:border-accent"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-surface px-4 py-3 text-white outline-none focus:border-accent"
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-3 font-semibold text-black transition disabled:opacity-50"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
