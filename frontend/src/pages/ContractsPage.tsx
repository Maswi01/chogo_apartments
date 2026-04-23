import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import apartmentAPI, { type Contract, type Room } from '../lib/apartmentAPI'
import { useBranches } from '../context/BranchContext'

type Cycle = Contract['billing_cycle']

const cycleLabel: Record<Cycle, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
}

function cycleMonths(c: Cycle): number {
  return c === 'quarterly' ? 3 : c === 'semi_annual' ? 6 : c === 'annual' ? 12 : 1
}

export default function ContractsPage() {
  const { activeBranch } = useBranches()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [renewTarget, setRenewTarget] = useState<Contract | null>(null)
  const [upgradeTarget, setUpgradeTarget] = useState<Contract | null>(null)

  const load = async () => {
    if (!activeBranch) return
    setLoading(true)
    try {
      const [c, r] = await Promise.all([
        apartmentAPI.listContracts(activeBranch.id, statusFilter || undefined),
        apartmentAPI.listRooms(activeBranch.id, 'vacant'),
      ])
      setContracts(c.data || [])
      setRooms(r.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [activeBranch?.id, statusFilter])

  return (
    <DashboardLayout title="Contracts">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="text-sm text-slate-700">Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="terminated">Terminated</option>
          <option value="renewed">Renewed</option>
          <option value="upgraded">Upgraded</option>
        </select>
        <button onClick={load} className="ml-auto px-3 py-1.5 text-sm rounded bg-slate-100 hover:bg-slate-200">
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">#</th>
              <th className="text-left px-3 py-2">Tenant</th>
              <th className="text-left px-3 py-2">Room</th>
              <th className="text-left px-3 py-2">Period</th>
              <th className="text-left px-3 py-2">Cycle</th>
              <th className="text-right px-3 py-2">Rent</th>
              <th className="text-right px-3 py-2">Per Invoice</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="px-3 py-4 text-center text-slate-500">Loading...</td></tr>
            )}
            {!loading && contracts.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-4 text-center text-slate-500">No contracts found</td></tr>
            )}
            {contracts.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{c.id}{c.parent_contract_id ? <span className="ml-1 text-xs text-slate-400">←{c.parent_contract_id}</span> : null}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{c.tenant_name}</div>
                  <div className="text-xs text-slate-500">{c.tenant_phone}</div>
                </td>
                <td className="px-3 py-2">{c.room_code}</td>
                <td className="px-3 py-2 text-xs">
                  {c.start_date}<br/>→ {c.end_date}
                </td>
                <td className="px-3 py-2">{cycleLabel[c.billing_cycle]}</td>
                <td className="px-3 py-2 text-right">{c.monthly_rent?.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{c.cycle_amount?.toLocaleString()}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                  {c.status === 'active' && (
                    <>
                      <button
                        onClick={() => setRenewTarget(c)}
                        className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Renew
                      </button>
                      <button
                        onClick={() => setUpgradeTarget(c)}
                        className="px-2 py-1 text-xs rounded bg-amber-600 text-white hover:bg-amber-700"
                      >
                        Upgrade
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {renewTarget && (
        <RenewModal
          contract={renewTarget}
          onClose={() => setRenewTarget(null)}
          onDone={() => { setRenewTarget(null); load() }}
        />
      )}
      {upgradeTarget && (
        <UpgradeModal
          contract={upgradeTarget}
          rooms={rooms}
          onClose={() => setUpgradeTarget(null)}
          onDone={() => { setUpgradeTarget(null); load() }}
        />
      )}
    </DashboardLayout>
  )
}

function StatusBadge({ status }: { status: Contract['status'] }) {
  const styles: Record<Contract['status'], string> = {
    active: 'bg-emerald-100 text-emerald-700',
    expired: 'bg-slate-200 text-slate-700',
    terminated: 'bg-rose-100 text-rose-700',
    renewed: 'bg-sky-100 text-sky-700',
    upgraded: 'bg-amber-100 text-amber-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  )
}

function RenewModal({ contract, onClose, onDone }: { contract: Contract; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    end_date: '',
    monthly_rent: String(contract.monthly_rent || ''),
    deposit: '',
    billing_cycle: contract.billing_cycle as Cycle,
    booking_code: '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    if (!form.end_date) { setErr('End date required'); return }
    setBusy(true); setErr('')
    try {
      await apartmentAPI.renewContract(contract.id, {
        end_date: form.end_date,
        monthly_rent: Number(form.monthly_rent) || undefined,
        deposit: Number(form.deposit) || undefined,
        billing_cycle: form.billing_cycle,
        booking_code: form.booking_code || undefined,
      })
      onDone()
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Renewal failed')
    } finally {
      setBusy(false)
    }
  }

  const perInvoice = (Number(form.monthly_rent) || 0) * cycleMonths(form.billing_cycle)

  return (
    <Modal title={`Renew Contract #${contract.id}`} onClose={onClose}>
      <div className="space-y-3">
        {err && <div className="p-2 bg-rose-50 text-rose-700 text-sm rounded">{err}</div>}
        <p className="text-sm text-slate-600">
          New contract starts the day after current end date (<strong>{contract.end_date}</strong>).
        </p>
        <ModalField label="New End Date *" type="date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
        <ModalField label="Monthly Rent" type="number" value={form.monthly_rent} onChange={(v) => setForm({ ...form, monthly_rent: v })} />
        <ModalField label="Deposit" type="number" value={form.deposit} onChange={(v) => setForm({ ...form, deposit: v })} />
        <CycleSelect value={form.billing_cycle} onChange={(v) => setForm({ ...form, billing_cycle: v })} />
        <div className="text-xs text-slate-600 bg-sky-50 border border-sky-200 px-2 py-1.5 rounded">
          Each invoice ≈ <strong>{perInvoice.toLocaleString()}</strong> TZS
        </div>
        <ModalField label="Booking Code" value={form.booking_code} onChange={(v) => setForm({ ...form, booking_code: v })} />
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm rounded bg-slate-100 hover:bg-slate-200">Cancel</button>
          <button onClick={submit} disabled={busy} className="px-4 py-1.5 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300">
            {busy ? 'Saving...' : 'Renew'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function UpgradeModal({ contract, rooms, onClose, onDone }: { contract: Contract; rooms: Room[]; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    new_room_id: String(contract.room_id),
    effective_date: new Date().toISOString().slice(0, 10),
    end_date: contract.end_date || '',
    monthly_rent: String(contract.monthly_rent || ''),
    deposit: '',
    billing_cycle: contract.billing_cycle as Cycle,
    booking_code: '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const onRoom = (id: string) => {
    const r = rooms.find((rm) => rm.id === Number(id))
    setForm((f) => ({ ...f, new_room_id: id, monthly_rent: r ? String(r.monthly_rent) : f.monthly_rent }))
  }

  const submit = async () => {
    if (!form.new_room_id || !form.effective_date || !form.end_date) {
      setErr('Room, effective date, and end date required'); return
    }
    setBusy(true); setErr('')
    try {
      await apartmentAPI.upgradeContract(contract.id, {
        new_room_id: Number(form.new_room_id),
        effective_date: form.effective_date,
        end_date: form.end_date,
        monthly_rent: Number(form.monthly_rent) || undefined,
        deposit: Number(form.deposit) || undefined,
        billing_cycle: form.billing_cycle,
        booking_code: form.booking_code || undefined,
      })
      onDone()
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Upgrade failed')
    } finally {
      setBusy(false)
    }
  }

  const perInvoice = (Number(form.monthly_rent) || 0) * cycleMonths(form.billing_cycle)

  return (
    <Modal title={`Upgrade Contract #${contract.id}`} onClose={onClose}>
      <div className="space-y-3">
        {err && <div className="p-2 bg-rose-50 text-rose-700 text-sm rounded">{err}</div>}
        <p className="text-sm text-slate-600">
          Current room <strong>{contract.room_code}</strong>. The old contract will be terminated and unpaid future invoices voided.
        </p>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">New Room *</label>
          <select value={form.new_room_id} onChange={(e) => onRoom(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded">
            <option value={contract.room_id}>Keep {contract.room_code} (rent change only)</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.code} - {r.room_type} ({r.monthly_rent})</option>
            ))}
          </select>
        </div>
        <ModalField label="Effective Date *" type="date" value={form.effective_date} onChange={(v) => setForm({ ...form, effective_date: v })} />
        <ModalField label="New End Date *" type="date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
        <ModalField label="Monthly Rent" type="number" value={form.monthly_rent} onChange={(v) => setForm({ ...form, monthly_rent: v })} />
        <ModalField label="Additional Deposit" type="number" value={form.deposit} onChange={(v) => setForm({ ...form, deposit: v })} />
        <CycleSelect value={form.billing_cycle} onChange={(v) => setForm({ ...form, billing_cycle: v })} />
        <div className="text-xs text-slate-600 bg-sky-50 border border-sky-200 px-2 py-1.5 rounded">
          Each invoice ≈ <strong>{perInvoice.toLocaleString()}</strong> TZS
        </div>
        <ModalField label="Booking Code" value={form.booking_code} onChange={(v) => setForm({ ...form, booking_code: v })} />
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm rounded bg-slate-100 hover:bg-slate-200">Cancel</button>
          <button onClick={submit} disabled={busy} className="px-4 py-1.5 text-sm rounded bg-amber-600 text-white hover:bg-amber-700 disabled:bg-slate-300">
            {busy ? 'Saving...' : 'Upgrade'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CycleSelect({ value, onChange }: { value: Cycle; onChange: (v: Cycle) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">Billing Cycle</label>
      <select value={value} onChange={(e) => onChange(e.target.value as Cycle)} className="w-full px-3 py-2 border border-slate-300 rounded">
        <option value="monthly">Monthly</option>
        <option value="quarterly">Quarterly</option>
        <option value="semi_annual">Semi-Annual</option>
        <option value="annual">Annual</option>
      </select>
    </div>
  )
}

function ModalField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded" />
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-md w-full p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
