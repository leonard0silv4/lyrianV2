import type { CSSProperties, ReactNode } from 'react'

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  criado: { bg: '#f8fafc', fg: '#64748b' },
  em_atelie: { bg: '#f1f5f9', fg: '#334155' },
  em_producao: { bg: '#fee2e2', fg: '#991b1b' },
  pronto: { bg: '#fef3c7', fg: '#92400e' },
  coletado: { bg: '#d1fae5', fg: '#065f46' },
  descarregado: { bg: '#eff6ff', fg: '#1e40af' },
  auditoria_aprovada: { bg: '#166534', fg: '#ffffff' },
  auditoria_divergente: { bg: '#fee2e2', fg: '#991b1b' },
}

const PAYMENT_STYLES: Record<string, { bg: string; fg: string }> = {
  pendente: { bg: '#fef2f2', fg: '#991b1b' },
  liberado: { bg: '#dcfce7', fg: '#14532d' },
  pago: { bg: '#166534', fg: '#ffffff' },
}

const DEFAULT_STYLE = { bg: '#f1f5f9', fg: '#334155' }

export function Badge({
  children,
  variant = 'status',
  value,
}: {
  children: ReactNode
  variant?: 'status' | 'payment'
  value: string
}) {
  const palette = variant === 'payment' ? PAYMENT_STYLES : STATUS_STYLES
  const { bg, fg } = palette[value] || DEFAULT_STYLE
  const style: CSSProperties = { background: bg, color: fg }

  return (
    <span className="lya-badge" style={style}>
      {children}
    </span>
  )
}

export const STATUS_LABELS: Record<string, string> = {
  criado: 'Emitido',
  em_atelie: 'Em Ateliê',
  em_producao: 'Em Costura',
  pronto: 'Acabamento Pronto',
  coletado: 'Coletado na Van',
  descarregado: 'Descarregado',
  auditoria_aprovada: 'Auditado',
  auditoria_divergente: 'Em Análise',
}

export const PAYMENT_LABELS: Record<string, string> = {
  pendente: 'PGTO NÃO FEITO',
  liberado: 'PRONTO P/ PGTO',
  pago: 'PAGO',
}
