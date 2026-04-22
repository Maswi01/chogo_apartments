import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import authAPI from '../lib/authAPI'

export default function AddBranchPage() {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Branch name is required')
      return
    }

    setLoading(true)
    try {
      await authAPI.createBranch({ name: name.trim() })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create branch')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="Add Branch">
      <div className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Branch Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="e.g., Gerezani"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {loading ? 'Creating...' : 'Create Branch'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-3 py-2 border rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
