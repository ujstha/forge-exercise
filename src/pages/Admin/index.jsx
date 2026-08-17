import { Link } from 'react-router-dom'
import { Utensils, Dumbbell, Pill, BellRing, Target, LogOut, ChevronRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import ListSection from '../../components/ListSection'

const SECTIONS = [
  { to: '/admin/food-library', label: 'Food Library', icon: Utensils },
  { to: '/admin/programmes', label: 'Workout Programmes', icon: Dumbbell },
  { to: '/admin/supplements', label: 'Supplements', icon: Pill },
  { to: '/admin/reminders', label: 'Reminders', icon: BellRing },
  { to: '/admin/targets', label: 'Personal Targets', icon: Target },
]

export default function AdminHome() {
  const { signOut } = useAuth()

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-white">Admin</h1>
      <ListSection className="mt-4">
        {SECTIONS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 px-4 py-4 text-white transition hover:bg-white/[0.03]"
          >
            <Icon size={20} className="text-accent" />
            <span className="flex-1 font-medium">{label}</span>
            <ChevronRight size={16} className="text-white/20" />
          </Link>
        ))}
      </ListSection>

      <button
        onClick={signOut}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-medium text-white/60"
      >
        <LogOut size={16} />
        Log out
      </button>
    </div>
  )
}
