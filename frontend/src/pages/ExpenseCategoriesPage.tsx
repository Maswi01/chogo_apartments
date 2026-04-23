import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import expenseCategoryAPI, { type ExpenseCategory } from '../lib/expenseCategoryAPI'

export default function ExpenseCategoriesPage() {
  const [items, setItems] = useState<ExpenseCategory[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    setLoading(true)
    expenseCategoryAPI
      .list()
      .then((r) => setItems(r.data))
      .catch(() => setError('Failed to load categories'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await expenseCategoryAPI.create({ name: name.trim(), description: description.trim() })
      setName('')
      setDescription('')
      load()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create category')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (cat: ExpenseCategory) => {
    await expenseCategoryAPI.update(cat.id, {
      name: cat.name,
      description: cat.description,
      is_active: !cat.is_active,
    })
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this category? Existing transactions will keep the category name.')) return
    await expenseCategoryAPI.remove(id)
    load()
  }

  return (
    <DashboardLayout title="Register Expense Category">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white border rounded-md p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-3">New Category</h3>
            {error && (
              <div className="mb-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded">
                {error}
              </div>
            )}
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-cyan-300"
                  placeholder="e.g. Plumbing"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-cyan-300"
                  placeholder="Optional notes"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded bg-cyan-700 text-white font-semibold hover:bg-cyan-800 disabled:opacity-60"
              >
                {submitting ? 'Saving...' : 'Add Category'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border rounded-md overflow-hidden">
            <div className="px-5 py-3 border-b flex justify-between items-center">
              <h3 className="text-base font-semibold text-slate-800">Existing Categories</h3>
              <span className="text-xs text-slate-500">{items.length} total</span>
            </div>
            {loading ? (
              <p className="p-5 text-slate-500">Loading...</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-center p-2">Status</th>
                    <th className="text-right p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="p-2 font-medium">{c.name}</td>
                      <td className="p-2 text-slate-500">{c.description || '—'}</td>
                      <td className="p-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-2 text-right space-x-2">
                        <button
                          onClick={() => handleToggle(c)}
                          className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
                        >
                          {c.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-xs px-2 py-1 rounded border border-rose-300 text-rose-600 hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-500">
                        No categories yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
