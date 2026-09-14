export function ChecklistRow({
  label,
  done,
  timestamp,
  pendingInfo,
  onRevert,
}: {
  label: string
  done: boolean
  timestamp?: string
  pendingInfo?: boolean
  onRevert?: () => void
}) {
  return (
    <div className={`lya-checklist-row ${pendingInfo ? 'pending-info' : ''}`.trim()}>
      <span className={`lya-checklist-dot ${done ? 'done' : ''}`.trim()} />
      <span>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <span className="lya-checklist-time">
          {timestamp ? new Date(timestamp).toLocaleString('pt-BR') : 'Pendente'}
        </span>
        {done && onRevert && (
          <button
            className="lya-checklist-undo"
            title={`Desfazer "${label}"`}
            onClick={onRevert}
            type="button"
          >
            <i className="fa-solid fa-rotate-left" />
          </button>
        )}
      </span>
    </div>
  )
}
