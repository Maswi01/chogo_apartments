import apiClient from './api'

export interface Room {
  id: number
  branch_id: number
  code: string
  room_type: string
  monthly_rent: number
  status: 'vacant' | 'occupied' | 'reserved' | 'maintenance'
  notes: string
  created_at: string
}

export interface Tenant {
  id: number
  branch_id: number
  full_name: string
  phone: string
  email: string
  id_number: string
  created_at: string
}

export interface Contract {
  id: number
  branch_id: number
  tenant_id: number
  room_id: number
  booking_code: string
  start_date: string
  end_date: string
  monthly_rent: number
  deposit: number
  billing_cycle: 'monthly' | 'quarterly' | 'semi_annual' | 'annual'
  cycle_amount: number
  parent_contract_id?: number | null
  status: 'active' | 'expired' | 'terminated' | 'renewed' | 'upgraded'
  tenant_name?: string
  tenant_phone?: string
  room_code?: string
  invoice_total?: number
  paid_total?: number
  balance?: number
  days_left?: number
  created_at: string
}

export interface Invoice {
  id: number
  branch_id: number
  contract_id: number
  invoice_number: string
  period_start: string
  period_end: string
  amount_due: number
  amount_paid: number
  due_date: string
  status: 'unpaid' | 'partial' | 'paid' | 'void'
  tenant_name?: string
  room_code?: string
  created_at: string
}

export interface Payment {
  id: number
  branch_id: number
  tenant_id: number
  contract_id: number
  invoice_id: number
  amount: number
  payment_date: string
  receipt_number: string
  payment_method: string
  notes: string
  tenant_name?: string
  room_code?: string
  created_at: string
}

export interface OfficeTransaction {
  id: number
  branch_id: number
  txn_type: 'income' | 'expense'
  category: string
  amount: number
  txn_date: string
  description: string
  created_at: string
}

export interface BranchDashboardData {
  branch_id: number
  branch_name: string
  active_contracts: number
  expiring_7d: number
  expiring_30d: number
  expired_in_progress: number
  unpaid_active: number
  payments_today: number
  payments_today_count: number
  expiring_soon: Contract[]
  expired_contracts: Contract[]
  unpaid_contracts: Contract[]
  today_payments: Payment[]
}

export interface AdminBranchStats {
  branch_id: number
  branch_name: string
  active_contracts: number
  expiring_7d: number
  expiring_30d: number
  expired_in_progress: number
  unpaid_active: number
  payments_today: number
}

export interface AdminDashboardData {
  totals: AdminBranchStats
  branches: AdminBranchStats[]
}

export const apartmentAPI = {
  // Rooms
  listRooms: (branchId: number, status?: string) =>
    apiClient.get<Room[]>('/rooms', { params: { branch_id: branchId, status } }),
  createRoom: (data: Partial<Room>) => apiClient.post<Room>('/rooms', data),

  // Tenants
  listTenants: (branchId: number) =>
    apiClient.get<Tenant[]>('/tenants', { params: { branch_id: branchId } }),
  createTenant: (data: Partial<Tenant>) => apiClient.post<Tenant>('/tenants', data),

  // Contracts
  listContracts: (branchId: number, status?: string) =>
    apiClient.get<Contract[]>('/contracts', { params: { branch_id: branchId, status } }),
  createContract: (data: Partial<Contract>) =>
    apiClient.post<{ id: number }>('/contracts', data),
  renewContract: (id: number, data: {
    end_date: string
    monthly_rent?: number
    deposit?: number
    billing_cycle?: Contract['billing_cycle']
    cycle_amount?: number
    booking_code?: string
  }) => apiClient.post<{ id: number; parent: number }>(`/contracts/${id}/renew`, data),
  upgradeContract: (id: number, data: {
    new_room_id: number
    effective_date: string
    end_date: string
    monthly_rent?: number
    deposit?: number
    billing_cycle?: Contract['billing_cycle']
    cycle_amount?: number
    booking_code?: string
  }) => apiClient.post<{ id: number; parent: number }>(`/contracts/${id}/upgrade`, data),

  // Invoices
  listInvoices: (branchId: number, status?: string) =>
    apiClient.get<Invoice[]>('/invoices', { params: { branch_id: branchId, status } }),
  createInvoice: (data: Partial<Invoice>) =>
    apiClient.post<{ id: number }>('/invoices', data),

  // Payments
  listPayments: (branchId: number, params?: { tenant_id?: number; date?: string }) =>
    apiClient.get<Payment[]>('/payments', { params: { branch_id: branchId, ...params } }),
  createPayment: (data: {
    branch_id: number
    invoice_id: number
    amount: number
    payment_date?: string
    receipt_number?: string
    payment_method?: string
    notes?: string
  }) => apiClient.post('/payments', data),

  // Transactions
  listTransactions: (branchId: number) =>
    apiClient.get<OfficeTransaction[]>('/transactions', { params: { branch_id: branchId } }),
  createTransaction: (data: Partial<OfficeTransaction>) =>
    apiClient.post<OfficeTransaction>('/transactions', data),

  // Dashboards
  branchDashboard: (branchId: number) =>
    apiClient.get<BranchDashboardData>('/dashboard/branch', { params: { branch_id: branchId } }),
  adminDashboard: () => apiClient.get<AdminDashboardData>('/dashboard/admin'),
}

export default apartmentAPI
