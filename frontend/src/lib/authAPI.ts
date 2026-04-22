import apiClient from './api'

export interface User {
  id: number
  branch_id: number
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
  message: string
}

export interface Branch {
  id: number
  name: string
}

export interface RegisterRequest {
  email: string
  password: string
  full_name: string
  branch_id?: number
  branch_name?: string
}

export const authAPI = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<LoginResponse>('/auth/register', data),

  getBranches: () => apiClient.get<Branch[]>('/branches'),
}

export default authAPI
