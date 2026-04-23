import { useState } from 'react'
import apartmentAPI, { type Contract, type Room } from '../lib/apartmentAPI'

export type Cycle = Contract['billing_cycle']

export const cycleLabel: Record<Cycle, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
}

export function cycleMonths(c: Cycle): number {
  return c === 'quarterly' ? 3 : c === 'semi_annual' ? 6 : c === 'annual' ? 12 : 1
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
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

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded" />
    </div>
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

export function RenewModal({ contract, onClose, onDone }: { contract: Contract; onClose: () => void; onDone: () => void }) {
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
    } finally { setBusy(false) }
  }

  const perInvoice = (Number(form.monthly_rent) || 0) * cycleMonths(form.billing_cycle)

  return (
    <Modal title={`Renew Contract #${contract.id}`} onClose={onClose}>
      <div className="space-y-3">
        {err && <div className="p-2 bg-rose-50 text-rose-700 text-sm rounded">{err}</div>}
        <p className="text-sm text-slate-600">
          New contract starts the day after current end date (<strong>{contract.end_date}</strong>).
        </p>
        <Field label="New End Date *" type="date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
        <Field label="Monthly Rent" type="number" value={form.monthly_rent} onChange={(v) => setForm({ ...form, monthly_rent: v })} />
        <Field label="Deposit" type="number" value={form.deposit} onChange={(v) => setForm({ ...form, deposit: v })} />
        <CycleSelect value={form.billing_cycle} onChange={(v) => setForm({ ...form, billing_cycle: v })} />
        <div className="text-xs text-slate-600 bg-sky-50 border border-sky-200 px-2 py-1.5 rounded">
          Each invoice ≈ <strong>{perInvoice.toLocaleString()}</strong> TZS
        </div>
        <Field label="Booking Code" value={form.booking_code} onChange={(v) => setForm({ ...form, booking_code: v })} />
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

export function UpgradeModal({ contract, rooms, onClose, onDone }: { contract: Contract; rooms: Room[]; onClose: () => void; onDone: () => void }) {
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
    } finally { setBusy(false) }
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
        <Field label="Effective Date *" type="date" value={form.effective_date} onChange={(v) => setForm({ ...form, effective_date: v })} />
        <Field label="New End Date *" type="date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
        <Field label="Monthly Rent" type="number" value={form.monthly_rent} onChange={(v) => setForm({ ...form, monthly_rent: v })} />
        <Field label="Additional Deposit" type="number" value={form.deposit} onChange={(v) => setForm({ ...form, deposit: v })} />
        <CycleSelect value={form.billing_cycle} onChange={(v) => setForm({ ...form, billing_cycle: v })} />
        <div className="text-xs text-slate-600 bg-sky-50 border border-sky-200 px-2 py-1.5 rounded">
          Each invoice ≈ <strong>{perInvoice.toLocaleString()}</strong> TZS
        </div>
        <Field label="Booking Code" value={form.booking_code} onChange={(v) => setForm({ ...form, booking_code: v })} />
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

export function TerminateModal({ contract, onClose, onDone }: { contract: Contract; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    end_date: new Date().toISOString().slice(0, 10),
    reason: '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [confirmText, setConfirmText] = useState('')

  const submit = async () => {
    if (confirmText.trim().toUpperCase() !== 'TERMINATE') {
      setErr('Type TERMINATE to confirm'); return
    }
    setBusy(true); setErr('')
    try {
      await apartmentAPI.terminateContract(contract.id, {
        end_date: form.end_date,
        reason: form.reason,
      })
      onDone()
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Termination failed')
    } finally { setBusy(false) }
  }

  return (
    <Modal title={`Terminate Contract #${contract.id}`} onClose={onClose}>
      <div className="space-y-3">
        {err && <div className="p-2 bg-rose-50 text-rose-700 text-sm rounded">{err}</div>}
        <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded">
          This will end the contract for <strong>{contract.tenant_name}</strong> in room <strong>{contract.room_code}</strong>,
          mark the room as <strong>vacant</strong>, and void any future unpaid invoices.
        </div>
        <Field label="Termination Date *" type="date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
          <textarea
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded"
          />
        </div>
        <Field label='Type "TERMINATE" to confirm' value={confirmText} onChange={setConfirmText} />
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm rounded bg-slate-100 hover:bg-slate-200">Cancel</button>
          <button onClick={submit} disabled={busy} className="px-4 py-1.5 text-sm rounded bg-rose-600 text-white hover:bg-rose-700 disabled:bg-slate-300">
            {busy ? 'Working...' : 'Terminate'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
