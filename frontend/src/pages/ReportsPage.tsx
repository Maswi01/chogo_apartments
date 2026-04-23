import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import apartmentAPI, { type BranchDashboardData, type OfficeTransaction, type Payment } from '../lib/apartmentAPI'
import { useBranches } from '../context/BranchContext'

const fmt = (n: number) => new Intl.NumberFormat().format(n)

export default function ReportsPage() {
  const { activeBranch } = useBranches()
  const [dash, setDash] = useState<BranchDashboardData | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [txns, setTxns] = useState<OfficeTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBranch) return
    setLoading(true)
    Promise.all([
      apartmentAPI.branchDashboard(activeBranch.id),
      apartmentAPI.listPayments(activeBranch.id),
      apartmentAPI.listTransactions(activeBranch.id),
    ])
      .then(([d, p, t]) => {
        setDash(d.data)
        setPayments(p.data)
        setTxns(t.data)
      })
      .finally(() => setLoading(false))
  }, [activeBranch?.id])

  if (loading || !dash) {
    return (
      <DashboardLayout title="Office Report">
        <p className="text-slate-500">Loading...</p>
      </DashboardLayout>
    )
  }

  const totalCollected = payments.reduce((s, p) => s + p.amount, 0)
  const income = txns.filter((i) => i.txn_type === 'income').reduce((s, i) => s + i.amount, 0)
  const expense = txns.filter((i) => i.txn_type === 'expense').reduce((s, i) => s + i.amount, 0)

  return (
    <DashboardLayout title={`Office Report - ${dash.branch_name}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Active Contracts" value={fmt(dash.active_contracts)} tone="sky" />
        <Card label="Unpaid Active" value={fmt(dash.unpaid_active)} tone="rose" />
        <Card label="Expiring 30d" value={fmt(dash.expiring_30d)} tone="amber" />
        <Card label="Payments Today" value={fmt(Math.round(dash.payments_today))} tone="emerald" />
        <Card label="Total Collected (all time)" value={fmt(totalCollected)} tone="emerald" />
        <Card label="Office Income" value={fmt(income)} tone="emerald" />
        <Card label="Office Expense" value={fmt(expense)} tone="rose" />
        <Card label="Net (income - expense)" value={fmt(income - expense)} tone="slate" />
      </div>

      <h3 className="mt-8 mb-3 text-lg font-bold text-slate-900">Recent Payments</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Tenant</th>
              <th className="px-3 py-2 text-left">Room</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.slice(0, 20).map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{p.payment_date}</td>
                <td className="px-3 py-2 font-semibold">{p.tenant_name}</td>
                <td className="px-3 py-2">{p.room_code}</td>
                <td className="px-3 py-2 text-right">{fmt(p.amount)}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-slate-500">
                  No payments recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  )
}

function Card({ label, value, tone }: { label: string; value: string; tone: 'sky' | 'rose' | 'amber' | 'emerald' | 'slate' }) {
  const toneClass = {
    sky: 'border-sky-200 bg-sky-50',
    rose: 'border-rose-200 bg-rose-50',
    amber: 'border-amber-200 bg-amber-50',
    emerald: 'border-emerald-200 bg-emerald-50',
    slate: 'border-slate-200 bg-slate-50',
  }[tone]
  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs text-slate-600 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </div>
  )
}
