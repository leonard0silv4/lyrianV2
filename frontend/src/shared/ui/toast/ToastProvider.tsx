import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { dismiss, subscribe, toast, type ToastItem } from './toastStore'
import { ToastCard } from './Toast'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => subscribe(setItems), [])

  return (
    <>
      {children}
      {createPortal(
        <div className="lya-toast-viewport" aria-live="polite">
          {items.map((item) => (
            <ToastCard key={item.id} item={item} onClose={() => dismiss(item.id)} />
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

export function useToast() {
  return toast
}
