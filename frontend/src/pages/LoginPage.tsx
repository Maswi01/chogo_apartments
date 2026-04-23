import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import authAPI from '../lib/authAPI'
import heroImage from '../assets/mwita_picture.jpg'
import logoUrl from '../assets/mwita_logo.png'

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
      <div
        className="hidden md:block relative bg-slate-900"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-900/30 to-transparent" />
        <div className="relative h-full flex items-end p-10">
          <div className="flex items-center gap-4 text-white">
            <div className="h-32 w-32 rounded-xl bg-white shadow-xl ring-1 ring-white/40 flex items-center justify-center overflow-hidden shrink-0 p-2">
              <img
                src={logoUrl}
                alt="Mwita Family Apartments"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold leading-tight drop-shadow">Mwita Family Apartments</h1>
              <p className="text-sm opacity-90">Property Management System</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-10">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-sm text-slate-500 mt-1">Sign in to continue to Mwita Family Apartments</p>
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
