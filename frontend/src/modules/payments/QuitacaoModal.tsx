import { useState } from 'react'
import { Modal } from '../../shared/ui/Modal'
import { Button } from '../../shared/ui/Button'
import { paymentsApi, type PaymentBatch } from './payments.api'
import type { Atelier } from '../ateliers/ateliers.api'
import type { WorkItem } from '../work-queue/workQueue.api'

export function QuitacaoModal({
  atelier,
  items,
  desconto,
  onClose,
  onPaid,
}: {
  atelier: Atelier
  items: WorkItem[]
  desconto: number
  onClose: () => void
  onPaid: (batch: PaymentBatch) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalBruto = items.reduce((s, i) => s + (i.metrics.orcamento || 0) + (i.bonus || 0), 0)
  const descontoAplicado = Math.min(desconto, totalBruto, atelier.saldoAdiantamento || 0)
  const totalLiquido = totalBruto - descontoAplicado
  const totalMetros = items.reduce((s, i) => s + (i.metrics.totalMetros || 0), 0)

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      const batch = await paymentsApi.createBatch({
        atelierId: atelier._id,
        workItemIds: items.map((i) => i._id),
        desconto: descontoAplicado,
      })
      onPaid(batch)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível quitar o pagamento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Confirmar Quitação PIX"
      subtitle="Transferência Bancária"
      icon="fa-money-bill-wave"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleConfirm} disabled={saving}>
            {saving ? 'Confirmando...' : 'Confirmar Quitação PIX'}
          </Button>
        </>
      }
    >
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          background: '#fffbeb',
          border: '1.5px solid #fde68a',
          borderRadius: 'var(--radius)',
          padding: '0.875rem 1rem',
        }}
      >
        <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--warning)', marginTop: 2 }} />
        <div style={{ fontSize: '0.8125rem' }}>
          <strong>Atenção: ação irreversível.</strong> Ao confirmar, todos os lotes serão marcados como PAGO com
          data/hora, tornando-se imutáveis e gerando o comprovante no extrato.
        </div>
      </div>

      <div className="lya-card" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <Field label="Beneficiário / Ateliê" value={atelier.nomeFantasia} />
          <Field label="Chave PIX" value={atelier.chavePix || '—'} mono />
          <Field label="Banco de Destino" value={atelier.banco || '—'} />
          <Field label="Lotes Inclusos" value={`${items.length} fardos (${totalMetros.toFixed(0)}m)`} />
        </div>

        <div style={{ background: 'var(--gray-50)', border: '2px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
          <SummaryRow label="Total Bruto da Produção" value={`R$ ${totalBruto.toFixed(2)}`} />
          <SummaryRow label="(-) Desconto de Adiantamento" value={`- R$ ${descontoAplicado.toFixed(2)}`} color="var(--warning)" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
            <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.875rem' }}>(=) Valor Total (PIX)</span>
            <span className="lya-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>
              R$ {totalLiquido.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {error && <p className="lya-form-error">{error}</p>}
    </Modal>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="lya-kpi-label">{label}</div>
      <div className={mono ? 'lya-mono' : ''} style={{ fontWeight: 700 }}>
        {value}
      </div>
    </div>
  )
}

function SummaryRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        paddingBottom: '0.75rem',
        marginBottom: '0.75rem',
        borderBottom: '2px dashed var(--gray-200)',
      }}
    >
      <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>{label}</span>
      <span className="lya-mono" style={{ fontWeight: 700, color: color || 'var(--gray-800)' }}>
        {value}
      </span>
    </div>
  )
}
