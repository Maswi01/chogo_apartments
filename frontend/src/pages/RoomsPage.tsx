import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import apartmentAPI, { type Contract, type Room } from '../lib/apartmentAPI'
import { useBranches } from '../context/BranchContext'
import { RenewModal, UpgradeModal, TerminateModal, cycleLabel } from '../components/ContractActionModals'

const fmt = (n: number) => new Intl.NumberFormat().format(n)

function daysLeftBadge(days?: number) {
  if (days === undefined || days === null) return null
  if (days < 0) {
    return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700">{Math.abs(days)}d overdue</span>
  }
  if (days <= 7) {
    return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700">{days}d left</span>
  }
  if (days <= 30) {
    return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">{days}d left</span>
  }
  return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">{days}d left</span>
}

export default function RoomsPage() {
  const { activeBranch } = useBranches()
  const [params] = useSearchParams()
  const status = params.get('status') || ''
  const [rooms, setRooms] = useState<Room[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [vacantRooms, setVacantRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  const [renewC, setRenewC] = useState<Contract | null>(null)
  const [upgradeC, setUpgradeC] = useState<Contract | null>(null)
  const [terminateC, setTerminateC] = useState<Contract | null>(null)

  const reload = async () => {
    if (!activeBranch) return
    setLoading(true)
    try {
      const [r, c, v] = await Promise.all([
        apartmentAPI.listRooms(activeBranch.id, status || undefined),
        status === 'occupied'
          ? apartmentAPI.listContracts(activeBranch.id, 'active')
          : Promise.resolve({ data: [] as Contract[] }),
        status === 'occupied'
          ? apartmentAPI.listRooms(activeBranch.id, 'vacant')
          : Promise.resolve({ data: [] as Room[] }),
      ])
      setRooms(r.data || [])
      setContracts(c.data || [])
      setVacantRooms(v.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranch?.id, status])

  const contractByRoom = useMemo(() => {
    const m = new Map<number, Contract>()
    for (const c of contracts) m.set(c.room_id, c)
    return m
  }, [contracts])

  const title =
    status === 'vacant' ? 'Rental Room (Vacant)' : status === 'occupied' ? 'Rented Room (Occupied)' : 'All Rooms'
  const isOccupied = status === 'occupied'

  return (
    <DashboardLayout title={title}>
      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : rooms.length === 0 ? (
        <p className="text-slate-500">No rooms in this category.</p>
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left">Room</th>
                <th className="px-3 py-2 text-left">Type</th>
                {isOccupied && <th className="px-3 py-2 text-left">Tenant</th>}
                {isOccupied && <th className="px-3 py-2 text-left">Period</th>}
                {isOccupied && <th className="px-3 py-2 text-left">Cycle</th>}
                <th className="px-3 py-2 text-right">Rent</th>
                {isOccupied && <th className="px-3 py-2 text-left">Time Left</th>}
                {!isOccupied && <th className="px-3 py-2 text-left">Status</th>}
                {isOccupied
                  ? <th className="px-3 py-2 text-right">Contract Actions</th>
                  : <th className="px-3 py-2 text-left">Notes</th>}
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => {
                const c = isOccupied ? contractByRoom.get(r.id) : undefined
                return (
                  <tr key={r.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2 font-semibold">{r.code}</td>
                    <td className="px-3 py-2">{r.room_type || '-'}</td>
                    {isOccupied && (
                      <td className="px-3 py-2">
                        {c ? (
                          <>
                            <div className="font-medium">{c.tenant_name}</div>
                            <div className="text-xs text-slate-500">{c.tenant_phone}</div>
                          </>
                        ) : <span className="text-xs text-slate-400">No active contract</span>}
                      </td>
                    )}
                    {isOccupied && (
                      <td className="px-3 py-2 text-xs">
                        {c ? <>{c.start_date}<br/>→ {c.end_date}</> : '-'}
                      </td>
                    )}
                    {isOccupied && (
                      <td className="px-3 py-2 text-xs">
                        {c ? <>
                          {cycleLabel[c.billing_cycle]}
                          <div className="text-slate-500">{fmt(c.cycle_amount || 0)}/inv</div>
                        </> : '-'}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right">{fmt(r.monthly_rent)}</td>
                    {isOccupied && (
                      <td className="px-3 py-2">{c ? daysLeftBadge(c.days_left) : '-'}</td>
                    )}
                    {!isOccupied && (
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          r.status === 'vacant' ? 'bg-emerald-100 text-emerald-700' :
                          r.status === 'occupied' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{r.status}</span>
                      </td>
                    )}
                    {isOccupied ? (
                      <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                        {c ? (
                          <>
                            <a
                              href={`/contracts/${c.id}/agreement?lang=sw`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 text-xs rounded bg-slate-700 text-white hover:bg-slate-800"
                              title="View Swahili agreement"
                            >SW</a>
                            <a
                              href={`/contracts/${c.id}/agreement?lang=en`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 text-xs rounded bg-slate-700 text-white hover:bg-slate-800"
                              title="View English agreement"
                            >EN</a>
                            <button
                              onClick={() => setRenewC(c)}
                              className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700"
                            >Renew</button>
                            <button
                              onClick={() => setUpgradeC(c)}
                              className="px-2 py-1 text-xs rounded bg-amber-600 text-white hover:bg-amber-700"
                            >Upgrade</button>
                            <button
                              onClick={() => setTerminateC(c)}
                              className="px-2 py-1 text-xs rounded bg-rose-600 text-white hover:bg-rose-700"
                            >Terminate</button>
                          </>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>
                    ) : (
                      <td className="px-3 py-2 text-slate-500">{r.notes}</td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {renewC && <RenewModal contract={renewC} onClose={() => setRenewC(null)} onDone={() => { setRenewC(null); reload() }} />}
      {upgradeC && <UpgradeModal contract={upgradeC} rooms={vacantRooms} onClose={() => setUpgradeC(null)} onDone={() => { setUpgradeC(null); reload() }} />}
      {terminateC && <TerminateModal contract={terminateC} onClose={() => setTerminateC(null)} onDone={() => { setTerminateC(null); reload() }} />}
    </DashboardLayout>
  )
}
