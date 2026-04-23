import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import DocumentHeader from '../components/DocumentHeader'
import apartmentAPI, { type OfficeTransaction, type Payment } from '../lib/apartmentAPI'
import { useBranches } from '../context/BranchContext'

const fmt = (n: number) => new Intl.NumberFormat().format(n)

type Row = {
  date: string
  ref: string
  description: string
  inflow: number
  outflow: number
}

export default function TransactionStatementPage() {
  const { activeBranch } = useBranches()
  const [payments, setPayments] = useState<Payment[]>([])
  const [txns, setTxns] = useState<OfficeTransaction[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
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

  const rows = useMemo<Row[]>(() => {
    const r: Row[] = []
    payments.forEach((p) =>
      r.push({
        date: p.payment_date,
        ref: `PMT-${p.id}`,
        description: `Rent payment${p.payment_method ? ` (${p.payment_method})` : ''}`,
        inflow: p.amount,
        outflow: 0,
      }),
    )
    txns.forEach((t) =>
      r.push({
        date: t.txn_date,
        ref: `TXN-${t.id}`,
        description: `${t.category}${t.description ? ' — ' + t.description : ''}`,
        inflow: t.txn_type === 'income' ? t.amount : 0,
        outflow: t.txn_type === 'expense' ? t.amount : 0,
      }),
    )
    return r
      .filter((x) => (from ? x.date >= from : true) && (to ? x.date <= to : true))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [payments, txns, from, to])

  let running = 0
  const totals = rows.reduce(
    (acc, r) => {
      acc.in += r.inflow
      acc.out += r.outflow
      return acc
    },
    { in: 0, out: 0 },
  )

  return (
    <DashboardLayout title="Transaction Statement">
      <DocumentHeader title="Transaction Statement" period={from || to ? `${from || '…'} to ${to || '…'}` : 'All dates'} />
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
              In: <b className="text-emerald-600">{fmt(totals.in)}</b> · Out:{' '}
              <b className="text-rose-600">{fmt(totals.out)}</b> · Net:{' '}
              <b>{fmt(totals.in - totals.out)}</b>
            </div>
          </div>
          <div className="bg-white border rounded-md overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Ref</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-right p-2">Inflow</th>
                  <th className="text-right p-2">Outflow</th>
                  <th className="text-right p-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  running += r.inflow - r.outflow
                  return (
                    <tr key={r.ref} className="border-t">
                      <td className="p-2">{r.date?.slice(0, 10)}</td>
                      <td className="p-2 font-mono text-xs">{r.ref}</td>
                      <td className="p-2">{r.description}</td>
                      <td className="p-2 text-right text-emerald-600">{r.inflow ? fmt(r.inflow) : ''}</td>
                      <td className="p-2 text-right text-rose-600">{r.outflow ? fmt(r.outflow) : ''}</td>
                      <td className="p-2 text-right">{fmt(running)}</td>
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-500">
                      No transactions in selected range.
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
