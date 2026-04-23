import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import apartmentAPI, { type OfficeTransaction } from '../lib/apartmentAPI'
import { useBranches } from '../context/BranchContext'

const fmt = (n: number) => new Intl.NumberFormat().format(n)

export default function TransactionsPage() {
  const { activeBranch } = useBranches()
  const [items, setItems] = useState<OfficeTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    txn_type: 'expense' as 'income' | 'expense',
    category: '',
    amount: '',
    txn_date: new Date().toISOString().slice(0, 10),
    description: '',
  })
  const [error, setError] = useState('')

  const reload = () => {
    if (!activeBranch) return
    setLoading(true)
    apartmentAPI
      .listTransactions(activeBranch.id)
      .then((r) => setItems(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(reload, [activeBranch?.id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeBranch) return
    setError('')
    if (!form.amount) {
      setError('Amount is required')
      return
    }
    try {
      await apartmentAPI.createTransaction({
        branch_id: activeBranch.id,
        txn_type: form.txn_type,
        category: form.category,
        amount: Number(form.amount),
        txn_date: form.txn_date,
        description: form.description,
      })
      setShowForm(false)
      setForm({
        txn_type: 'expense',
        category: '',
        amount: '',
        txn_date: new Date().toISOString().slice(0, 10),
        description: '',
      })
      reload()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed')
    }
  }

  const income = items.filter((i) => i.txn_type === 'income').reduce((s, i) => s + i.amount, 0)
  const expense = items.filter((i) => i.txn_type === 'expense').reduce((s, i) => s + i.amount, 0)

  return (
    <DashboardLayout title="Office Transactions">
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs text-slate-500">Income</p>
          <p className="text-lg font-black text-emerald-700">{fmt(income)}</p>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs text-slate-500">Expense</p>
          <p className="text-lg font-black text-rose-700">{fmt(expense)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Net</p>
          <p className="text-lg font-black text-slate-900">{fmt(income - expense)}</p>
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700"
        >
          {showForm ? 'Close' : '+ Record Transaction'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-3 p-4 border border-slate-200 rounded-lg">
          {error && <div className="md:col-span-5 p-2 bg-rose-50 text-rose-700 text-sm rounded">{error}</div>}
          <select
            value={form.txn_type}
            onChange={(e) => setForm({ ...form, txn_type: e.target.value as any })}
            className="px-3 py-2 border border-slate-300 rounded-lg"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
          <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
          <input type="date" value={form.txn_date} onChange={(e) => setForm({ ...form, txn_date: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
          <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
          <button type="submit" className="md:col-span-5 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700">
            Save
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-slate-500">No transactions recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{t.txn_date}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        t.txn_type === 'income'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {t.txn_type}
                    </span>
                  </td>
                  <td className="px-3 py-2">{t.category || '-'}</td>
                  <td className="px-3 py-2 text-slate-500">{t.description}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmt(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  )
}
