import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apartmentAPI, { type BranchDashboardData, type Contract } from '../lib/apartmentAPI'

const fmt = (n: number) => new Intl.NumberFormat().format(n)
const today = new Date().toLocaleDateString('en-GB')

interface SectionProps {
  title: string
  action?: string
  color: 'orange' | 'red' | 'gray' | 'green' | 'blue'
  children: React.ReactNode
}

function Section({ title, action, color, children }: SectionProps) {
  const headerClass = {
    orange: 'bg-orange-500',
    red: 'bg-rose-600',
    gray: 'bg-slate-500',
    green: 'bg-emerald-600',
    blue: 'bg-blue-600',
  }[color]
  return (
    <div>
      <div className={`rounded-t-xl ${headerClass} px-5 py-3 flex items-center justify-between`}>
        <h3 className="text-white font-bold text-sm">{title}</h3>
        {action && <p className="text-white text-xs">{action}</p>}
      </div>
      <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white">{children}</div>
    </div>
  )
}

function ContractRow({
  c,
  index,
  showAction = 'view',
}: {
  c: Contract
  index: number
  showAction?: 'view' | 'pay'
}) {
  return (
    <tr className="border-t border-slate-100 text-sm">
      <td className="px-3 py-2">{index}</td>
      <td className="px-3 py-2 font-semibold">{c.tenant_name}</td>
      <td className="px-3 py-2">{c.booking_code || '-'}</td>
      <td className="px-3 py-2">{c.room_code}</td>
      <td className="px-3 py-2">{c.tenant_phone}</td>
      <td className="px-3 py-2">{c.end_date}</td>
      <td className="px-3 py-2">{c.days_left}d</td>
      <td className="px-3 py-2 text-right">{fmt(c.invoice_total ?? 0)}</td>
      <td className="px-3 py-2 text-right">{fmt(c.paid_total ?? 0)}</td>
      <td className="px-3 py-2 text-right font-semibold text-rose-600">{fmt(c.balance ?? 0)}</td>
      <td className="px-3 py-2 text-right">
        <Link
          to={showAction === 'pay' ? `/invoices?contract=${c.id}` : `/statements?tenant=${c.tenant_id}`}
          className="text-xs font-semibold text-sky-700 hover:text-sky-900"
        >
          {showAction === 'pay' ? 'View / Pay' : 'View'}
        </Link>
      </td>
    </tr>
  )
}

interface Props {
  branchId: number
}

export default function BranchDashboard({ branchId }: Props) {
  const [data, setData] = useState<BranchDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    apartmentAPI
      .branchDashboard(branchId)
      .then((r) => setData(r.data))
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [branchId])

  if (loading) return <p className="text-slate-500">Loading dashboard...</p>
  if (error) return <p className="text-rose-600">{error}</p>
  if (!data) return null

  return (
    <div className="space-y-5">
      <div>
        <div className="rounded-t-xl bg-blue-600 px-5 py-3 flex items-center justify-between">
          <h3 className="text-white font-bold uppercase tracking-wide text-sm">
            Owner Updates - {data.branch_name}
          </h3>
          <p className="text-white text-xs">Updated: {today}</p>
        </div>
        <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white px-5 py-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-lg border border-slate-200 px-4 py-3">
            <p className="text-2xl font-black text-slate-900">{fmt(data.active_contracts)}</p>
            <p className="text-sm text-slate-500">Active Contracts</p>
          </div>
          <Pill value={data.expiring_7d} label="Expiring (7 days)" tone="rose" />
          <Pill value={data.expiring_30d} label="Expiring (30 days)" tone="amber" />
          <Pill value={data.expired_in_progress} label="Expired (still progress)" tone="slate" />
          <Pill value={data.unpaid_active} label="Unpaid Active" tone="rose" />
          <div className="rounded-lg border border-slate-200 px-4 py-3">
            <p className="text-2xl font-black text-slate-900">{fmt(data.payments_today_count)}</p>
            <p className="text-sm text-slate-500">Payments Today</p>
          </div>
        </div>
      </div>

      <Section title="Contracts to Expire ( 30 days)" action="Action: View / Pay" color="orange">
        <ContractTable
          contracts={data.expiring_soon}
          empty="No contracts expiring in next 30 days."
          action="pay"
        />
      </Section>

      <Section title="Expired Contracts" action="Action: View" color="red">
        <ContractTable
          contracts={data.expired_contracts}
          empty="No expired contracts still in progress."
          action="view"
        />
      </Section>

      <Section title="Unpaid Active Contracts (Balance > 0)" action="Action: View / Pay" color="gray">
        <ContractTable
          contracts={data.unpaid_contracts}
          empty="All active contracts are fully paid."
          action="pay"
        />
      </Section>

      <Section title="Payments Today" action={`Total: ${fmt(Math.round(data.payments_today))}`} color="green">
        {data.today_payments.length === 0 ? (
          <p className="px-5 py-3 text-sm text-slate-500">No payments recorded today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Tenant</th>
                  <th className="px-3 py-2 text-left">Room</th>
                  <th className="px-3 py-2 text-left">Receipt</th>
                  <th className="px-3 py-2 text-left">Method</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.today_payments.map((p, i) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2 font-semibold">{p.tenant_name}</td>
                    <td className="px-3 py-2">{p.room_code}</td>
                    <td className="px-3 py-2">{p.receipt_number || '-'}</td>
                    <td className="px-3 py-2">{p.payment_method || '-'}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmt(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}

function Pill({ value, label, tone }: { value: number; label: string; tone: 'rose' | 'amber' | 'slate' }) {
  const toneClass = {
    rose: 'bg-rose-600 text-white',
    amber: 'bg-amber-500 text-white',
    slate: 'bg-slate-500 text-white',
  }[tone]
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
      <span className={`inline-flex h-7 min-w-[2rem] items-center justify-center rounded-full px-2 text-sm font-bold ${toneClass}`}>
        {value}
      </span>
      <p className="text-sm text-slate-700">{label}</p>
    </div>
  )
}

function ContractTable({
  contracts,
  empty,
  action,
}: {
  contracts: Contract[]
  empty: string
  action: 'view' | 'pay'
}) {
  if (contracts.length === 0) return <p className="px-5 py-3 text-sm text-slate-500">{empty}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Tenant</th>
            <th className="px-3 py-2 text-left">Booking</th>
            <th className="px-3 py-2 text-left">Room</th>
            <th className="px-3 py-2 text-left">Mobile</th>
            <th className="px-3 py-2 text-left">End Date</th>
            <th className="px-3 py-2 text-left">Days Left</th>
            <th className="px-3 py-2 text-right">Invoice</th>
            <th className="px-3 py-2 text-right">Paid</th>
            <th className="px-3 py-2 text-right">Balance</th>
            <th className="px-3 py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((c, i) => (
            <ContractRow key={c.id} c={c} index={i + 1} showAction={action} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
