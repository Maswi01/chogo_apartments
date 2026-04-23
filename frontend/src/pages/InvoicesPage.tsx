import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import DocumentHeader from '../components/DocumentHeader'
import apartmentAPI, { type Contract, type Invoice } from '../lib/apartmentAPI'
import { useBranches } from '../context/BranchContext'

const fmt = (n: number) => new Intl.NumberFormat().format(n)

export default function InvoicesPage() {
  const { activeBranch } = useBranches()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [showPayForm, setShowPayForm] = useState<Invoice | null>(null)

  const reload = () => {
    if (!activeBranch) return
    setLoading(true)
    Promise.all([
      apartmentAPI.listInvoices(activeBranch.id),
      apartmentAPI.listContracts(activeBranch.id, 'active'),
    ])
      .then(([i, c]) => {
        setInvoices(i.data)
        setContracts(c.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(reload, [activeBranch?.id])

  return (
    <DashboardLayout title="Tenant Invoices">
      <DocumentHeader title="Tenant Invoices" />
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowInvoiceForm(true)}
          className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700"
        >
          + New Invoice
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : invoices.length === 0 ? (
        <p className="text-slate-500">No invoices yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left">Invoice #</th>
                <th className="px-3 py-2 text-left">Tenant</th>
                <th className="px-3 py-2 text-left">Room</th>
                <th className="px-3 py-2 text-left">Period</th>
                <th className="px-3 py-2 text-left">Due Date</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-right">Paid</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{inv.invoice_number || `#${inv.id}`}</td>
                  <td className="px-3 py-2 font-semibold">{inv.tenant_name}</td>
                  <td className="px-3 py-2">{inv.room_code}</td>
                  <td className="px-3 py-2">
                    {inv.period_start} → {inv.period_end}
                  </td>
                  <td className="px-3 py-2">{inv.due_date || '-'}</td>
                  <td className="px-3 py-2 text-right">{fmt(inv.amount_due)}</td>
                  <td className="px-3 py-2 text-right">{fmt(inv.amount_paid)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        inv.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : inv.status === 'partial'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/invoices/${inv.id}/print`}
                        target="_blank"
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        🖨 Print
                      </Link>
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => setShowPayForm(inv)}
                          className="text-xs font-semibold text-sky-700 hover:text-sky-900"
                        >
                          Pay
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInvoiceForm && activeBranch && (
        <NewInvoiceModal
          branchId={activeBranch.id}
          contracts={contracts}
          onClose={() => setShowInvoiceForm(false)}
          onCreated={() => {
            setShowInvoiceForm(false)
            reload()
          }}
        />
      )}

      {showPayForm && activeBranch && (
        <PaymentModal
          branchId={activeBranch.id}
          invoice={showPayForm}
          onClose={() => setShowPayForm(null)}
          onPaid={() => {
            setShowPayForm(null)
            reload()
          }}
        />
      )}
    </DashboardLayout>
  )
}

function NewInvoiceModal({
  branchId,
  contracts,
  onClose,
  onCreated,
}: {
  branchId: number
  contracts: Contract[]
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    contract_id: '',
    invoice_number: '',
    period_start: new Date().toISOString().slice(0, 10),
    period_end: '',
    amount_due: '',
    due_date: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.contract_id || !form.period_end || !form.amount_due) {
      setError('Contract, period end, and amount are required')
      return
    }
    setLoading(true)
    try {
      await apartmentAPI.createInvoice({
        branch_id: branchId,
        contract_id: Number(form.contract_id),
        invoice_number: form.invoice_number,
        period_start: form.period_start,
        period_end: form.period_end,
        amount_due: Number(form.amount_due),
        due_date: form.due_date,
      })
      onCreated()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="New Invoice" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="p-2 bg-rose-50 text-rose-700 text-sm rounded">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contract *</label>
          <select
            value={form.contract_id}
            onChange={(e) => {
              const c = contracts.find((x) => x.id === Number(e.target.value))
              setForm({
                ...form,
                contract_id: e.target.value,
                amount_due: c ? String(c.monthly_rent) : form.amount_due,
              })
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          >
            <option value="">Select active contract</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tenant_name} - Room {c.room_code}
              </option>
            ))}
          </select>
        </div>
        <Input label="Invoice Number" value={form.invoice_number} onChange={(v) => setForm({ ...form, invoice_number: v })} />
        <Input label="Period Start *" type="date" value={form.period_start} onChange={(v) => setForm({ ...form, period_start: v })} />
        <Input label="Period End *" type="date" value={form.period_end} onChange={(v) => setForm({ ...form, period_end: v })} />
        <Input label="Amount Due *" type="number" value={form.amount_due} onChange={(v) => setForm({ ...form, amount_due: v })} />
        <Input label="Due Date" type="date" value={form.due_date} onChange={(v) => setForm({ ...form, due_date: v })} />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:bg-slate-300"
        >
          {loading ? 'Saving...' : 'Create Invoice'}
        </button>
      </form>
    </Modal>
  )
}

function PaymentModal({
  branchId,
  invoice,
  onClose,
  onPaid,
}: {
  branchId: number
  invoice: Invoice
  onClose: () => void
  onPaid: () => void
}) {
  const balance = invoice.amount_due - invoice.amount_paid
  const [form, setForm] = useState({
    amount: String(balance),
    payment_date: new Date().toISOString().slice(0, 10),
    receipt_number: '',
    payment_method: 'cash',
    notes: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apartmentAPI.createPayment({
        branch_id: branchId,
        invoice_id: invoice.id,
        amount: Number(form.amount),
        payment_date: form.payment_date,
        receipt_number: form.receipt_number,
        payment_method: form.payment_method,
        notes: form.notes,
      })
      onPaid()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Pay invoice ${invoice.invoice_number || '#' + invoice.id}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="p-2 bg-rose-50 text-rose-700 text-sm rounded">{error}</div>}
        <p className="text-sm text-slate-500">
          {invoice.tenant_name} - Room {invoice.room_code} - Balance{' '}
          <span className="font-bold text-rose-600">{new Intl.NumberFormat().format(balance)}</span>
        </p>
        <Input label="Amount *" type="number" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
        <Input label="Date" type="date" value={form.payment_date} onChange={(v) => setForm({ ...form, payment_date: v })} />
        <Input label="Receipt #" value={form.receipt_number} onChange={(v) => setForm({ ...form, receipt_number: v })} />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Method</label>
          <select
            value={form.payment_method}
            onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          >
            <option value="cash">Cash</option>
            <option value="mobile">Mobile money</option>
            <option value="bank">Bank</option>
          </select>
        </div>
        <Input label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:bg-slate-300"
        >
          {loading ? 'Saving...' : 'Record Payment'}
        </button>
      </form>
    </Modal>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-300 outline-none"
      />
    </div>
  )
}
