import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import authAPI from '../lib/authAPI'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authAPI.login({ email, password })
      login(response.data.user, response.data.token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Login failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-blue-700 to-sky-500 p-12">
        <div className="max-w-md text-white">
          <h1 className="text-4xl font-extrabold mb-4">Chogo Apartments</h1>
          <p className="text-lg opacity-90">Modern property management, simplified. Securely manage branches, staff, properties and payments from one place.</p>
          <ul className="mt-6 space-y-3">
            <li className="flex items-center gap-3"><span className="inline-block bg-white/20 p-2 rounded">✓</span> Multi-branch support</li>
            <li className="flex items-center gap-3"><span className="inline-block bg-white/20 p-2 rounded">✓</span> Role-based access</li>
            <li className="flex items-center gap-3"><span className="inline-block bg-white/20 p-2 rounded">✓</span> Fast onboarding</li>
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-10">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-sm text-slate-500 mt-1">Sign in to continue to Chogo Apartments</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-sky-300"
                placeholder="you@company.com"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-sky-300"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input id="remember" type="checkbox" className="h-4 w-4" />
                <label htmlFor="remember" className="text-sm text-slate-600">Remember me</label>
              </div>
              <a className="text-sm text-sky-600 hover:underline" href="#">Forgot?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition"
            >
              {loading ? 'Logging in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Contact your administrator to create an account.
          </div>
        </div>
      </div>
    </div>
  )
}
