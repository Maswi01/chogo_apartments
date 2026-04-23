import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { BranchProvider } from './context/BranchContext'
import { PrivateRoute } from './components/PrivateRoute'
import { AdminOnly, BranchOnly } from './components/BranchGuards'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ExpenseCategoriesPage from './pages/ExpenseCategoriesPage'
import DashboardPage from './pages/DashboardPage'
import AddBranchPage from './pages/AddBranchPage'
import BranchesPage from './pages/BranchesPage'
import RoomsPage from './pages/RoomsPage'
import AddRoomPage from './pages/AddRoomPage'
import AddTenantPage from './pages/AddTenantPage'
import InvoicesPage from './pages/InvoicesPage'
import ContractAgreementPage from './pages/ContractAgreementPage'
import TenantsPage from './pages/TenantsPage'
import StatementsPage from './pages/StatementsPage'
import TransactionsPage from './pages/TransactionsPage'
import ReportsPage from './pages/ReportsPage'
import TransactionStatementPage from './pages/TransactionStatementPage'
import ExpensesStatementPage from './pages/ExpensesStatementPage'
import ExpensesReportPage from './pages/ExpensesReportPage'
import CashFlowStatementPage from './pages/CashFlowStatementPage'
import RentMonthlyReportPage from './pages/RentMonthlyReportPage'

const guarded = (el: React.ReactNode) => <PrivateRoute>{el}</PrivateRoute>
const adminOnly = (el: React.ReactNode) => guarded(<AdminOnly>{el}</AdminOnly>)
const branchOnly = (el: React.ReactNode) => guarded(<BranchOnly>{el}</BranchOnly>)

function App() {
  return (
    <AuthProvider>
      <BranchProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={guarded(<DashboardPage />)} />

          {/* Administration only */}
          <Route path="/register" element={adminOnly(<RegisterPage />)} />
          <Route path="/branches" element={adminOnly(<BranchesPage />)} />
          <Route path="/branches/new" element={adminOnly(<AddBranchPage />)} />
          <Route path="/expense-categories" element={adminOnly(<ExpenseCategoriesPage />)} />

          {/* Branch only (not Administration) */}
          <Route path="/rooms" element={branchOnly(<RoomsPage />)} />
          <Route path="/rooms/new" element={branchOnly(<AddRoomPage />)} />
          <Route path="/tenants/new" element={branchOnly(<AddTenantPage />)} />
          <Route path="/tenants" element={branchOnly(<TenantsPage />)} />
          <Route path="/contracts/:id/agreement" element={branchOnly(<ContractAgreementPage />)} />
          <Route path="/invoices" element={branchOnly(<InvoicesPage />)} />
          <Route path="/statements" element={branchOnly(<StatementsPage />)} />
          <Route path="/transactions" element={branchOnly(<TransactionsPage />)} />
          <Route path="/reports" element={branchOnly(<ReportsPage />)} />
          <Route path="/reports/transactions" element={branchOnly(<TransactionStatementPage />)} />
          <Route path="/reports/expenses" element={branchOnly(<ExpensesStatementPage />)} />
          <Route path="/reports/expenses-summary" element={branchOnly(<ExpensesReportPage />)} />
          <Route path="/reports/cash-flow" element={branchOnly(<CashFlowStatementPage />)} />
          <Route path="/reports/rent-monthly" element={branchOnly(<RentMonthlyReportPage />)} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BranchProvider>
    </AuthProvider>
  )
}

export default App
