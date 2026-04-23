import { Navigate } from 'react-router-dom'
import { useBranches } from '../context/BranchContext'

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdminBranch, activeBranch } = useBranches()
  if (!activeBranch) return null
  if (!isAdminBranch) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export function BranchOnly({ children }: { children: React.ReactNode }) {
  const { isAdminBranch, activeBranch } = useBranches()
  if (!activeBranch) return null
  if (isAdminBranch) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
