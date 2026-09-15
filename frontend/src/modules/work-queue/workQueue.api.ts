import { apiClient } from '../../shared/api/client'

export type WorkItemStatus =
  | 'criado'
  | 'em_atelie'
  | 'em_producao'
  | 'pronto'
  | 'coletado'
  | 'descarregado'
  | 'auditoria_aprovada'
  | 'auditoria_divergente'

export type PaymentStatus = 'pendente' | 'liberado' | 'pago'

export type WorkItem = {
  _id: string
  atelierId: string
  code: string
  specs: {
    percentualSombreamento: number
    corTecido: string
    corHex?: string
    measurementId?: string
    larguraBobina: number
    comprimentoBobina: number
    quantidadeFardo: number
    emenda: boolean
  }
  metrics: {
    totalMetros: number
    qtdRolos: number
    orcamento?: number
  }
  status: WorkItemStatus
  statusDates: Record<string, string | undefined>
  paymentStatus?: PaymentStatus
  dataPgto?: string
  bonus?: number
  advancedMoneyPayment?: number
  observacao?: string
  rating?: number
  priority: number
  createdAt: string
}

export type WorkItemInput = {
  atelierId: string
  percentualSombreamento: number
  corTecido: string
  corHex?: string
  measurementId?: string
  larguraBobina?: number
  comprimentoBobina: number
  quantidadeFardo: number
  emenda: boolean
}

export type DashboardData = {
  totalLotes: number
  totalMetros: number
  porStatus: Record<string, number>
  porAtelier: Array<{ atelierId: string; nomeFantasia?: string; siglaLote?: string; totalLotes: number; totalMetros: number }>
  pagamento?: { lotesLiberados: number; metrosLiberados: number; valorLiberado: number }
}

export type WorkQueueListParams = {
  atelierId?: string
  status?: string
  paymentStatus?: string
  q?: string
}

export type WorkQueuePage = {
  items: WorkItem[]
  total: number
  page: number
  limit: number
}

export const workQueueApi = {
  list: (params?: WorkQueueListParams) => apiClient.get<WorkItem[]>('/work-queue', { params }).then((r) => r.data),
  listPaged: (params: WorkQueueListParams & { page: number; limit: number }) =>
    apiClient.get<WorkQueuePage>('/work-queue', { params }).then((r) => r.data),
  get: (id: string) => apiClient.get<WorkItem>(`/work-queue/${id}`).then((r) => r.data),
  create: (data: WorkItemInput) => apiClient.post<WorkItem>('/work-queue', data).then((r) => r.data),
  transition: (id: string, toStatus: WorkItemStatus, observacao?: string) =>
    apiClient.post<WorkItem>(`/work-queue/${id}/transition`, { toStatus, observacao }).then((r) => r.data),
  updateObservacao: (id: string, observacao: string) =>
    apiClient.put<WorkItem>(`/work-queue/${id}/observacao`, { observacao }).then((r) => r.data),
  pay: (id: string) => apiClient.post<WorkItem>(`/work-queue/${id}/pay`).then((r) => r.data),
  applyBonus: (id: string, percentage: number) =>
    apiClient.post<WorkItem>(`/work-queue/${id}/apply-bonus`, { percentage }).then((r) => r.data),
  applyBonusBulk: (workItemIds: string[], percentage: number) =>
    apiClient.post<WorkItem[]>('/work-queue/apply-bonus-bulk', { workItemIds, percentage }).then((r) => r.data),
  rate: (id: string, rating: number) =>
    apiClient.post<WorkItem>(`/work-queue/${id}/rate`, { rating }).then((r) => r.data),
  updateSpecs: (
    id: string,
    specs: {
      measurementId?: string | null
      larguraBobina?: number
      comprimentoBobina?: number
      quantidadeFardo?: number
      emenda?: boolean
    }
  ) => apiClient.put<WorkItem>(`/work-queue/${id}/specs`, specs).then((r) => r.data),
  setArchived: (id: string, isArchived: boolean) =>
    apiClient.patch<WorkItem>(`/work-queue/${id}/archive`, { isArchived }).then((r) => r.data),
  revert: (id: string, toStatus: WorkItemStatus, motivo: string) =>
    apiClient.post<WorkItem>(`/work-queue/${id}/revert`, { toStatus, motivo }).then((r) => r.data),
  dashboard: () => apiClient.get<DashboardData>('/work-queue/dashboard').then((r) => r.data),
  confirmByQr: (id: string) =>
    apiClient
      .post<{ alreadyConfirmed: boolean; item: WorkItem }>(`/work-queue/${id}/confirm-qr`)
      .then((r) => r.data),
}
