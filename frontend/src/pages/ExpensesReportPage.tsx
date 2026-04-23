import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import DocumentHeader from '../components/DocumentHeader'
import apartmentAPI, { type OfficeTransaction } from '../lib/apartmentAPI'
import { useBranches } from '../context/BranchContext'

const fmt = (n: number) => new Intl.NumberFormat().format(n)

export default function ExpensesReportPage() {
  const { activeBranch } = useBranches()
  const [txns, setTxns] = useState<OfficeTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBranch) return
    setLoading(true)
    apartmentAPI
      .listTransactions(activeBranch.id)
      .then((r) => setTxns(r.data))
      .finally(() => setLoading(false))
  }, [activeBranch?.id])

  const groups = useMemo(() => {
    const map = new Map<string, number>()
    txns
      .filter((t) => t.txn_type === 'expense')
      .forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + t.amount))
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0)
    return {
      total,
      rows: Array.from(map.entries())
        .map(([category, amount]) => ({ category, amount, pct: total ? (amount / total) * 100 : 0 }))
        .sort((a, b) => b.amount - a.amount),
    }
  }, [txns])

  return (
    <DashboardLayout title="Expenses Report">
      <DocumentHeader title="Expenses Report (by Category)" />
      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border rounded-md p-4 flex justify-between">
            <span className="text-slate-600">Total expenses</span>
            <b className="text-rose-600 text-lg">{fmt(groups.total)}</b>
          </div>
          <div className="bg-white border rounded-md overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-2">Category</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-right p-2 w-1/3">Share</th>
                </tr>
              </thead>
              <tbody>
                {groups.rows.map((r) => (
                  <tr key={r.category} className="border-t">
                    <td className="p-2 font-medium">{r.category}</td>
                    <td className="p-2 text-right">{fmt(r.amount)}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded h-2 overflow-hidden">
                          <div className="h-2 bg-cyan-600" style={{ width: `${r.pct.toFixed(1)}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-12 text-right">{r.pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {groups.rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-slate-500">
                      No expenses to report.
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
