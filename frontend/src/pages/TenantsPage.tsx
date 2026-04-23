import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import apartmentAPI, { type Contract, type Tenant } from '../lib/apartmentAPI'
import { useBranches } from '../context/BranchContext'

export default function TenantsPage() {
  const { activeBranch } = useBranches()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'' | 'individual' | 'institution'>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBranch) return
    setLoading(true)
    Promise.all([
      apartmentAPI.listTenants(activeBranch.id),
      apartmentAPI.listContracts(activeBranch.id, 'active'),
    ]).then(([t, c]) => {
      setTenants(t.data || [])
      setContracts(c.data || [])
    }).finally(() => setLoading(false))
  }, [activeBranch?.id])

  const activeByTenant = useMemo(() => {
    const m = new Map<number, Contract>()
    for (const c of contracts) m.set(c.tenant_id, c)
    return m
  }, [contracts])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tenants.filter((t) => {
      if (typeFilter && t.tenant_type !== typeFilter) return false
      if (!q) return true
      return (
        t.full_name.toLowerCase().includes(q) ||
        (t.organization_name || '').toLowerCase().includes(q) ||
        (t.phone || '').toLowerCase().includes(q) ||
        (t.email || '').toLowerCase().includes(q) ||
        (t.id_number || '').toLowerCase().includes(q)
      )
    })
  }, [tenants, search, typeFilter])

  return (
    <DashboardLayout title="Tenants">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, email, ID..."
          className="flex-1 min-w-[220px] px-3 py-2 border border-slate-300 rounded text-sm"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="px-3 py-2 border border-slate-300 rounded text-sm"
        >
          <option value="">All Types</option>
          <option value="individual">👤 Individuals</option>
          <option value="institution">🏢 Institutions</option>
        </select>
        <Link
          to="/tenants/new"
          className="px-3 py-2 text-sm rounded bg-sky-600 text-white hover:bg-sky-700"
        >+ New Tenant</Link>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500">No tenants found.</p>
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Contact</th>
                <th className="px-3 py-2 text-left">ID / Reg</th>
                <th className="px-3 py-2 text-left">Active Contract</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const c = activeByTenant.get(t.id)
                return (
                  <tr key={t.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2">
                      {t.tenant_type === 'institution'
                        ? <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700">🏢 INST</span>
                        : <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">👤 IND</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{t.full_name}</div>
                      {t.tenant_type === 'institution' && (
                        <div className="text-xs text-slate-500">
                          {t.organization_name}{t.contact_person ? ` · ${t.contact_person}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div>{t.phone || '-'}</div>
                      <div className="text-slate-500">{t.email}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">{t.id_number || '-'}</td>
                    <td className="px-3 py-2 text-xs">
                      {c ? (
                        <>
                          <div className="font-medium">Room {c.room_code}</div>
                          <div className="text-slate-500">until {c.end_date}</div>
                        </>
                      ) : <span className="text-slate-400">No active contract</span>}
                    </td>
                    <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                      {!c && (
                        <Link
                          to={`/tenants/new?existing=${t.id}`}
                          className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700"
                          title="Allocate a room for this tenant"
                        >Rent Room</Link>
                      )}
                      {c && (
                        <Link
                          to="/rooms?status=occupied"
                          className="px-2 py-1 text-xs rounded bg-slate-700 text-white hover:bg-slate-800"
                        >Manage</Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  )
}
