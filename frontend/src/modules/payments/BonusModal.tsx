import { useState } from 'react'
import { Modal } from '../../shared/ui/Modal'
import { Button } from '../../shared/ui/Button'
import { NumberInput } from '../../shared/ui/NumberInput'
import { workQueueApi, type WorkItem } from '../work-queue/workQueue.api'

export function BonusModal({
  items,
  onClose,
  onApplied,
}: {
  items: WorkItem[]
  onClose: () => void
  onApplied: (updated: WorkItem[]) => void
}) {
  const [percentage, setPercentage] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isBulk = items.length > 1
  const totalOrcamento = items.reduce((s, i) => s + (i.metrics.orcamento || 0), 0)
  const bonusPreview = Math.round(((totalOrcamento * percentage) / 100) * 100) / 100
  const totalPreview = Math.round((totalOrcamento + bonusPreview) * 100) / 100

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    try {
      const updated = await workQueueApi.applyBonusBulk(
        items.map((i) => i._id),
        percentage
      )
      onApplied(updated)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível aplicar o bônus')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isBulk ? `Aplicar Bônus a ${items.length} Lotes` : `Aplicar Bônus — ${items[0].code}`}
      icon="fa-star"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Aplicando...' : 'Aplicar Bônus'}
          </Button>
        </>
      }
    >
      <div style={{ marginBottom: '0.875rem' }}>
        <label className="lya-label">Percentual de Bônus (%)</label>
        <NumberInput value={percentage} onChange={setPercentage} min={0} max={100} step={1} />
      </div>

      <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius)', padding: '1rem' }}>
        <Row label={isBulk ? `Valor Base (${items.length} lotes)` : 'Valor Base do Lote'} value={`R$ ${totalOrcamento.toFixed(2)}`} />
        <Row label={`Bônus (${percentage}%)`} value={`+ R$ ${bonusPreview.toFixed(2)}`} color="var(--success)" />
        <Row label="Total com Bônus" value={`R$ ${totalPreview.toFixed(2)}`} bold />
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.75rem' }}>
        {isBulk
          ? 'Aplica o mesmo percentual a todos os lotes selecionados, substituindo qualquer bônus já aplicado individualmente.'
          : items[0].bonus
            ? `Bônus atual aplicado: R$ ${items[0].bonus.toFixed(2)}. Aplicar de novo substitui esse valor.`
            : ''}
      </p>

      {error && <p className="lya-form-error">{error}</p>}
    </Modal>
  )
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' }}>
      <span style={{ color: 'var(--gray-600)', fontSize: '0.8125rem' }}>{label}</span>
      <span className="lya-mono" style={{ fontWeight: bold ? 800 : 700, color: color || 'var(--gray-800)' }}>
        {value}
      </span>
    </div>
  )
}
