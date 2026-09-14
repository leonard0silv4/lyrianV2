import type { ButtonHTMLAttributes } from 'react'

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
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${CLASS_BY_VARIANT[variant]} ${className}`.trim()} {...props} />
}
