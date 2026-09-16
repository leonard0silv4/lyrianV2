import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'

type ConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined)

type PendingRequest = {
  options: ConfirmOptions
  resolve: (value: boolean) => void
}

// Suporta apenas 1 confirmação pendente por vez: uma segunda chamada enquanto a
// primeira aguarda resposta substitui o request e nunca resolve a Promise anterior.
// Aceitável porque hoje só existe 1 call-site (LoteCard.tsx).
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<PendingRequest | null>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    const normalized = typeof options === 'string' ? { message: options } : options
    return new Promise<boolean>((resolve) => {
      setRequest({ options: normalized, resolve })
    })
  }, [])

  function handleCancel() {
    request?.resolve(false)
    setRequest(null)
  }

  function handleConfirm() {
    request?.resolve(true)
    setRequest(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <Modal
          title={request.options.title || 'Confirmar ação'}
          onClose={handleCancel}
          footer={
            <>
              <Button onClick={handleCancel}>{request.options.cancelLabel || 'Cancelar'}</Button>
              <Button variant={request.options.danger ? 'danger' : 'primary'} onClick={handleConfirm}>
                {request.options.confirmLabel || 'Confirmar'}
              </Button>
            </>
          }
        >
          <p style={{ margin: 0 }}>{request.options.message}</p>
        </Modal>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}
