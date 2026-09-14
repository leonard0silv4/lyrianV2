import type { ButtonHTMLAttributes } from 'react'

type Variant = 'neutral' | 'info' | 'warning' | 'purple' | 'danger'

export function IconButton({
  icon,
  variant = 'neutral',
  className = '',
  ...rest
}: {
  icon: string
  variant?: Variant
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`lya-icon-btn ${variant} ${className}`.trim()} {...rest}>
      <i className={`fa-solid ${icon}`} />
    </button>
  )
}
