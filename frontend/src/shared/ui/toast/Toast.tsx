import type { ToastItem } from './toastStore'

const ICON_BY_TYPE: Record<ToastItem['type'], string> = {
  success: 'fa-circle-check',
  error: 'fa-circle-xmark',
  info: 'fa-circle-info',
}

export function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  return (
    <div className={`lya-toast lya-toast-${item.type}`} role="status">
      <i className={`fa-solid ${ICON_BY_TYPE[item.type]} lya-toast-icon`} />
      <span className="lya-toast-message">{item.message}</span>
      <button className="lya-toast-close" onClick={onClose} aria-label="Fechar">
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  )
}
