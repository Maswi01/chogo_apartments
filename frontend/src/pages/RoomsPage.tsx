import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import apartmentAPI, { type Room } from '../lib/apartmentAPI'
import { useBranches } from '../context/BranchContext'

const fmt = (n: number) => new Intl.NumberFormat().format(n)

export default function RoomsPage() {
  const { activeBranch } = useBranches()
  const [params] = useSearchParams()
  const status = params.get('status') || ''
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBranch) return
    setLoading(true)
    apartmentAPI
      .listRooms(activeBranch.id, status || undefined)
      .then((r) => setRooms(r.data))
      .finally(() => setLoading(false))
  }, [activeBranch?.id, status])

  const title =
    status === 'vacant' ? 'Rental Room (Vacant)' : status === 'occupied' ? 'Rented Room (Occupied)' : 'All Rooms'

  return (
    <DashboardLayout title={title}>
      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : rooms.length === 0 ? (
        <p className="text-slate-500">No rooms in this category.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-right">Monthly Rent</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-semibold">{r.code}</td>
                  <td className="px-3 py-2">{r.room_type || '-'}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.monthly_rent)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.status === 'vacant'
                          ? 'bg-emerald-100 text-emerald-700'
                          : r.status === 'occupied'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  )
}
