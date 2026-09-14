import { apiClient } from '../../shared/api/client'

export type Atelier = {
  _id: string
  nomeFantasia: string
  razaoSocial: string
  cnpj: string
  siglaLote: string
  telefone?: string
  enderecoCompleto?: string
  banco?: string
  chavePix?: string
  active: boolean
  login?: string
  saldoAdiantamento?: number
}

export type AtelierInput = Omit<Atelier, '_id' | 'active'> & {
  login?: string
  senha?: string
}

export const ateliersApi = {
  list: () => apiClient.get<Atelier[]>('/ateliers').then((r) => r.data),
  get: (id: string) => apiClient.get<Atelier>(`/ateliers/${id}`).then((r) => r.data),
  create: (data: AtelierInput) => apiClient.post<Atelier>('/ateliers', data).then((r) => r.data),
  update: (id: string, data: Partial<AtelierInput>) =>
    apiClient.put<Atelier>(`/ateliers/${id}`, data).then((r) => r.data),
  setActive: (id: string, active: boolean) =>
    apiClient.patch<Atelier>(`/ateliers/${id}/active`, { active }).then((r) => r.data),
  setAdiantamento: (id: string, saldoAdiantamento: number) =>
    apiClient.patch<Atelier>(`/ateliers/${id}/adiantamento`, { saldoAdiantamento }).then((r) => r.data),
}
