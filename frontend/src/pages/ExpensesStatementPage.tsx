import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import DocumentHeader from '../components/DocumentHeader'
import apartmentAPI, { type OfficeTransaction } from '../lib/apartmentAPI'
import { useBranches } from '../context/BranchContext'

const fmt = (n: number) => new Intl.NumberFormat().format(n)

export default function ExpensesStatementPage() {
  const { activeBranch } = useBranches()
  const [txns, setTxns] = useState<OfficeTransaction[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBranch) return
    setLoading(true)
    apartmentAPI
      .listTransactions(activeBranch.id)
      .then((r) => setTxns(r.data))
      .finally(() => setLoading(false))
  }, [activeBranch?.id])

  const rows = useMemo(
    () =>
      txns
        .filter((t) => t.txn_type === 'expense')
        .filter((t) => (from ? t.txn_date >= from : true) && (to ? t.txn_date <= to : true))
        .sort((a, b) => (a.txn_date < b.txn_date ? 1 : -1)),
    [txns, from, to],
  )
  const total = rows.reduce((s, r) => s + r.amount, 0)

  return (
    <DashboardLayout title="Expenses Statement">
      <DocumentHeader title="Expenses Statement" period={from || to ? `${from || '…'} to ${to || '…'}` : 'All dates'} />
      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end bg-white border rounded-md p-4">
            <label className="text-sm">
              <span className="block text-slate-500 mb-1">From</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded px-2 py-1" />
            </label>
            <label className="text-sm">
              <span className="block text-slate-500 mb-1">To</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded px-2 py-1" />
            </label>
            <div className="ml-auto text-sm text-slate-600">
              Total expenses: <b className="text-rose-600">{fmt(total)}</b>
            </div>
          </div>
          <div className="bg-white border rounded-md overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Notes</th>
                  <th className="text-right p-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{r.txn_date?.slice(0, 10)}</td>
                    <td className="p-2">{r.category}</td>
                    <td className="p-2 text-slate-500">{r.description}</td>
                    <td className="p-2 text-right text-rose-600">{fmt(r.amount)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-500">
                      No expenses recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
