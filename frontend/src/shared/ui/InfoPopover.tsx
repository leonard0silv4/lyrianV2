/** Ícone pequeno que abre um popover com uma explicação ao clicar (funciona em touch, diferente de title/hover). */
export function InfoPopover({
  text,
  icon = 'fa-circle-info',
  align = 'left',
}: {
  text: string
  icon?: string
  /** Lado em que o painel se ancora — use "right" quando o ícone fica perto da borda direita do container. */
  align?: 'left' | 'right'
}) {
  return (
    <details className="lya-info-popover" onClick={(e) => e.stopPropagation()}>
      <summary className="lya-info-popover-trigger">
        <i className={`fa-solid ${icon}`} />
      </summary>
      <div className={`lya-info-popover-panel ${align === 'right' ? 'align-right' : ''}`}>{text}</div>
    </details>
  )
}
