import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Chogo Apartments</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">Welcome, <span className="font-semibold">{user?.full_name}</span></span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Dashboard</h2>

          {/* User Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-2">Full Name</p>
              <p className="text-lg font-semibold text-gray-900">{user?.full_name}</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-2">Email</p>
              <p className="text-lg font-semibold text-gray-900">{user?.email}</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-2">Role</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">{user?.role}</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-2">Branch ID</p>
              <p className="text-lg font-semibold text-gray-900">{user?.branch_id}</p>
            </div>
          </div>

          {/* Status */}
          <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 font-medium">✓ Successfully logged in</p>
            <p className="text-gray-600 text-sm mt-2">
              Your account is active and you're ready to start managing apartment properties.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
