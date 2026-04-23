import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBranches } from '../context/BranchContext'

interface DashboardLayoutProps {
  title: string
  children: React.ReactNode
}

export default function DashboardLayout({ title, children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const { branches, activeBranch, isAdminBranch, setActiveBranchById } = useBranches()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const baseLinkClass =
    'block w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors'
  const activeClass = 'bg-blue-900 text-yellow-300'
  const inactiveClass = 'bg-blue-900/60 hover:bg-blue-900/90 text-white'

  const adminNav = (
    <>
      <NavLink to="/dashboard" end className={({ isActive }) => `${baseLinkClass} ${isActive ? activeClass : inactiveClass}`}>
        Home
      </NavLink>
      <div>
        <p className="mt-4 mb-2 text-xs font-bold uppercase tracking-wider text-cyan-100">Branches</p>
        <div className="space-y-2 pl-1">
          <NavLink to="/branches" end className={({ isActive }) => `${baseLinkClass} ${isActive ? activeClass : inactiveClass}`}>
            All Branches
          </NavLink>
          <NavLink to="/branches/new" className={({ isActive }) => `${baseLinkClass} ${isActive ? activeClass : inactiveClass}`}>
            Add Branch
          </NavLink>
        </div>
      </div>
      <div>
        <p className="mt-4 mb-2 text-xs font-bold uppercase tracking-wider text-cyan-100">Registration</p>
        <div className="space-y-2 pl-1">
          <NavLink to="/register" className={({ isActive }) => `${baseLinkClass} ${isActive ? activeClass : inactiveClass}`}>
            Register Staff
          </NavLink>
        </div>
      </div>
    </>
  )

  const branchNav = (
    <>
      <NavLink to="/dashboard" end className={({ isActive }) => `${baseLinkClass} ${isActive ? activeClass : inactiveClass}`}>
        Home
      </NavLink>
      <NavLink to="/rooms/new" className={({ isActive }) => `${baseLinkClass} ${isActive ? activeClass : inactiveClass}`}>
        Register Room
      </NavLink>
      <NavLink to="/tenants/new" className={({ isActive }) => `${baseLinkClass} ${isActive ? activeClass : inactiveClass}`}>
        Register Tenant
      </NavLink>
      <NavLink to="/invoices" className={({ isActive }) => `${baseLinkClass} ${isActive ? activeClass : inactiveClass}`}>
        Tenant Invoice
      </NavLink>
      <NavLink to="/rooms?status=vacant" className={({ isActive }) => `${baseLinkClass} ${isActive ? activeClass : inactiveClass}`}>
        Rental Room
      </NavLink>
      <NavLink to="/rooms?status=occupied" className={({ isActive }) => `${baseLinkClass} ${isActive ? activeClass : inactiveClass}`}>
        Rented Room
      </NavLink>
      <NavLink to="/statements" className={({ isActive }) => `${baseLinkClass} ${isActive ? activeClass : inactiveClass}`}>
        Tenant Statement
      </NavLink>
      <NavLink to="/transactions" className={({ isActive }) => `${baseLinkClass} ${isActive ? activeClass : inactiveClass}`}>
        Office Transaction
      </NavLink>
      <NavLink to="/reports" className={({ isActive }) => `${baseLinkClass} ${isActive ? activeClass : inactiveClass}`}>
        Office Report
      </NavLink>
    </>
  )

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <aside className="w-72 bg-gradient-to-b from-cyan-800 to-cyan-900 text-white px-5 py-6 flex flex-col">
          <h1 className="text-2xl font-black tracking-wide mb-6">CHOGO</h1>

          <div className="mb-6 rounded-xl bg-blue-950/40 border border-blue-900/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-cyan-200">Active Branch</p>
            <select
              value={activeBranch?.id ?? ''}
              onChange={(e) => setActiveBranchById(Number(e.target.value))}
              className="mt-1 w-full bg-transparent text-sm font-bold text-yellow-300 focus:outline-none"
            >
              {branches.length === 0 && <option value="">No branches</option>}
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="text-slate-900">
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <nav className="space-y-2 flex-1 overflow-y-auto">
            {isAdminBranch ? adminNav : branchNav}
          </nav>

          <div className="mt-6 pt-6 border-t border-cyan-700/50 text-xs text-cyan-100">
            Signed in as <span className="font-semibold text-white">{user?.full_name}</span>
          </div>
        </aside>

        <main className="flex-1 px-8 py-8">
          <header className="mb-6 rounded-xl bg-white px-6 py-4 shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Branch: <span className="font-semibold text-slate-700">{activeBranch?.name ?? '—'}</span>
              </p>
              <h2 className="text-2xl font-black text-slate-900">{title}</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:block">
                <label className="block text-[10px] uppercase tracking-wider text-slate-500">Switch branch</label>
                <select
                  value={activeBranch?.id ?? ''}
                  onChange={(e) => setActiveBranchById(Number(e.target.value))}
                  className="mt-0.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-sky-300"
                >
                  {branches.length === 0 && <option value="">No branches</option>}
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
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
        </main>
      </div>
    </div>
  )
}
