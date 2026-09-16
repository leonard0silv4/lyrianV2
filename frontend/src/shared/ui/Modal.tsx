import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

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
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Renderizado via portal direto em document.body: cards de listas virtualizadas
  // (VirtualCardGrid/DashboardPage) usam `transform` nas linhas para posicionar o
  // scroll, e isso cria um novo containing block para descendentes `position: fixed`.
  // Sem o portal, o overlay ficava restrito às dimensões daquele card/linha
  // (sombra cortada, modal preso no centro do card) em vez de cobrir a tela toda.
  return createPortal(
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
    </div>,
    document.body
  )
}
