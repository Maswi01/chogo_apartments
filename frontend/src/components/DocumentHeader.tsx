import headerUrl from '../assets/mwita_doc_header.png'
import { useBranches } from '../context/BranchContext'

interface DocumentHeaderProps {
  title: string
  subtitle?: string
  /** Optional date range or period printed under the title */
  period?: string
}

export default function DocumentHeader({ title, subtitle, period }: DocumentHeaderProps) {
  const { activeBranch } = useBranches()
  const printedAt = new Date().toLocaleString()

  return (
    <div className="document-header bg-white border rounded-md overflow-hidden mb-4 print:rounded-none print:border-0 print:shadow-none print:mb-2">
      <img
        src={headerUrl}
        alt="Mwita Family Apartment Limited"
        className="block w-full h-auto"
      />
      <div className="px-6 py-3 border-t flex flex-wrap items-end justify-between gap-2 print:px-2 print:py-1">
        <div>
          <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          {period && <p className="text-xs text-slate-500">Period: {period}</p>}
        </div>
        <div className="text-right text-xs text-slate-500">
          {activeBranch && <div>Branch: <span className="font-semibold text-slate-700">{activeBranch.name}</span></div>}
          <div>Printed: {printedAt}</div>
        </div>
      </div>
      <div className="px-6 pb-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="text-xs px-3 py-1.5 bg-cyan-700 text-white rounded hover:bg-cyan-800"
        >
          🖨 Print / Save as PDF
        </button>
      </div>
    </div>
  )
}
