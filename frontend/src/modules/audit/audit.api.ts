import { apiClient } from '../../shared/api/client'

export type AuditAction = 'create' | 'update' | 'delete' | 'status_change'

export type AuditLogEntry = {
  _id: string
  entityType: string
  entityId: string
  entityCode?: string
  userId: string
  userName?: string
  userRole?: string
  action: AuditAction
  field?: string
  oldValue?: unknown
  newValue?: unknown
  reason?: string
  timestamp: string
}

export type AuditLogPage = {
  items: AuditLogEntry[]
  total: number
  page: number
  limit: number
}

export const auditApi = {
  list: (params?: { entityType?: string; action?: AuditAction; dateFrom?: string; dateTo?: string; page?: number; limit?: number }) =>
    apiClient.get<AuditLogPage>('/audit', { params }).then((r) => r.data),
}
