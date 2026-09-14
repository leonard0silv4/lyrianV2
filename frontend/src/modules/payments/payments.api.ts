import { apiClient } from '../../shared/api/client'

export type PaymentBatchItem = {
  workItemId: string
  code: string
  totalMetros: number
  valor: number
  orcamento?: number
  bonus?: number
}

export type PaymentBatch = {
  _id: string
  atelierId: string | { _id: string; nomeFantasia: string; siglaLote: string; cnpj?: string }
  items: PaymentBatchItem[]
  valorBruto: number
  desconto: number
  valorLiquido: number
  pixKey: string
  beneficiario?: string
  banco?: string
  pixPayload: string
  createdAt: string
}

export const paymentsApi = {
  list: (atelierId?: string) =>
    apiClient.get<PaymentBatch[]>('/payments', { params: atelierId ? { atelierId } : undefined }).then((r) => r.data),
  get: (id: string) => apiClient.get<PaymentBatch>(`/payments/${id}`).then((r) => r.data),
  createBatch: (data: { atelierId: string; workItemIds: string[]; desconto: number }) =>
    apiClient.post<PaymentBatch>('/payments', data).then((r) => r.data),
}
