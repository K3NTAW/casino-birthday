import { Navigate, Route, Routes } from 'react-router-dom'
import { usePlayer } from './context/PlayerContext'
import { useSettings } from './lib/queries'
import { Layout } from './components/Layout'
import { Spinner } from './components/ui'
import Login from './pages/Login'
import Home from './pages/Home'
import Games from './pages/Games'
import WagerDetail from './pages/WagerDetail'
import SessionDetail from './pages/SessionDetail'
import Send from './pages/Send'
import Quests from './pages/Quests'
import Shop from './pages/Shop'
import Leaderboard from './pages/Leaderboard'
import Admin from './pages/Admin'
import Settings from './pages/Settings'
import type { ReactNode } from 'react'

export default function App() {
  const { session, player, loading } = usePlayer()

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!session || !player) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/games" element={<Games />} />
        <Route path="/games/wager/:id" element={<WagerDetail />} />
        <Route path="/games/session/:id" element={<SessionDetail />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/settings" element={<Settings />} />

        {/* Economy-only routes */}
        <Route path="/send" element={<EconomyOnly><Send /></EconomyOnly>} />
        <Route path="/quests" element={<EconomyOnly><Quests /></EconomyOnly>} />

        {/* Conditionally-enabled / role-gated */}
        <Route path="/leaderboard" element={<LeaderboardGate><Leaderboard /></LeaderboardGate>} />
        <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Layout>
  )
}

function EconomyOnly({ children }: { children: ReactNode }) {
  const { player } = usePlayer()
  return player?.mode === 'economy' ? <>{children}</> : <Navigate to="/home" replace />
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = usePlayer()
  return isAdmin ? <>{children}</> : <Navigate to="/home" replace />
}

function LeaderboardGate({ children }: { children: ReactNode }) {
  const { player } = usePlayer()
  const { data: settings } = useSettings()
  if (player?.mode !== 'economy') return <Navigate to="/home" replace />
  if (!settings?.leaderboard_visible) return <Navigate to="/home" replace />
  return <>{children}</>
}
