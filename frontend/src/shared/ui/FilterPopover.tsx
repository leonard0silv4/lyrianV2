export function FilterPopover({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: Array<{ value: string; label: string; count?: number }>
  selected: string[]
  onChange: (values: string[]) => void
}) {
  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <details className="lya-filter-popover">
      <summary className="lya-btn" style={{ listStyle: 'none', cursor: 'pointer' }}>
        {label} {selected.length > 0 && `(${selected.length})`}
        <i className="fa-solid fa-chevron-down" style={{ marginLeft: '0.35rem', fontSize: '0.7rem' }} />
      </summary>
      <div className="lya-filter-panel">
        {options.map((opt) => (
          <div
            key={opt.value}
            className={`lya-filter-chip ${selected.includes(opt.value) ? 'active' : ''}`}
            onClick={() => toggle(opt.value)}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && <span className="lya-mono">{opt.count}</span>}
          </div>
        ))}
      </div>
    </details>
  )
}
