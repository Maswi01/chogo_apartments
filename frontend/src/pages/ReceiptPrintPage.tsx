import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import headerUrl from '../assets/mwita_doc_header.png'
import apartmentAPI, { type Contract, type Invoice, type Payment } from '../lib/apartmentAPI'
import { useBranches } from '../context/BranchContext'
import { numberToWords } from '../lib/numberToWords'

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
  const days = (e.getTime() - s.getTime()) / 86400000 + 1
  return Math.max(1, Math.round(days / 30.4375))
}

export default function ReceiptPrintPage() {
  const { id } = useParams<{ id: string }>()
  const { activeBranch } = useBranches()
  const [payment, setPayment] = useState<Payment | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBranch || !id) return
    setLoading(true)
    Promise.all([
      apartmentAPI.listPayments(activeBranch.id),
      apartmentAPI.listInvoices(activeBranch.id),
      apartmentAPI.listContracts(activeBranch.id),
    ]).then(([p, i, c]) => {
      const pay = (p.data || []).find((x) => x.id === Number(id)) || null
      setPayment(pay)
      const inv = pay ? (i.data || []).find((x) => x.id === pay.invoice_id) || null : null
      setInvoice(inv)
      const ct = inv ? (c.data || []).find((x) => x.id === inv.contract_id) || null : null
      setContract(ct)
    }).finally(() => setLoading(false))
  }, [activeBranch?.id, id])

  const months = useMemo(
    () => invoice ? monthsBetween(invoice.period_start, invoice.period_end) : 0,
    [invoice]
  )
  const words = useMemo(() => numberToWords(payment?.amount || 0), [payment])

  if (loading) return <div className="p-8 text-slate-500">Loading...</div>
  if (!payment) return <div className="p-8 text-rose-600">Payment not found</div>

  const receiptNo = payment.receipt_number || `MFA-${String(payment.id).padStart(6, '0')}`
  const bookingId = contract?.booking_code || (contract ? `BMFA-${String(contract.id).padStart(6, '0')}` : '-')
  const method = (payment.payment_method || 'CASH').toUpperCase()
  const titleMethodLabel = method === 'CASH' ? 'CASH PAYMENT RECEIPT' : `${method} PAYMENT RECEIPT`

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

          <h1 className="text-center font-bold underline text-base mb-3">{titleMethodLabel}</h1>

          <table className="w-full text-[12px] border-collapse mb-4 print-table">
            <tbody>
              <tr>
                <Cell>Receipt No: <strong>{receiptNo}</strong></Cell>
                <Cell>Booking ID: <strong>{bookingId}</strong></Cell>
                <Cell>Payment: <strong>{method}</strong></Cell>
                <Cell>Date: <strong>{formatDate(payment.payment_date)}</strong></Cell>
              </tr>
              <tr>
                <Cell>Tenant: <strong>{(payment.tenant_name || invoice?.tenant_name || '').toUpperCase()}</strong></Cell>
                <Cell>Room No: <strong>{payment.room_code || invoice?.room_code || '-'}</strong></Cell>
                <Cell>Mobile: <strong>{contract?.tenant_phone || '-'}</strong></Cell>
                <Cell>&nbsp;</Cell>
              </tr>
            </tbody>
          </table>

          <p className="text-[12px] mb-2">
            The sum of Shillings &nbsp;<strong>{fmt(payment.amount)} /=</strong>&nbsp; ({words})
          </p>
          {invoice && (
            <p className="text-[12px] mb-2">
              Being payment of rent for <strong className="underline">{months} month(s) from {formatDate(invoice.period_start)} to {formatDate(invoice.period_end)}</strong>
            </p>
          )}
          {payment.notes && (
            <p className="text-[12px] mb-2 text-slate-600">Notes: {payment.notes}</p>
          )}

          <div className="mt-16 flex justify-end">
            <div className="text-center text-[12px]">
              <div className="border-t border-slate-700 px-12 pt-1 font-semibold">{activeBranch?.name?.includes('Mwita') ? activeBranch.name : 'Grace Bhoke Mwita'}</div>
            </div>
          </div>
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

const printStyles = `
@media print {
  @page { size: A4; margin: 12mm; }
  body { background: white !important; }
  .print-table th, .print-table td { border-color: #000 !important; }
}
`
