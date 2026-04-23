import { useEffect, useState } from 'react'
import apartmentAPI, { type AdminDashboardData } from '../lib/apartmentAPI'

const fmt = (n: number) => new Intl.NumberFormat().format(n)
const today = new Date().toLocaleDateString('en-GB')

interface StatPillProps {
  value: number
  label: string
  tone: 'dark' | 'red' | 'amber' | 'slate' | 'rose'
}

function StatPill({ value, label, tone }: StatPillProps) {
  const toneClass = {
    dark: 'bg-slate-900 text-white',
    red: 'bg-rose-600 text-white',
    amber: 'bg-amber-500 text-white',
    slate: 'bg-slate-500 text-white',
    rose: 'bg-rose-600 text-white',
  }[tone]
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 bg-white">
      <span className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-full px-2 text-sm font-bold ${toneClass}`}>
        {value}
      </span>
      <div>
        <p className="text-sm text-slate-700">{label}</p>
      </div>
    </div>
  )
}

function BigNumber({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-slate-200 px-4 py-3 bg-white">
      <p className="text-2xl font-black text-slate-900 leading-tight">{fmt(value)}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apartmentAPI
      .adminDashboard()
      .then((r) => setData(r.data))
      .catch(() => setError('Failed to load admin dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-slate-500">Loading dashboard...</p>
  if (error) return <p className="text-rose-600">{error}</p>
  if (!data) return null

  const t = data.totals
  return (
    <div className="space-y-6">
      <div>
        <div className="rounded-t-xl bg-blue-600 px-5 py-3 flex items-center justify-between">
          <h3 className="text-white font-bold uppercase tracking-wide text-sm">
            Administration Owner Updates - All Branches
          </h3>
          <p className="text-white text-xs">Updated: {today}</p>
        </div>
        <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white px-5 py-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <BigNumber value={t.active_contracts} label="Active Contracts" />
          <StatPill value={t.expiring_7d} label="Expiring (7 days)" tone="rose" />
          <StatPill value={t.expiring_30d} label="Expiring (30 days)" tone="amber" />
          <StatPill value={t.expired_in_progress} label="Expired (still progress)" tone="slate" />
          <StatPill value={t.unpaid_active} label="Unpaid Active" tone="rose" />
          <BigNumber value={Math.round(t.payments_today)} label="Payments Today" />
        </div>
      </div>

      {data.branches
        .filter((b) => b.branch_name.toLowerCase() !== 'administration')
        .map((b) => (
          <div key={b.branch_id}>
            <div className="rounded-t-xl bg-blue-600 px-5 py-3 flex items-center justify-between">
              <h3 className="text-white font-bold uppercase tracking-wide text-sm">
                Branch: {b.branch_name}
              </h3>
              <p className="text-white text-xs">Today: {Math.round(b.payments_today)}</p>
            </div>
            <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white px-5 py-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <BigNumber value={b.active_contracts} label="Active" />
              <StatPill value={b.expiring_7d} label="Expiring 7d" tone="rose" />
              <StatPill value={b.expiring_30d} label="Expiring 30d" tone="amber" />
              <StatPill value={b.expired_in_progress} label="Expired" tone="slate" />
              <StatPill value={b.unpaid_active} label="Unpaid" tone="rose" />
            </div>
          </div>
        ))}
    </div>
  )
}
