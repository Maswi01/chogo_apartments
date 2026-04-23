import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import authAPI, { type Branch } from '../lib/authAPI'
import { useAuth } from './AuthContext'

interface BranchContextValue {
  branches: Branch[]
  activeBranch: Branch | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  setActiveBranchById: (id: number) => void
}

const BranchContext = createContext<BranchContextValue | undefined>(undefined)

const ACTIVE_BRANCH_KEY = 'activeBranchId'

export function BranchProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [activeBranchId, setActiveBranchId] = useState<number | null>(() => {
    const raw = localStorage.getItem(ACTIVE_BRANCH_KEY)
    return raw ? Number.parseInt(raw, 10) : null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await authAPI.getBranches()
      setBranches(response.data)
    } catch (err) {
      setError('Failed to load branches')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setBranches([])
      return
    }
    refresh()
  }, [isAuthenticated, refresh])

  // Pick a sensible default active branch: persisted -> user's branch -> first available.
  useEffect(() => {
    if (branches.length === 0) return
    if (activeBranchId && branches.some((b) => b.id === activeBranchId)) return

    const fallback = user?.branch_id ? branches.find((b) => b.id === user.branch_id) : undefined
    const next = fallback ?? branches[0]
    setActiveBranchId(next.id)
    localStorage.setItem(ACTIVE_BRANCH_KEY, String(next.id))
  }, [branches, activeBranchId, user?.branch_id])

  const setActiveBranchById = useCallback((id: number) => {
    setActiveBranchId(id)
    localStorage.setItem(ACTIVE_BRANCH_KEY, String(id))
  }, [])

  const activeBranch = useMemo(
    () => branches.find((b) => b.id === activeBranchId) ?? null,
    [branches, activeBranchId]
  )

  const value: BranchContextValue = {
    branches,
    activeBranch,
    loading,
    error,
    refresh,
    setActiveBranchById,
  }

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
}

export function useBranches() {
  const ctx = useContext(BranchContext)
  if (!ctx) throw new Error('useBranches must be used within BranchProvider')
  return ctx
}
