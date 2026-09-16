export function Spinner({
  size = 16,
  color,
  className = '',
}: {
  size?: number
  color?: string
  className?: string
}) {
  return (
    <i
      className={`fa-solid fa-spinner fa-spin ${className}`.trim()}
      style={{ fontSize: size, color }}
      aria-hidden="true"
    />
  )
}
