import { useState } from 'react'
import { Modal } from '../../shared/ui/Modal'
import { Button } from '../../shared/ui/Button'
import { workQueueApi, type WorkItem } from './workQueue.api'

export function ObservacaoModal({
  item,
  onClose,
  onSaved,
}: {
  item: WorkItem
  onClose: () => void
  onSaved: (updated: WorkItem) => void
}) {
  const [text, setText] = useState(item.observacao || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    try {
      const updated = await workQueueApi.updateObservacao(item._id, text)
      onSaved(updated)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível salvar a observação')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Observação — ${item.code}`}
      icon="fa-note-sticky"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            {saving ? 'Salvando...' : 'Salvar Observação'}
          </Button>
        </>
      }
    >
      <textarea
        className="lya-input"
        style={{ minHeight: 120, resize: 'vertical', fontFamily: 'inherit' }}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escreva uma observação sobre este lote..."
        autoFocus
      />
      {error && <p className="lya-form-error">{error}</p>}
    </Modal>
  )
}
