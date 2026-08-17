const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function MacroRing({ consumed, target, label = 'kcal' }) {
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0
  const remaining = Math.max(target - consumed, 0)
  const over = consumed > target

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-white/10"
        />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - pct)}
          className={over ? 'text-red-400' : 'text-accent'}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-4xl text-white">{Math.round(remaining)}</span>
        <span className="text-xs uppercase tracking-wide text-white/40">
          {label} left
        </span>
      </div>
    </div>
  )
}
