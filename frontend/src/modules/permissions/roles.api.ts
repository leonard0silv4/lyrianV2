import { apiClient } from '../../shared/api/client'

export type Role = {
  _id: string
  name: string
  description?: string
  permissions: string[]
}

export type RoleInput = {
  name: string
  description?: string
  permissions: string[]
}

export const PERMISSION_LABELS: Record<string, string> = {
  'users:manage': 'Gerenciar usuários da equipe',
  'roles:manage': 'Gerenciar papéis e permissões',
  'ateliers:read': 'Ver ateliês',
  'ateliers:write': 'Cadastrar/editar ateliês',
  'measurements:read': 'Ver medidas cadastradas',
  'measurements:write': 'Cadastrar/editar medidas',
  'work-queue:read': 'Ver fila de trabalho / dashboard',
  'work-queue:write': 'Emitir lotes e reverter etapas',
  'work-queue:advance': 'Avançar etapas da fila (coletar, descarregar, auditar)',
  'audit:read': 'Visualizar logs do sistema',
  'payments:manage': 'Gerenciar pagamentos (valores, bônus, quitação)',
}

export const PERMISSION_CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  users: { label: 'Usuários', icon: 'fa-solid fa-user-gear', color: 'var(--primary)' },
  roles: { label: 'Papéis', icon: 'fa-solid fa-user-shield', color: '#6d28d9' },
  ateliers: { label: 'Ateliês', icon: 'fa-solid fa-store', color: '#b45309' },
  measurements: { label: 'Medidas', icon: 'fa-solid fa-ruler-combined', color: '#0f766e' },
  'work-queue': { label: 'Fila de Produção', icon: 'fa-solid fa-diagram-project', color: '#4338ca' },
  audit: { label: 'Auditoria', icon: 'fa-solid fa-clipboard-list', color: 'var(--gray-600)' },
  payments: { label: 'Pagamentos', icon: 'fa-solid fa-sack-dollar', color: '#047857' },
}

export function permissionCategory(perm: string): string {
  return perm.split(':')[0]
}

export const rolesApi = {
  listPermissions: () => apiClient.get<string[]>('/roles/permissions').then((r) => r.data),
  list: () => apiClient.get<Role[]>('/roles').then((r) => r.data),
  create: (data: RoleInput) => apiClient.post<Role>('/roles', data).then((r) => r.data),
  update: (id: string, data: Partial<RoleInput>) => apiClient.put<Role>(`/roles/${id}`, data).then((r) => r.data),
}
