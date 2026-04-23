import apiClient from './api'

export interface ExpenseCategory {
  id: number
  name: string
  description: string
  is_active: boolean
  created_at: string
}

const expenseCategoryAPI = {
  list: () => apiClient.get<ExpenseCategory[]>('/api/expense-categories'),
  create: (data: { name: string; description?: string }) =>
    apiClient.post<ExpenseCategory>('/api/expense-categories', data),
  update: (id: number, data: { name: string; description?: string; is_active?: boolean }) =>
    apiClient.put(`/api/expense-categories/${id}`, data),
  remove: (id: number) => apiClient.delete(`/api/expense-categories/${id}`),
}

export default expenseCategoryAPI
