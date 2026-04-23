import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import apartmentAPI, { type Room, type Tenant } from '../lib/apartmentAPI'
import { useBranches } from '../context/BranchContext'

export default function AddTenantPage() {
  const { activeBranch } = useBranches()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const preRoomId = params.get('room') || ''
  const existingTenantId = params.get('existing') || ''
  const [rooms, setRooms] = useState<Room[]>([])
  const [existingTenant, setExistingTenant] = useState<Tenant | null>(null)
  const [tenantOptions, setTenantOptions] = useState<Tenant[]>([])
  // When entering via a Room shortcut, default to picking an existing tenant.
  const [tenantMode, setTenantMode] = useState<'existing' | 'new'>(
    preRoomId && !existingTenantId ? 'existing' : 'new'
  )
  const [createContract, setCreateContract] = useState<boolean>(!!preRoomId || !!existingTenantId)
  const [form, setForm] = useState({
    tenant_type: 'individual' as 'individual' | 'institution',
    organization_name: '',
    contact_person: '',
    full_name: '',
    phone: '',
    email: '',
    id_number: '',
    room_id: preRoomId,
    booking_code: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    monthly_rent: '',
    deposit: '',
    billing_cycle: 'monthly' as 'monthly' | 'quarterly' | 'semi_annual' | 'annual',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeBranch) return
    apartmentAPI.listRooms(activeBranch.id, 'vacant').then((r) => {
      setRooms(r.data)
      if (preRoomId) {
        const room = r.data.find((rm) => rm.id === Number(preRoomId))
        if (room) {
          setForm((f) => ({ ...f, monthly_rent: String(room.monthly_rent) }))
        }
      }
    })
  }, [activeBranch?.id, preRoomId])

  useEffect(() => {
    if (!activeBranch || !existingTenantId) return
    apartmentAPI.listTenants(activeBranch.id).then((r) => {
      const t = (r.data || []).find((x) => x.id === Number(existingTenantId))
      if (!t) return
      setExistingTenant(t)
      setForm((f) => ({
        ...f,
        tenant_type: t.tenant_type,
        organization_name: t.organization_name || '',
        contact_person: t.contact_person || '',
        full_name: t.full_name,
        phone: t.phone || '',
        email: t.email || '',
        id_number: t.id_number || '',
      }))
    })
  }, [activeBranch?.id, existingTenantId])

  // Load tenants list for the in-page chooser when arriving via Room shortcut.
  useEffect(() => {
    if (!activeBranch || !preRoomId || existingTenantId) return
    apartmentAPI.listTenants(activeBranch.id).then((r) => {
      setTenantOptions(r.data || [])
    })
  }, [activeBranch?.id, preRoomId, existingTenantId])

  const pickExistingTenant = (id: string) => {
    if (!id) {
      setExistingTenant(null)
      return
    }
    const t = tenantOptions.find((x) => x.id === Number(id))
    if (!t) return
    setExistingTenant(t)
    setForm((f) => ({
      ...f,
      tenant_type: t.tenant_type,
      organization_name: t.organization_name || '',
      contact_person: t.contact_person || '',
      full_name: t.full_name,
      phone: t.phone || '',
      email: t.email || '',
      id_number: t.id_number || '',
    }))
  }

  const onRoomChange = (id: string) => {
    const room = rooms.find((r) => r.id === Number(id))
    setForm((f) => ({
      ...f,
      room_id: id,
      monthly_rent: room ? String(room.monthly_rent) : f.monthly_rent,
    }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeBranch) return
    setError('')
    if (!form.full_name.trim()) {
      setError('Full name is required')
      return
    }
    if (form.tenant_type === 'institution' && !form.organization_name.trim()) {
      setError('Organization name is required for institutions')
      return
    }
    if (createContract) {
      if (!form.room_id || !form.start_date || !form.end_date) {
        setError('Room, start and end dates are required to create a contract')
        return
      }
    }
    setLoading(true)
    try {
      let tenantId: number
      if (existingTenant) {
        tenantId = existingTenant.id
      } else {
        const tenantRes = await apartmentAPI.createTenant({
          branch_id: activeBranch.id,
          full_name: form.full_name.trim(),
          tenant_type: form.tenant_type,
          organization_name: form.organization_name.trim(),
          contact_person: form.contact_person.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          id_number: form.id_number.trim(),
        })
        tenantId = tenantRes.data.id
      }
      if (createContract) {
        await apartmentAPI.createContract({
          branch_id: activeBranch.id,
          tenant_id: tenantId,
          room_id: Number(form.room_id),
          booking_code: form.booking_code.trim(),
          start_date: form.start_date,
          end_date: form.end_date,
          monthly_rent: Number(form.monthly_rent) || 0,
          deposit: Number(form.deposit) || 0,
          billing_cycle: form.billing_cycle,
        })
        navigate('/rooms?status=occupied')
      } else {
        navigate('/tenants')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register tenant')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title={existingTenant ? `Rent Room — ${existingTenant.full_name}` : createContract ? 'Register Tenant & Rent Room' : 'Register Tenant'}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        {error && (
          <div className="md:col-span-2 p-3 bg-rose-50 border border-rose-200 rounded text-sm text-rose-700">
            {error}
          </div>
        )}
        {preRoomId && !existingTenantId && (
          <div className="md:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-700">Tenant:</span>
              <button
                type="button"
                onClick={() => { setTenantMode('existing') }}
                className={`px-3 py-1.5 rounded text-sm font-medium border ${tenantMode === 'existing' ? 'bg-cyan-700 text-white border-cyan-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
              >
                Existing tenant
              </button>
              <button
                type="button"
                onClick={() => { setTenantMode('new'); setExistingTenant(null) }}
                className={`px-3 py-1.5 rounded text-sm font-medium border ${tenantMode === 'new' ? 'bg-cyan-700 text-white border-cyan-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
              >
                + Create new tenant
              </button>
            </div>
            {tenantMode === 'existing' && (
              <select
                value={existingTenant?.id ?? ''}
                onChange={(e) => pickExistingTenant(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-sky-300 bg-white"
              >
                <option value="">— Choose tenant —</option>
                {tenantOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tenant_type === 'institution' ? '🏢' : '👤'} {t.full_name}
                    {t.organization_name ? ` (${t.organization_name})` : ''}
                    {t.phone ? ` · ${t.phone}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
        {existingTenant ? (
          <div className="md:col-span-2 p-3 bg-sky-50 border border-sky-200 rounded text-sm">
            Renting for existing tenant: <strong>{existingTenant.full_name}</strong>
            {existingTenant.tenant_type === 'institution' && existingTenant.organization_name && (
              <span className="text-slate-600"> ({existingTenant.organization_name})</span>
            )}
            <span className="text-slate-500"> · {existingTenant.phone}</span>
          </div>
        ) : (
          <>
            <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">Tenant Type *</label>
          <div className="flex gap-2">
            {(['individual', 'institution'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setForm({ ...form, tenant_type: opt })}
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                  form.tenant_type === opt
                    ? 'bg-cyan-700 text-white border-cyan-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {opt === 'individual' ? '👤 Individual' : '🏢 Institution'}
              </button>
            ))}
          </div>
        </div>
        {form.tenant_type === 'institution' && (
          <>
            <Field label="Organization Name *" value={form.organization_name} onChange={(v) => setForm({ ...form, organization_name: v })} />
            <Field label="Contact Person" value={form.contact_person} onChange={(v) => setForm({ ...form, contact_person: v })} />
          </>
        )}
        <Field
          label={form.tenant_type === 'institution' ? 'Display / Legal Name *' : 'Full Name *'}
          value={form.full_name}
          onChange={(v) => setForm({ ...form, full_name: v })}
        />
        <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="ID Number / Reg. No." value={form.id_number} onChange={(v) => setForm({ ...form, id_number: v })} />
          </>
        )}

        {!existingTenant && (
        <div className="md:col-span-2 mt-2 border-t pt-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={createContract}
              onChange={(e) => setCreateContract(e.target.checked)}
              className="w-4 h-4"
            />
            Allocate a room and create a contract now
          </label>
          <p className="text-xs text-slate-500 mt-1 pl-6">
            Leave unchecked to register the tenant only — you can rent a room later from the Rental Room list.
          </p>
        </div>
        )}

        {createContract && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Room *</label>
              <select
                value={form.room_id}
                onChange={(e) => onRoomChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-sky-300"
              >
                <option value="">Select vacant room</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.room_type || 'room'} ({r.monthly_rent})
                  </option>
                ))}
              </select>
            </div>
            <Field label="Booking Code" value={form.booking_code} onChange={(v) => setForm({ ...form, booking_code: v })} />
            <Field label="Start Date *" type="date" value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} />
            <Field label="End Date *" type="date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
            <Field label="Monthly Rent" type="number" value={form.monthly_rent} onChange={(v) => setForm({ ...form, monthly_rent: v })} />
            <Field label="Deposit" type="number" value={form.deposit} onChange={(v) => setForm({ ...form, deposit: v })} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Billing Cycle *</label>
              <select
                value={form.billing_cycle}
                onChange={(e) => setForm({ ...form, billing_cycle: e.target.value as any })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-sky-300"
              >
                <option value="monthly">Monthly (1 month)</option>
                <option value="quarterly">Quarterly (3 months)</option>
                <option value="semi_annual">Semi-Annual (6 months)</option>
                <option value="annual">Annual (12 months)</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-slate-600 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 w-full">
                Each invoice: <strong>{((Number(form.monthly_rent) || 0) * cycleMonths(form.billing_cycle)).toLocaleString()}</strong> TZS
                <span className="text-slate-500"> ({cycleMonths(form.billing_cycle)} month{cycleMonths(form.billing_cycle) > 1 ? 's' : ''})</span>
              </div>
            </div>
          </>
        )}

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:bg-slate-300"
          >
            {loading ? 'Saving...' : createContract ? 'Save Tenant & Contract' : 'Save Tenant'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  )
}

function cycleMonths(c: string): number {
  switch (c) {
    case 'quarterly': return 3
    case 'semi_annual': return 6
    case 'annual': return 12
    default: return 1
  }
}

function Field({
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
        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-300 outline-none"
      />
    </div>
  )
}
