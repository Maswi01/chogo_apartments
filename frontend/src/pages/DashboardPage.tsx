import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/DashboardLayout'

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <DashboardLayout title="Overview">
      <h3 className="text-lg font-bold text-slate-900 mb-5">Current User Snapshot</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Full Name</p>
          <p className="mt-2 text-base font-bold text-slate-900">{user?.full_name}</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
          <p className="mt-2 text-base font-bold text-slate-900">{user?.email}</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Role</p>
          <p className="mt-2 text-base font-bold text-slate-900 capitalize">{user?.role}</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Branch ID</p>
          <p className="mt-2 text-base font-bold text-slate-900">{user?.branch_id}</p>
        </div>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-emerald-700 font-semibold">System is ready for operations.</p>
        <p className="text-sm text-slate-700 mt-2">
          Use the left sidebar under Registration to register staff and add new branches.
        </p>
      </div>
    </DashboardLayout>
  )
}
