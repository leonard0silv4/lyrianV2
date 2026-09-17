import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Gaveta deslizante do rodapé (mobile-first), usada no Portal do Ateliê. Mesmo padrão
 * de portal para document.body de Modal.tsx, para não ficar presa em ancestrais com
 * `transform`. */
export function BottomSheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div className="lya-bottom-sheet-backdrop active" onClick={onClose}>
      <div className="lya-bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="lya-bottom-sheet-handle" />
        {children}
      </div>
    </div>,
    document.body
  )
}
