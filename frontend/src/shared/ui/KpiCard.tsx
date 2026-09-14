export function KpiCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone?: 'warning' | 'success'
}) {
  return (
    <div className={`lya-kpi-card ${tone || ''}`.trim()}>
      <div className="lya-kpi-label">{label}</div>
      <div className="lya-kpi-value">{value}</div>
    </div>
  )
}
