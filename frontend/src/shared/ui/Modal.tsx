import type { ReactNode } from 'react'

export function Modal({
  title,
  subtitle,
  icon,
  onClose,
  children,
  footer,
  hero,
  maxWidth,
  noScroll,
}: {
  title: string
  subtitle?: string
  icon?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  hero?: ReactNode
  maxWidth?: number
  noScroll?: boolean
}) {
  return (
    <div className="lya-modal-overlay" onClick={onClose}>
      <div
        className="lya-modal"
        style={{
          ...(maxWidth ? { maxWidth } : null),
          ...(noScroll ? { maxHeight: 'none' } : null),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {hero || (
          <div className="lya-modal-header">
            <div className="lya-modal-header-title">
              {icon && (
                <span className="lya-modal-icon">
                  <i className={`fa-solid ${icon}`} />
                </span>
              )}
              <div style={{ minWidth: 0 }}>
                <h2>{title}</h2>
                {subtitle && <div className="lya-modal-subtitle">{subtitle}</div>}
              </div>
            </div>
            <button className="lya-modal-close" onClick={onClose} aria-label="Fechar">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}
        <div className="lya-modal-body" style={noScroll ? { overflow: 'visible' } : undefined}>
          {children}
        </div>
        {footer && <div className="lya-modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
