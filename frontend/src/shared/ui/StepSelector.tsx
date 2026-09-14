import type { ReactNode } from 'react'

export function StepSelectorGroup({
  step,
  title,
  currentLabel,
  children,
}: {
  step: number
  title: string
  currentLabel?: ReactNode
  children: ReactNode
}) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--gray-700)' }}>
          <span className="lya-step-badge-num">{step}</span>
          {title}
        </span>
        {currentLabel && <span className="lya-mono" style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{currentLabel}</span>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>{children}</div>
    </div>
  )
}

export function StepChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" className={`lya-step-chip ${active ? 'active' : ''}`.trim()} onClick={onClick}>
      {children}
    </button>
  )
}
