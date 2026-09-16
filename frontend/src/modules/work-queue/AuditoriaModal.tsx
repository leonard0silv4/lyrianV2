import { useState } from 'react'
import { Modal } from '../../shared/ui/Modal'
import { Button } from '../../shared/ui/Button'
import { NumberInput } from '../../shared/ui/NumberInput'
import { workQueueApi, type WorkItem } from './workQueue.api'

export function AuditoriaModal({
  item,
  onClose,
  onSaved,
}: {
  item: WorkItem
  onClose: () => void
  onSaved: (updated: WorkItem) => void
}) {
  // Reabrir a auditoria de um lote ja conferido pre-preenche com o que foi
  // registrado da ultima vez (igual ao modelo), em vez de sempre comecar do zero.
  const [divergente, setDivergente] = useState(item.status === 'auditoria_divergente')
  const [quantidadeReal, setQuantidadeReal] = useState(item.quantidadeAuditada ?? item.specs.quantidadeFardo)
  const [observacao, setObservacao] = useState(item.status === 'auditoria_divergente' ? item.observacao || '' : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (divergente && (!observacao.trim() || observacao.trim().length < 5)) {
      setError('Descreva a divergência encontrada (mínimo 5 caracteres)')
      return
    }
    if (divergente && (!quantidadeReal || quantidadeReal < 1 || quantidadeReal > 50)) {
      setError('Informe uma quantidade entre 1 e 50')
      return
    }

    setSaving(true)
    try {
      const updated = await workQueueApi.auditar(item._id, {
        toStatus: divergente ? 'auditoria_divergente' : 'auditoria_aprovada',
        quantidadeAuditada: divergente ? quantidadeReal : item.specs.quantidadeFardo,
        observacao: divergente ? observacao.trim() : '100% Conforme',
      })
      onSaved(updated)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível salvar a auditoria')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Auditoria Física · Lote ${item.code}`}
      subtitle={`Medida: ${item.specs.larguraBobina}x${item.specs.comprimentoBobina}m · Planejado: ${item.specs.quantidadeFardo} un.`}
      icon="fa-shield-halved"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            {saving ? 'Salvando...' : 'Salvar Auditoria'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <button
          type="button"
          className={`lya-btn ${!divergente ? 'lya-btn-primary' : ''}`}
          style={{ justifyContent: 'center' }}
          onClick={() => setDivergente(false)}
        >
          <i className="fa-solid fa-check" /> 100% Conforme
        </button>
        <button
          type="button"
          className={`lya-btn ${divergente ? 'lya-btn-danger' : ''}`}
          style={{ justifyContent: 'center' }}
          onClick={() => setDivergente(true)}
        >
          <i className="fa-solid fa-triangle-exclamation" /> Houve Divergência
        </button>
      </div>

      {divergente && (
        <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
          <div>
            <label className="lya-label">Quantidade Real de Telas no Fardo</label>
            <NumberInput value={quantidadeReal} min={1} max={50} onChange={setQuantidadeReal} />
          </div>
          <div>
            <label className="lya-label">Descreva a Divergência Encontrada</label>
            <textarea
              className="lya-input"
              style={{ minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Fardo veio com 9 telas ao invés de 10."
              maxLength={240}
            />
          </div>
        </div>
      )}

      {error && <p className="lya-form-error">{error}</p>}
    </Modal>
  )
}
