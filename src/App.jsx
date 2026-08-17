import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Nav from './components/Nav'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Nutrition from './pages/Nutrition'
import Workout from './pages/Workout'
import Progress from './pages/Progress'
import AdminHome from './pages/Admin/index'
import FoodLibrary from './pages/Admin/FoodLibrary'
import Programmes from './pages/Admin/Programmes'
import Supplements from './pages/Admin/Supplements'
import Reminders from './pages/Admin/Reminders'
import Targets from './pages/Admin/Targets'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function AppShell() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <p className="text-white/40">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  return (
    <div className="min-h-screen bg-base">
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/workout" element={<Workout />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/admin" element={<AdminHome />} />
        <Route path="/admin/food-library" element={<FoodLibrary />} />
        <Route path="/admin/programmes" element={<Programmes />} />
        <Route path="/admin/supplements" element={<Supplements />} />
        <Route path="/admin/reminders" element={<Reminders />} />
        <Route path="/admin/targets" element={<Targets />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Nav />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
