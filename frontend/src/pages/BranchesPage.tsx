import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { useBranches } from '../context/BranchContext'

export default function BranchesPage() {
  const { branches, activeBranch, refresh, setActiveBranchById, loading } = useBranches()

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <DashboardLayout title="Branches">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900">All branches</h3>
          <p className="text-sm text-slate-500">Switch the active branch or add a new one.</p>
        </div>
        <Link
          to="/branches/new"
          className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700"
        >
          + Add Branch
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">ID</th>
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading && branches.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">Loading branches...</td>
              </tr>
            )}
            {!loading && branches.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  No branches yet. <Link to="/branches/new" className="text-sky-700 font-semibold">Add the first branch</Link>.
                </td>
              </tr>
            )}
            {branches.map((branch) => {
              const isActive = activeBranch?.id === branch.id
              return (
                <tr key={branch.id} className={isActive ? 'bg-sky-50/60' : ''}>
                  <td className="px-4 py-3 text-slate-600">#{branch.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{branch.name}</td>
                  <td className="px-4 py-3">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-xs font-semibold">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-xs">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={isActive}
                      onClick={() => setActiveBranchById(branch.id)}
                      className="text-xs font-semibold text-sky-700 hover:text-sky-900 disabled:text-slate-400"
                    >
                      {isActive ? 'Current' : 'Switch'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  )
}
