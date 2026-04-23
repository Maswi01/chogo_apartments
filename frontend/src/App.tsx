import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { BranchProvider } from './context/BranchContext'
import { PrivateRoute } from './components/PrivateRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import AddBranchPage from './pages/AddBranchPage'
import BranchesPage from './pages/BranchesPage'
import RoomsPage from './pages/RoomsPage'
import AddRoomPage from './pages/AddRoomPage'
import AddTenantPage from './pages/AddTenantPage'
import InvoicesPage from './pages/InvoicesPage'
import StatementsPage from './pages/StatementsPage'
import TransactionsPage from './pages/TransactionsPage'
import ReportsPage from './pages/ReportsPage'

const guarded = (el: React.ReactNode) => <PrivateRoute>{el}</PrivateRoute>

function App() {
  return (
    <AuthProvider>
      <BranchProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={guarded(<RegisterPage />)} />
          <Route path="/dashboard" element={guarded(<DashboardPage />)} />
          <Route path="/branches" element={guarded(<BranchesPage />)} />
          <Route path="/branches/new" element={guarded(<AddBranchPage />)} />
          <Route path="/rooms" element={guarded(<RoomsPage />)} />
          <Route path="/rooms/new" element={guarded(<AddRoomPage />)} />
          <Route path="/tenants/new" element={guarded(<AddTenantPage />)} />
          <Route path="/invoices" element={guarded(<InvoicesPage />)} />
          <Route path="/statements" element={guarded(<StatementsPage />)} />
          <Route path="/transactions" element={guarded(<TransactionsPage />)} />
          <Route path="/reports" element={guarded(<ReportsPage />)} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BranchProvider>
    </AuthProvider>
  )
}

export default App
