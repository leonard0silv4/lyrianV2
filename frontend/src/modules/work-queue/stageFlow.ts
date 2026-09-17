import type { WorkItemStatus } from './workQueue.api'

export const CHECKLIST_STEPS: Array<{ status: WorkItemStatus; label: string; dateField?: string; auto?: boolean }> = [
  { status: 'criado', label: 'Criado', dateField: 'criadoEm' },
  { status: 'em_atelie', label: 'Em Ateliê', dateField: 'emAtelieEm' },
  { status: 'em_producao', label: 'Em Costura', dateField: 'emProducaoEm' },
  { status: 'pronto', label: 'Acabamento Pronto', dateField: 'prontoEm' },
  { status: 'coletado', label: 'Coletar', dateField: 'coletadoEm' },
  { status: 'descarregado', label: 'Descarregar', dateField: 'descarregadoEm' },
  { status: 'auditoria_aprovada', label: 'Auditoria', dateField: 'auditoriaEm' },
]

const ORDER: WorkItemStatus[] = [
  'criado',
  'em_atelie',
  'em_producao',
  'pronto',
  'coletado',
  'descarregado',
  'auditoria_aprovada',
]

export function stepIndex(status: WorkItemStatus) {
  const idx = ORDER.indexOf(status)
  return idx === -1 ? ORDER.length : idx
}

export function isStepDone(status: WorkItemStatus, stepStatus: WorkItemStatus) {
  return stepIndex(status) >= stepIndex(stepStatus)
}

/** Status imediatamente anterior a um dado status na sequência normal, ou undefined se for o primeiro. */
export function previousStatus(status: WorkItemStatus): WorkItemStatus | undefined {
  const idx = ORDER.indexOf(status)
  return idx > 0 ? ORDER[idx - 1] : undefined
}

/** Espelha `MIN_COSTURA_MS` de backend/src/modules/work-queue/stateMachine.js — mantém em sincronia. */
export const MIN_COSTURA_MS = 15 * 60 * 1000

const ATELIER_ALLOWED_STATUSES: WorkItemStatus[] = ['criado', 'em_atelie', 'em_producao']

export function atelierCanAdvance(status: WorkItemStatus) {
  return ATELIER_ALLOWED_STATUSES.includes(status)
}

export const NEXT_ACTION: Partial<Record<WorkItemStatus, { toStatus: WorkItemStatus; label: string; icon: string }>> = {
  criado: { toStatus: 'em_atelie', label: 'Confirmar Recebimento', icon: 'fa-check' },
  em_atelie: { toStatus: 'em_producao', label: 'Iniciar Produção', icon: 'fa-scissors' },
  em_producao: { toStatus: 'pronto', label: 'Concluir Acabamento', icon: 'fa-check-double' },
  pronto: { toStatus: 'coletado', label: 'Marcar Coletado', icon: 'fa-truck' },
  coletado: { toStatus: 'descarregado', label: 'Marcar Descarregado', icon: 'fa-warehouse' },
  descarregado: { toStatus: 'auditoria_aprovada', label: 'Aprovar Auditoria', icon: 'fa-clipboard-check' },
  auditoria_divergente: { toStatus: 'em_producao', label: 'Reprocessar', icon: 'fa-rotate-left' },
}
