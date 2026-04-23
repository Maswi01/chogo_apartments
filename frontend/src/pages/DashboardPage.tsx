import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBranches } from '../context/BranchContext'
import DashboardLayout from '../components/DashboardLayout'

export default function DashboardPage() {
  const { user } = useAuth()
  const { activeBranch, branches } = useBranches()

  return (
    <DashboardLayout title="Overview">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-sky-100 bg-sky-50 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Active Branch</p>
          <p className="mt-2 text-xl font-black text-slate-900">{activeBranch?.name ?? '—'}</p>
          <p className="text-xs text-slate-500 mt-1">ID #{activeBranch?.id ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Branches</p>
          <p className="mt-2 text-xl font-black text-slate-900">{branches.length}</p>
          <Link to="/branches" className="text-xs font-semibold text-emerald-700 hover:underline">
            Manage branches →
          </Link>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Signed in as</p>
          <p className="mt-2 text-base font-bold text-slate-900">{user?.full_name}</p>
          <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/branches/new" className="block rounded-xl border border-slate-200 bg-white p-5 hover:border-sky-400 transition">
          <p className="text-sm font-bold text-slate-900">+ Add a new branch</p>
          <p className="text-xs text-slate-500 mt-1">Create an isolated branch for a property cluster or office.</p>
        </Link>
        <Link to="/register" className="block rounded-xl border border-slate-200 bg-white p-5 hover:border-sky-400 transition">
          <p className="text-sm font-bold text-slate-900">+ Register staff account</p>
          <p className="text-xs text-slate-500 mt-1">Add staff to a branch so they can log in and operate it.</p>
        </Link>
      </div>
    </DashboardLayout>
  )
}
