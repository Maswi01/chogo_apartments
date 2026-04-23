import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import apartmentAPI, { type Room } from '../lib/apartmentAPI'
import { useBranches } from '../context/BranchContext'

export default function AddTenantPage() {
  const { activeBranch } = useBranches()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<Room[]>([])
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    id_number: '',
    room_id: '',
    booking_code: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    monthly_rent: '',
    deposit: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeBranch) return
    apartmentAPI.listRooms(activeBranch.id, 'vacant').then((r) => setRooms(r.data))
  }, [activeBranch?.id])

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
    if (!form.full_name.trim() || !form.room_id || !form.start_date || !form.end_date) {
      setError('Full name, room, start and end dates are required')
      return
    }
    setLoading(true)
    try {
      const tenantRes = await apartmentAPI.createTenant({
        branch_id: activeBranch.id,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        id_number: form.id_number.trim(),
      })
      await apartmentAPI.createContract({
        branch_id: activeBranch.id,
        tenant_id: tenantRes.data.id,
        room_id: Number(form.room_id),
        booking_code: form.booking_code.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        monthly_rent: Number(form.monthly_rent) || 0,
        deposit: Number(form.deposit) || 0,
      })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register tenant')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="Register Tenant">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        {error && (
          <div className="md:col-span-2 p-3 bg-rose-50 border border-rose-200 rounded text-sm text-rose-700">
            {error}
          </div>
        )}
        <Field label="Full Name *" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
        <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="ID Number" value={form.id_number} onChange={(v) => setForm({ ...form, id_number: v })} />

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
        <Field
          label="Start Date *"
          type="date"
          value={form.start_date}
          onChange={(v) => setForm({ ...form, start_date: v })}
        />
        <Field
          label="End Date *"
          type="date"
          value={form.end_date}
          onChange={(v) => setForm({ ...form, end_date: v })}
        />
        <Field
          label="Monthly Rent"
          type="number"
          value={form.monthly_rent}
          onChange={(v) => setForm({ ...form, monthly_rent: v })}
        />
        <Field
          label="Deposit"
          type="number"
          value={form.deposit}
          onChange={(v) => setForm({ ...form, deposit: v })}
        />

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:bg-slate-300"
          >
            {loading ? 'Saving...' : 'Save Tenant & Contract'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  )
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
