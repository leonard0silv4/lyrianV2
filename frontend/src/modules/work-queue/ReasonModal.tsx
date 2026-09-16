import { useState } from 'react'
import { Modal } from '../../shared/ui/Modal'
import { Button } from '../../shared/ui/Button'
import { workQueueApi, type WorkItem, type WorkItemStatus } from './workQueue.api'

export function ReasonModal({
  item,
  stepLabel,
  toStatus,
  onClose,
  onSaved,
}: {
  item: WorkItem
  stepLabel: string
  toStatus: WorkItemStatus
  onClose: () => void
  onSaved: (updated: WorkItem) => void
}) {
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!motivo.trim()) {
      setError('Informe o motivo para desfazer esta etapa')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const updated = await workQueueApi.revert(item._id, toStatus, motivo.trim())
      onSaved(updated)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível desfazer esta etapa')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Desfazer "${stepLabel}" — ${item.code}`}
      subtitle="O lote volta para a etapa anterior. Esse motivo fica registrado nos logs do sistema."
      icon="fa-rotate-left"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            {saving ? 'Desfazendo...' : 'Confirmar'}
          </Button>
        </>
      }
    >
      <textarea
        className="lya-input"
        style={{ minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Explique por que essa etapa está sendo desfeita..."
        autoFocus
      />
      {error && <p className="lya-form-error">{error}</p>}
    </Modal>
  )
}
