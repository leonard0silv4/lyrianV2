import type { ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

type Variant = 'default' | 'primary' | 'danger' | 'ghost'

const CLASS_BY_VARIANT: Record<Variant, string> = {
  default: 'lya-btn',
  primary: 'lya-btn lya-btn-primary',
  danger: 'lya-btn lya-btn-danger',
  ghost: 'lya-btn lya-btn-ghost',
}

export function Button({
  variant = 'default',
  className = '',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      className={`${CLASS_BY_VARIANT[variant]} ${className}`.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  )
}
