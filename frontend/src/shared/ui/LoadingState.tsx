import { Spinner } from './Spinner'

export function LoadingState({
  message = 'Carregando...',
  compact = false,
}: {
  message?: string
  compact?: boolean
}) {
  const content = (
    <span className="lya-loading-state">
      <Spinner size={14} color="var(--primary)" />
      {message}
    </span>
  )

  if (compact) return content
  return <div className="lya-empty-state">{content}</div>
}
