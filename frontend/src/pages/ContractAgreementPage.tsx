import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import apartmentAPI, { type Contract } from '../lib/apartmentAPI'
import { useBranches } from '../context/BranchContext'
import DocumentHeader from '../components/DocumentHeader'

type Lang = 'sw' | 'en'

const T = {
  sw: {
    docTitle: 'MKATABA WA MAKUBALIANO',
    bookingId: 'Booking ID',
    branch: 'Branch',
    tenantName: 'Jina la Mpangaji',
    tenantId: 'Namba ya Mpangaji',
    phone: 'Simu',
    period: 'Muda (Miezi)',
    roomNo: 'Namba ya Chumba',
    roomType: 'Aina ya Chumba',
    startDate: 'Tarehe ya Kuanza',
    endDate: 'Tarehe ya Mwisho',
    monthlyRent: 'Kodi ya Mwezi',
    cycle: 'Mzunguko wa Malipo',
    cycleAmount: 'Kiasi kwa Mzunguko',
    total: 'Jumla',
    terms: 'Masharti na Makubaliano',
    termsList: [
      'Mpangaji anakubali kutumia chumba kwa matumizi yaliyokubalika na kutunza mali za nyumba.',
      'Malipo ya kodi yatafanyika kwa mujibu wa kodi iliyooneshwa (Kodi ya Mwezi).',
      'Mpangaji haruhusiwi kuhamisha chumba kwa mtu mwingine bila idhini ya maandishi kutoka kwa mmiliki.',
      'Mkataba huu unaanza tarehe ya kuanza hadi tarehe ya mwisho, isipokuwa ukisitishwa mapema kwa makubaliano.',
      'Marekebisho/upgrade ya mkataba yatatekelezwa na ofisi na yatazingatia makubaliano mapya.',
    ],
    tenantSig: 'Sahihi ya Mpangaji',
    ownerSig: 'Sahihi ya Mmiliki / Mkurugenzi',
    name: 'Jina',
    date: 'Tarehe',
    title: 'Cheo',
    stamp: 'Muhuri',
    director: 'Mkurugenzi',
    footer: 'Hati hii ni makubaliano kati ya Mpangaji na Mmiliki',
    print: 'Chapisha',
    switchLang: 'English',
  },
  en: {
    docTitle: 'CONTRACT AGREEMENT',
    bookingId: 'Booking ID',
    branch: 'Branch',
    tenantName: 'Tenant Name',
    tenantId: 'Tenant ID',
    phone: 'Mobile No',
    period: 'Period (Months)',
    roomNo: 'Room No',
    roomType: 'Room Type',
    startDate: 'Start Date',
    endDate: 'End Date',
    monthlyRent: 'Monthly Rent',
    cycle: 'Billing Cycle',
    cycleAmount: 'Amount per Cycle',
    total: 'Total Amount',
    terms: 'Terms & Conditions',
    termsList: [
      'The tenant agrees to use the room for the agreed purpose and take care of the property.',
      'Rent payments shall be made according to the stated Monthly Rent.',
      'The tenant shall not transfer/sublet the room without written approval from the owner.',
      'This agreement is valid from the Start Date to the End Date unless terminated earlier by mutual agreement.',
      'Any upgrade/changes to this agreement shall be handled by the office under the new terms.',
    ],
    tenantSig: 'Tenant Signature',
    ownerSig: 'Owner / Director Signature',
    name: 'Name',
    date: 'Date',
    title: 'Title',
    stamp: 'Stamp',
    director: 'Director',
    footer: 'This document is an agreement between Tenant and Owner',
    print: 'Print',
    switchLang: 'Kiswahili',
  },
}

const cycleNames: Record<Contract['billing_cycle'], { sw: string; en: string }> = {
  monthly: { sw: 'Kila Mwezi', en: 'Monthly' },
  quarterly: { sw: 'Kila Miezi 3', en: 'Quarterly' },
  semi_annual: { sw: 'Kila Miezi 6', en: 'Semi-Annual' },
  annual: { sw: 'Kila Mwaka', en: 'Annual' },
}

function formatDate(s?: string): string {
  if (!s) return '____________'
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
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)))
}

export default function ContractAgreementPage() {
  const { id } = useParams<{ id: string }>()
  const [params, setParams] = useSearchParams()
  const lang: Lang = (params.get('lang') as Lang) === 'sw' ? 'sw' : 'en'
  const t = T[lang]
  const { activeBranch } = useBranches()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBranch || !id) return
    setLoading(true)
    apartmentAPI.listContracts(activeBranch.id).then((r) => {
      const found = (r.data || []).find((c) => c.id === Number(id)) || null
      setContract(found)
    }).finally(() => setLoading(false))
  }, [activeBranch?.id, id])

  const months = useMemo(
    () => contract ? monthsBetween(contract.start_date, contract.end_date) : 0,
    [contract]
  )
  const total = useMemo(
    () => contract ? (contract.monthly_rent || 0) * months : 0,
    [contract, months]
  )
  const bookingId = contract?.booking_code || (contract ? `BMFA-${String(contract.id).padStart(6, '0')}` : '')

  if (loading) return <div className="p-8 text-slate-500">Loading...</div>
  if (!contract) return <div className="p-8 text-rose-600">Contract not found</div>

  const setLang = (l: Lang) => {
    const next = new URLSearchParams(params)
    next.set('lang', l)
    setParams(next, { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white py-6 print:py-0">
      <div className="max-w-3xl mx-auto bg-white shadow print:shadow-none print:max-w-none">
        <div className="px-6 pt-4 print:hidden flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setLang('sw')}
              className={`px-3 py-1.5 text-sm rounded ${lang === 'sw' ? 'bg-cyan-700 text-white' : 'bg-slate-200'}`}
            >Kiswahili</button>
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 text-sm rounded ${lang === 'en' ? 'bg-cyan-700 text-white' : 'bg-slate-200'}`}
            >English</button>
          </div>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 text-sm rounded bg-cyan-700 text-white hover:bg-cyan-800"
          >🖨 {t.print}</button>
        </div>

        <div className="p-6 print:p-4">
          <DocumentHeader title={t.docTitle} subtitle={`${t.bookingId}: ${bookingId}   |   ${t.branch}: ${activeBranch?.name || ''}`} />

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm border border-slate-300 rounded p-4 mb-4">
            <Row label={t.tenantName} value={contract.tenant_name || ''} />
            <Row label={t.tenantId} value={contract.tenant_phone || ''} />
            <Row label={t.phone} value={contract.tenant_phone || ''} />
            <Row label={t.period} value={String(months)} />
            <Row label={t.roomNo} value={contract.room_code || ''} />
            <Row label={t.roomType} value={'-'} />
            <Row label={t.startDate} value={formatDate(contract.start_date)} />
            <Row label={t.endDate} value={formatDate(contract.end_date)} />
            <Row label={t.monthlyRent} value={Number(contract.monthly_rent || 0).toLocaleString()} />
            <Row label={t.cycle} value={cycleNames[contract.billing_cycle][lang]} />
            <Row label={t.cycleAmount} value={Number(contract.cycle_amount || 0).toLocaleString()} />
            <Row label={t.total} value={total.toLocaleString()} bold />
          </div>

          <div className="mb-6">
            <h3 className="font-bold text-slate-800 text-sm mb-2">{t.terms}</h3>
            <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1">
              {t.termsList.map((line, i) => <li key={i}>{line}</li>)}
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div className="border border-slate-300 rounded p-3">
              <p className="font-bold mb-3">{t.tenantSig}</p>
              <p className="mb-2">{t.name}: <strong>{contract.tenant_name}</strong> &nbsp; {t.date}: ____________</p>
              <p className="mb-2">{t.phone}: {contract.tenant_phone}</p>
              <p>{t.tenantId}: {contract.tenant_phone}</p>
              <div className="border-t border-slate-400 mt-8 pt-1 text-xs text-slate-500">Signature</div>
            </div>
            <div className="border border-slate-300 rounded p-3">
              <p className="font-bold mb-3">{t.ownerSig}</p>
              <p className="mb-2">{t.name}: __________________ &nbsp; {t.date}: ____________</p>
              <p className="mb-2">{t.title}: {t.director}</p>
              <p>{t.stamp}: ____________</p>
              <div className="border-t border-slate-400 mt-8 pt-1 text-xs text-slate-500">Signature</div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500 italic">{t.footer}</p>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between border-b border-slate-200 pb-1">
      <span className="text-slate-500">{label}</span>
      <span className={`text-right ${bold ? 'font-bold' : 'font-medium'}`}>{value}</span>
    </div>
  )
}
