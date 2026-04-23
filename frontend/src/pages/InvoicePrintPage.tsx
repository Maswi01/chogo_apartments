import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import headerUrl from '../assets/mwita_doc_header.png'
import apartmentAPI, { type Contract, type Invoice, type Payment } from '../lib/apartmentAPI'
import { useBranches } from '../context/BranchContext'

const fmt = (n: number) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function formatDate(s?: string): string {
  if (!s) return '-'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

function monthsBetween(start: string, end: string): number {
  if (!start || !end) return 0
  const s = new Date(start), e = new Date(end)
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0
  // +1 day so 30/12 → 30/06 counts as 6 months, matching how billing periods are stored
  // (period_end is inclusive of the last day before next cycle).
  const days = (e.getTime() - s.getTime()) / 86400000 + 1
  return Math.max(1, Math.round(days / 30.4375))
}

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>()
  const { activeBranch } = useBranches()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [contract, setContract] = useState<Contract | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBranch || !id) return
    setLoading(true)
    Promise.all([
      apartmentAPI.listInvoices(activeBranch.id),
      apartmentAPI.listContracts(activeBranch.id),
      apartmentAPI.listPayments(activeBranch.id),
    ]).then(([i, c, p]) => {
      const inv = (i.data || []).find((x) => x.id === Number(id)) || null
      setInvoice(inv)
      const ct = inv ? (c.data || []).find((x) => x.id === inv.contract_id) || null : null
      setContract(ct)
      const pays = (p.data || []).filter((x) => x.invoice_id === Number(id))
      setPayments(pays)
    }).finally(() => setLoading(false))
  }, [activeBranch?.id, id])

  const months = useMemo(
    () => invoice ? monthsBetween(invoice.period_start, invoice.period_end) : 0,
    [invoice]
  )
  const monthlyPrice = useMemo(() => {
    if (!invoice) return 0
    if (months > 0) return Math.round(invoice.amount_due / months)
    return contract?.monthly_rent || 0
  }, [invoice, contract, months])
  const lastPayment = useMemo(() => {
    if (!payments.length) return null
    const sorted = [...payments].sort((a, b) =>
      (b.payment_date || '').localeCompare(a.payment_date || '')
    )
    return sorted[0]
  }, [payments])

  if (loading) return <div className="p-8 text-slate-500">Loading...</div>
  if (!invoice) return <div className="p-8 text-rose-600">Invoice not found</div>

  const bookingId = contract?.booking_code || (contract ? `BMFA-${String(contract.id).padStart(6, '0')}` : '-')
  const status = invoice.status === 'paid' ? 'PAID' : invoice.status === 'partial' ? 'PARTIAL' : invoice.status === 'void' ? 'VOID' : 'UNPAID'
  const balance = (invoice.amount_due || 0) - (invoice.amount_paid || 0)

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white py-6 print:py-0 print:m-0">
      <div className="max-w-3xl mx-auto bg-white shadow print:shadow-none print:max-w-none">
        <div className="px-6 pt-4 print:hidden flex items-center justify-end">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 text-sm rounded bg-cyan-700 text-white hover:bg-cyan-800"
          >🖨 Print / Save as PDF</button>
        </div>

        <div className="p-6 print:p-4">
          <img src={headerUrl} alt="Mwita Family Apartment Limited" className="block w-full h-auto mb-4 print:mb-3" />

          <h1 className="text-center font-bold underline text-base mb-3">PROFORMA INVOICE</h1>

          <table className="w-full text-[12px] border-collapse mb-0 print-table">
            <tbody>
              <tr>
                <Cell>Booking ID: <strong>{bookingId}</strong></Cell>
                <Cell>Receipt No: <strong>{lastPayment?.receipt_number || '-'}</strong></Cell>
                <Cell>Status: <strong>{status}</strong></Cell>
                <Cell>Date: <strong>{formatDate(invoice.created_at || invoice.period_start)}</strong></Cell>
              </tr>
              <tr>
                <Cell>Tenant: <strong>{(invoice.tenant_name || '').toUpperCase()}</strong></Cell>
                <Cell>Tenant ID: <strong>{contract?.tenant_phone || '-'}</strong></Cell>
                <Cell>Mobile: <strong>{contract?.tenant_phone || '-'}</strong></Cell>
                <Cell>Payment: <strong>{(lastPayment?.payment_method || '-').toUpperCase()}</strong> (Last: <strong>{formatDate(lastPayment?.payment_date)}</strong>)</Cell>
              </tr>
              <tr>
                <Cell>Room: <strong>{invoice.room_code || contract?.room_code || '-'}</strong></Cell>
                <Cell colSpan={2}>Period: <strong>{formatDate(invoice.period_start)}</strong> to <strong>{formatDate(invoice.period_end)}</strong></Cell>
                <Cell>Months: <strong>{months}</strong></Cell>
              </tr>
              <tr>
                <Cell colSpan={2}>Monthly Price: <strong>{fmt(monthlyPrice)}</strong></Cell>
                <Cell colSpan={2}>Due Date: <strong>{formatDate(invoice.due_date)}</strong></Cell>
              </tr>
            </tbody>
          </table>

          <table className="w-full text-[12px] border-collapse mt-2 print-table">
            <thead className="bg-slate-100">
              <tr>
                <Th className="w-8 text-left">#</Th>
                <Th className="text-left">Description</Th>
                <Th className="text-right w-16">Qty</Th>
                <Th className="text-right w-28 bg-slate-200">Unit Price</Th>
                <Th className="text-right w-32 bg-slate-200">Amount</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Cell className="text-left align-top">1</Cell>
                <Cell className="text-left align-top">
                  Room Rent - Room <strong>{invoice.room_code || contract?.room_code || '-'}</strong>
                  <div className="text-slate-500">({formatDate(invoice.period_start)} to {formatDate(invoice.period_end)})</div>
                </Cell>
                <Cell className="text-right align-top">{months}</Cell>
                <Cell className="text-right align-top">{fmt(monthlyPrice)}</Cell>
                <Cell className="text-right align-top">{fmt(invoice.amount_due)}</Cell>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-end mt-3">
            <table className="text-[12px] border-collapse print-table w-72">
              <tbody>
                <tr>
                  <Cell className="font-semibold bg-slate-100">Total</Cell>
                  <Cell className="text-right">{fmt(invoice.amount_due)}</Cell>
                </tr>
                <tr>
                  <Cell className="font-semibold bg-slate-100">Prepaid</Cell>
                  <Cell className="text-right">{fmt(invoice.amount_paid)}</Cell>
                </tr>
                <tr>
                  <Cell className="font-semibold bg-slate-100">Balance</Cell>
                  <Cell className="text-right font-bold">{fmt(balance)}</Cell>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-[11px]"><strong>Note:</strong> This is a Proforma Invoice. Payment status updates automatically based on receipts.</p>
        </div>
      </div>

      <style>{printStyles}</style>
    </div>
  )
}

function Cell({ children, colSpan, className = '' }: { children?: React.ReactNode; colSpan?: number; className?: string }) {
  return (
    <td colSpan={colSpan} className={`border border-slate-400 px-2 py-1.5 align-middle ${className}`}>{children}</td>
  )
}
function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`border border-slate-400 px-2 py-1.5 font-semibold ${className}`}>{children}</th>
  )
}

const printStyles = `
@media print {
  @page { size: A4; margin: 12mm; }
  body { background: white !important; }
  .print-table th, .print-table td { border-color: #000 !important; }
}
`
