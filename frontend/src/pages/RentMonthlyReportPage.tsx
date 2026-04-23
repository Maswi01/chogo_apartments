import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import apartmentAPI, { type Invoice, type Payment } from '../lib/apartmentAPI'
import { useBranches } from '../context/BranchContext'

const fmt = (n: number) => new Intl.NumberFormat().format(n)
const ym = (s: string) => (s ? s.slice(0, 7) : '')

export default function RentMonthlyReportPage() {
  const { activeBranch } = useBranches()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBranch) return
    setLoading(true)
    Promise.all([apartmentAPI.listInvoices(activeBranch.id), apartmentAPI.listPayments(activeBranch.id)])
      .then(([i, p]) => {
        setInvoices(i.data)
        setPayments(p.data)
      })
      .finally(() => setLoading(false))
  }, [activeBranch?.id])

  const months = useMemo(() => {
    const map = new Map<string, { invoiced: number; collected: number; count: number }>()
    invoices.forEach((inv) => {
      const k = ym(inv.period_start || inv.due_date)
      const cur = map.get(k) ?? { invoiced: 0, collected: 0, count: 0 }
      cur.invoiced += inv.amount_due
      cur.count += 1
      map.set(k, cur)
    })
    payments.forEach((p) => {
      const k = ym(p.payment_date)
      const cur = map.get(k) ?? { invoiced: 0, collected: 0, count: 0 }
      cur.collected += p.amount
      map.set(k, cur)
    })
    return Array.from(map.entries())
      .map(([month, v]) => ({
        month,
        invoiced: v.invoiced,
        collected: v.collected,
        outstanding: v.invoiced - v.collected,
        count: v.count,
        rate: v.invoiced ? (v.collected / v.invoiced) * 100 : 0,
      }))
      .sort((a, b) => (a.month < b.month ? 1 : -1))
  }, [invoices, payments])

  const totals = months.reduce(
    (a, m) => ({
      invoiced: a.invoiced + m.invoiced,
      collected: a.collected + m.collected,
      outstanding: a.outstanding + m.outstanding,
    }),
    { invoiced: 0, collected: 0, outstanding: 0 },
  )

  return (
    <DashboardLayout title="Rent Monthly Report">
      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white border rounded-md p-4">
              <div className="text-xs text-slate-500">Total Invoiced</div>
              <div className="text-slate-800 text-xl font-semibold">{fmt(totals.invoiced)}</div>
            </div>
            <div className="bg-white border rounded-md p-4">
              <div className="text-xs text-slate-500">Total Collected</div>
              <div className="text-emerald-600 text-xl font-semibold">{fmt(totals.collected)}</div>
            </div>
            <div className="bg-white border rounded-md p-4">
              <div className="text-xs text-slate-500">Outstanding</div>
              <div className="text-amber-600 text-xl font-semibold">{fmt(totals.outstanding)}</div>
            </div>
          </div>
          <div className="bg-white border rounded-md overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-2">Month</th>
                  <th className="text-right p-2">Invoices</th>
                  <th className="text-right p-2">Invoiced</th>
                  <th className="text-right p-2">Collected</th>
                  <th className="text-right p-2">Outstanding</th>
                  <th className="text-right p-2">Collection %</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month} className="border-t">
                    <td className="p-2 font-mono">{m.month}</td>
                    <td className="p-2 text-right">{m.count}</td>
                    <td className="p-2 text-right">{fmt(m.invoiced)}</td>
                    <td className="p-2 text-right text-emerald-600">{fmt(m.collected)}</td>
                    <td className="p-2 text-right text-amber-600">{fmt(m.outstanding)}</td>
                    <td className="p-2 text-right">{m.rate.toFixed(1)}%</td>
                  </tr>
                ))}
                {months.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-500">
                      No invoices found.
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
