import DashboardLayout from '../components/DashboardLayout'
import AdminDashboard from '../components/AdminDashboard'
import BranchDashboard from '../components/BranchDashboard'
import { useBranches } from '../context/BranchContext'

export default function DashboardPage() {
  const { activeBranch, isAdminBranch } = useBranches()

  return (
    <DashboardLayout title={isAdminBranch ? 'Owner Updates - All Branches' : 'Branch Overview'}>
      {!activeBranch ? (
        <p className="text-slate-500">Select a branch to view its dashboard.</p>
      ) : isAdminBranch ? (
        <AdminDashboard />
      ) : (
        <BranchDashboard branchId={activeBranch.id} />
      )}
    </DashboardLayout>
  )
}
