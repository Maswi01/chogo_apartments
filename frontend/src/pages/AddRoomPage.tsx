import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import apartmentAPI from '../lib/apartmentAPI'
import { useBranches } from '../context/BranchContext'

export default function AddRoomPage() {
  const { activeBranch } = useBranches()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    code: '',
    room_type: '',
    monthly_rent: '',
    notes: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeBranch) return
    setError('')
    if (!form.code.trim()) {
      setError('Room code is required')
      return
    }
    setLoading(true)
    try {
      await apartmentAPI.createRoom({
        branch_id: activeBranch.id,
        code: form.code.trim(),
        room_type: form.room_type.trim(),
        monthly_rent: Number(form.monthly_rent) || 0,
        notes: form.notes.trim(),
      })
      navigate('/rooms?status=vacant')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="Register Room">
      <form onSubmit={submit} className="max-w-xl space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded text-sm text-rose-700">{error}</div>
        )}
        <Field label="Room Code" value={form.code} onChange={(v) => setForm({ ...form, code: v })} placeholder="e.g., A-01" />
        <Field label="Type (single, double, shop...)" value={form.room_type} onChange={(v) => setForm({ ...form, room_type: v })} />
        <Field
          label="Monthly Rent"
          type="number"
          value={form.monthly_rent}
          onChange={(v) => setForm({ ...form, monthly_rent: v })}
          placeholder="0"
        />
        <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:bg-slate-300"
        >
          {loading ? 'Saving...' : 'Save Room'}
        </button>
      </form>
    </DashboardLayout>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-300 outline-none"
      />
    </div>
  )
}
