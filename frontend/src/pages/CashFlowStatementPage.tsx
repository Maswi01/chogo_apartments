import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import apartmentAPI, { type OfficeTransaction, type Payment } from '../lib/apartmentAPI'
import { useBranches } from '../context/BranchContext'

const fmt = (n: number) => new Intl.NumberFormat().format(n)
const ym = (s: string) => (s ? s.slice(0, 7) : '')

export default function CashFlowStatementPage() {
  const { activeBranch } = useBranches()
  const [payments, setPayments] = useState<Payment[]>([])
  const [txns, setTxns] = useState<OfficeTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBranch) return
    setLoading(true)
    Promise.all([
      apartmentAPI.listPayments(activeBranch.id),
      apartmentAPI.listTransactions(activeBranch.id),
    ])
      .then(([p, t]) => {
        setPayments(p.data)
        setTxns(t.data)
      })
      .finally(() => setLoading(false))
  }, [activeBranch?.id])

  const months = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>()
    const bump = (key: string, kind: 'income' | 'expense', amt: number) => {
      const cur = map.get(key) ?? { income: 0, expense: 0 }
      cur[kind] += amt
      map.set(key, cur)
    }
    payments.forEach((p) => bump(ym(p.payment_date), 'income', p.amount))
    txns.forEach((t) => bump(ym(t.txn_date), t.txn_type, t.amount))
    return Array.from(map.entries())
      .map(([month, v]) => ({ month, income: v.income, expense: v.expense, net: v.income - v.expense }))
      .sort((a, b) => (a.month < b.month ? 1 : -1))
  }, [payments, txns])

  const totals = months.reduce(
    (acc, m) => {
      acc.income += m.income
      acc.expense += m.expense
      return acc
    },
    { income: 0, expense: 0 },
  )

  return (
    <DashboardLayout title="Cash Flow Statement">
      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white border rounded-md p-4">
              <div className="text-xs text-slate-500">Total Inflow</div>
              <div className="text-emerald-600 text-xl font-semibold">{fmt(totals.income)}</div>
            </div>
            <div className="bg-white border rounded-md p-4">
              <div className="text-xs text-slate-500">Total Outflow</div>
              <div className="text-rose-600 text-xl font-semibold">{fmt(totals.expense)}</div>
            </div>
            <div className="bg-white border rounded-md p-4">
              <div className="text-xs text-slate-500">Net Cash Flow</div>
              <div className="text-cyan-700 text-xl font-semibold">{fmt(totals.income - totals.expense)}</div>
            </div>
          </div>
          <div className="bg-white border rounded-md overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-2">Month</th>
                  <th className="text-right p-2">Inflow</th>
                  <th className="text-right p-2">Outflow</th>
                  <th className="text-right p-2">Net</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month} className="border-t">
                    <td className="p-2 font-mono">{m.month}</td>
                    <td className="p-2 text-right text-emerald-600">{fmt(m.income)}</td>
                    <td className="p-2 text-right text-rose-600">{fmt(m.expense)}</td>
                    <td className={`p-2 text-right font-medium ${m.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {fmt(m.net)}
                    </td>
                  </tr>
                ))}
                {months.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-500">
                      No cash flow data available.
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
