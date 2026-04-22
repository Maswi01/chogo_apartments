import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface DashboardLayoutProps {
  title: string
  children: React.ReactNode
}

export default function DashboardLayout({ title, children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const baseLinkClass =
    'block w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors'

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <aside className="w-72 bg-cyan-800 text-white px-5 py-6">
          <h1 className="text-2xl font-black tracking-wide mb-8">CHOGO</h1>

          <nav className="space-y-5">
            <div>
              <NavLink
                to="/dashboard"
                end
                className={({ isActive }) =>
                  `${baseLinkClass} ${isActive ? 'bg-blue-900 text-yellow-300' : 'bg-blue-900/70 hover:bg-blue-900'}`
                }
              >
                Home
              </NavLink>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-cyan-100">Registration</p>
              <div className="space-y-2 pl-2">
                <NavLink
                  to="/register"
                  className={({ isActive }) =>
                    `${baseLinkClass} ${isActive ? 'bg-blue-900 text-yellow-300' : 'bg-blue-900/70 hover:bg-blue-900'}`
                  }
                >
                  Register Staff
                </NavLink>
                <NavLink
                  to="/branches/new"
                  className={({ isActive }) =>
                    `${baseLinkClass} ${isActive ? 'bg-blue-900 text-yellow-300' : 'bg-blue-900/70 hover:bg-blue-900'}`
                  }
                >
                  Add Branch
                </NavLink>
              </div>
            </div>
          </nav>
        </aside>

        <main className="flex-1 px-8 py-8">
          <header className="mb-6 rounded-xl bg-white px-6 py-4 shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Main Branch Dashboard</p>
              <h2 className="text-2xl font-black text-slate-900">{title}</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-slate-500">Signed in as</p>
                <p className="text-sm font-semibold text-slate-900">{user?.full_name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition"
              >
                Logout
              </button>
            </div>
          </header>

          <section className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">{children}</section>

          <footer className="pt-4 text-center text-xs text-slate-500">
            Need account settings? Go to{' '}
            <Link className="font-semibold text-blue-700 hover:text-blue-800" to="/dashboard">
              dashboard home
            </Link>
            .
          </footer>
        </main>
      </div>
    </div>
  )
}
