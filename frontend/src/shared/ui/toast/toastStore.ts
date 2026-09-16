export type ToastType = 'success' | 'error' | 'info'

export type ToastItem = {
  id: string
  type: ToastType
  message: string
  duration: number
}

let items: ToastItem[] = []
const listeners = new Set<(items: ToastItem[]) => void>()

function notify() {
  for (const listener of listeners) listener(items)
}

export function subscribe(listener: (items: ToastItem[]) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function dismiss(id: string) {
  if (!items.some((item) => item.id === id)) return
  items = items.filter((item) => item.id !== id)
  notify()
}

function push(type: ToastType, message: string, duration: number) {
  const id = crypto.randomUUID()
  items = [...items, { id, type, message, duration }]
  notify()
  if (duration > 0) {
    setTimeout(() => dismiss(id), duration)
  }
  return id
}

export const toast = {
  success: (message: string, duration = 4000) => push('success', message, duration),
  error: (message: string, duration = 6000) => push('error', message, duration),
  info: (message: string, duration = 4000) => push('info', message, duration),
}
