import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import authAPI from '../lib/authAPI'
import { useBranches } from '../context/BranchContext'

export default function AddBranchPage() {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { branches, refresh, setActiveBranchById } = useBranches()

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const trimmed = name.trim()
    if (!trimmed) {
      setError('Branch name is required')
      return
    }

    setLoading(true)
    try {
      const response = await authAPI.createBranch({ name: trimmed })
      await refresh()
      setActiveBranchById(response.data.id)
      setSuccess(`Branch "${response.data.name}" created and set as active.`)
      setName('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create branch')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="Add Branch">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-bold text-slate-900">Create a new branch</h3>
            <p className="text-sm text-slate-500 mt-1">
              Branches isolate operational data. You can switch the active branch at any time from the sidebar.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                  {success}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Branch Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-300 outline-none"
                  placeholder="e.g., Gerezani"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:bg-slate-300"
                >
                  {loading ? 'Creating...' : 'Create Branch'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/branches')}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  View All Branches
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Existing Branches</h4>
            <p className="text-xs text-slate-500 mt-1">{branches.length} total</p>

            <ul className="mt-4 divide-y divide-slate-100">
              {branches.map((branch) => (
                <li key={branch.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{branch.name}</p>
                    <p className="text-xs text-slate-400">ID #{branch.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveBranchById(branch.id)}
                    className="text-xs font-semibold text-sky-700 hover:text-sky-900"
                  >
                    Set active
                  </button>
                </li>
              ))}
              {branches.length === 0 && (
                <li className="py-3 text-sm text-slate-500">No branches yet.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
