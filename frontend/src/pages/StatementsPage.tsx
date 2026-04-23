import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import DocumentHeader from '../components/DocumentHeader'
import apartmentAPI, { type Payment, type Tenant } from '../lib/apartmentAPI'
import { useBranches } from '../context/BranchContext'

const fmt = (n: number) => new Intl.NumberFormat().format(n)

export default function StatementsPage() {
  const { activeBranch } = useBranches()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantId, setTenantId] = useState<string>('')
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeBranch) return
    apartmentAPI.listTenants(activeBranch.id).then((r) => setTenants(r.data))
  }, [activeBranch?.id])

  useEffect(() => {
    if (!activeBranch || !tenantId) {
      setPayments([])
      return
    }
    setLoading(true)
    apartmentAPI
      .listPayments(activeBranch.id, { tenant_id: Number(tenantId) })
      .then((r) => setPayments(r.data))
      .finally(() => setLoading(false))
  }, [activeBranch?.id, tenantId])

  const total = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <DashboardLayout title="Tenant Statement">
      <DocumentHeader title="Tenant Statement" />
      <div className="mb-4 max-w-md">
        <label className="block text-sm font-medium text-slate-700 mb-1">Select Tenant</label>
        <select
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
        >
          <option value="">- choose tenant -</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name} {t.phone ? `(${t.phone})` : ''}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : !tenantId ? (
        <p className="text-slate-500">Pick a tenant to view their payment history.</p>
      ) : payments.length === 0 ? (
        <p className="text-slate-500">No payments recorded.</p>
      ) : (
        <>
          <p className="mb-3 text-sm">
            Total paid: <span className="font-bold text-emerald-700">{fmt(total)}</span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Receipt</th>
                  <th className="px-3 py-2 text-left">Room</th>
                  <th className="px-3 py-2 text-left">Method</th>
                  <th className="px-3 py-2 text-left">Notes</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-right print:hidden">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{p.payment_date}</td>
                    <td className="px-3 py-2">{p.receipt_number || '-'}</td>
                    <td className="px-3 py-2">{p.room_code || '-'}</td>
                    <td className="px-3 py-2">{p.payment_method || '-'}</td>
                    <td className="px-3 py-2 text-slate-500">{p.notes}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmt(p.amount)}</td>
                    <td className="px-3 py-2 text-right print:hidden">
                      <Link to={`/payments/${p.id}/receipt`} target="_blank" className="text-xs font-semibold text-slate-600 hover:text-slate-900">🖨 Print</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
