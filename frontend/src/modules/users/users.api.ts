import { apiClient } from '../../shared/api/client'

export type StaffUser = {
  id: string
  username: string
  name?: string
  active: boolean
  role?: string
  lastLoginAt?: string
}

export type StaffUserInput = {
  username: string
  password?: string
  name?: string
  roleId: string
  active?: boolean
}

export const usersApi = {
  list: () => apiClient.get<StaffUser[]>('/users').then((r) => r.data),
  create: (data: StaffUserInput) => apiClient.post<{ id: string; username: string }>('/users', data).then((r) => r.data),
  update: (id: string, data: Partial<StaffUserInput>) =>
    apiClient.put<{ id: string }>(`/users/${id}`, data).then((r) => r.data),
}
