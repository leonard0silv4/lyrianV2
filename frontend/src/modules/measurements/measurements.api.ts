import { apiClient } from '../../shared/api/client'

export type Measurement = {
  _id: string
  larguraBobina: number
  comprimentoBobina: number
  unidade?: string
  emendaPadrao: boolean
  ativo: boolean
}

export type MeasurementInput = {
  larguraBobina: number
  comprimentoBobina: number
  unidade?: string
  emendaPadrao: boolean
}

export const measurementsApi = {
  list: () => apiClient.get<Measurement[]>('/measurements').then((r) => r.data),
  get: (id: string) => apiClient.get<Measurement>(`/measurements/${id}`).then((r) => r.data),
  create: (data: MeasurementInput) => apiClient.post<Measurement>('/measurements', data).then((r) => r.data),
  update: (id: string, data: Partial<MeasurementInput>) =>
    apiClient.put<Measurement>(`/measurements/${id}`, data).then((r) => r.data),
  setActive: (id: string, ativo: boolean) =>
    apiClient.patch<Measurement>(`/measurements/${id}/active`, { ativo }).then((r) => r.data),
}
