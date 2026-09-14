import { useState } from 'react'
import { Badge, PAYMENT_LABELS, STATUS_LABELS } from '../../shared/ui/Badge'
import { ChecklistRow } from '../../shared/ui/ChecklistRow'
import { CHECKLIST_STEPS, NEXT_ACTION, atelierCanAdvance, isStepDone, previousStatus } from './stageFlow'
import { workQueueApi, type WorkItem } from './workQueue.api'
import { usePermission } from '../permissions/usePermission'
import { printLoteLabel } from './printLabel'
import { IconButton } from '../../shared/ui/IconButton'
import { ObservacaoModal } from './ObservacaoModal'
import { RatingModal } from './RatingModal'
import { EditSpecsModal } from './EditSpecsModal'

const ACTION_CLASS: Record<string, string> = {
  coletado: 'coletado',
  auditoria_aprovada: 'coletado',
  pronto: 'pronto',
}

export function LoteCard({
  item,
  onAdvance,
  onReprocess,
  onUpdated,
  selectable,
  selected,
  onToggleSelect,
  atelierNome,
}: {
  item: WorkItem
  onAdvance: () => void
  onReprocess?: () => void
  onUpdated?: (updated: WorkItem) => void
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  atelierNome?: string
}) {
  const { isOwner, isAtelier } = usePermission()
  const action = NEXT_ACTION[item.status]
  const isDivergente = item.status === 'auditoria_divergente'
  const canShowAction = !isAtelier || atelierCanAdvance(item.status)
  const showFinance = isOwner || isAtelier
  const showAdminTools = !isAtelier && onUpdated

  const [modal, setModal] = useState<'observacao' | 'rating' | 'specs' | null>(null)

  async function handleToggleArchive() {
    if (!onUpdated) return
    if (!confirm(`Arquivar o lote ${item.code}? Ele sairá da lista principal.`)) return
    const updated = await workQueueApi.setArchived(item._id, true)
    onUpdated(updated)
  }

  async function handleRevertStep(stepStatus: WorkItem['status'], stepLabel: string) {
    if (!onUpdated) return
    const target = previousStatus(stepStatus)
    if (!target) return
    const motivo = window.prompt(`Motivo para desfazer "${stepLabel}" (o lote volta pra etapa anterior):`)
    if (!motivo) return
    try {
      const updated = await workQueueApi.revert(item._id, target, motivo)
      onUpdated(updated)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Não foi possível desfazer esta etapa')
    }
  }

  return (
    <div className="lya-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {selectable && (
            <input type="checkbox" className="lya-lote-checkbox" checked={Boolean(selected)} onChange={onToggleSelect} />
          )}
          <span className="lya-mono" style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
            {item.code}
          </span>
        </div>
        <Badge variant="status" value={item.status}>
          {isDivergente ? STATUS_LABELS.auditoria_divergente : STATUS_LABELS[item.status]}
        </Badge>
      </div>

      <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
        {item.specs.percentualSombreamento}% · {item.specs.corTecido} · {item.specs.larguraBobina}m ×{' '}
        {item.specs.comprimentoBobina}m · {item.specs.quantidadeFardo} telas
        {item.specs.emenda && ' · Com Emenda'}
      </div>

      <div className="lya-mono" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>
        {item.metrics.totalMetros}m · {item.metrics.qtdRolos} rolos
        {showFinance && item.metrics.orcamento !== undefined && ` · R$ ${item.metrics.orcamento.toFixed(2)}`}
      </div>

      {item.rating ? (
        <div style={{ marginBottom: '0.5rem', color: '#fbbf24', fontSize: '0.75rem' }}>
          {'★'.repeat(item.rating)}
          <span style={{ color: 'var(--gray-300)' }}>{'★'.repeat(5 - item.rating)}</span>
        </div>
      ) : null}

      {item.observacao ? (
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--gray-600)',
            background: 'var(--gray-50)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.5rem 0.625rem',
            marginBottom: '0.5rem',
          }}
        >
          <i className="fa-solid fa-note-sticky" style={{ marginRight: '0.35rem', color: 'var(--gray-400)' }} />
          {item.observacao}
        </div>
      ) : null}

      {showFinance && item.paymentStatus && (
        <div style={{ marginBottom: '0.5rem' }}>
          <Badge variant="payment" value={item.paymentStatus}>
            {PAYMENT_LABELS[item.paymentStatus]}
          </Badge>
        </div>
      )}

      <div style={{ marginBottom: '0.75rem' }}>
        {CHECKLIST_STEPS.map((step) => {
          const done = isStepDone(item.status, step.status)
          return (
            <ChecklistRow
              key={step.status}
              label={step.label}
              done={done}
              timestamp={step.dateField ? item.statusDates?.[step.dateField] : undefined}
              onRevert={
                isOwner && onUpdated && done && previousStatus(step.status)
                  ? () => handleRevertStep(step.status, step.label)
                  : undefined
              }
            />
          )
        })}
      </div>

      {showAdminTools && (
        <div className="lya-icon-toolbar">
          {atelierNome && (
            <IconButton
              icon="fa-print"
              variant="neutral"
              title="Imprimir etiqueta"
              onClick={() => printLoteLabel(item, atelierNome)}
            />
          )}
          <IconButton icon="fa-note-sticky" variant="info" title="Observação" onClick={() => setModal('observacao')} />
          <IconButton icon="fa-star" variant="warning" title="Avaliar" onClick={() => setModal('rating')} />
          <IconButton icon="fa-ruler-combined" variant="purple" title="Editar medidas" onClick={() => setModal('specs')} />
          <IconButton icon="fa-box-archive" variant="danger" title="Arquivar" onClick={handleToggleArchive} />
        </div>
      )}

      {isDivergente && onReprocess && !isAtelier ? (
        <button className="lya-lote-action-btn danger" onClick={onReprocess}>
          <i className="fa-solid fa-rotate-left" /> Reprocessar
        </button>
      ) : action && canShowAction ? (
        <button
          className={`lya-lote-action-btn ${ACTION_CLASS[action.toStatus] || ''}`.trim()}
          onClick={onAdvance}
        >
          <i className={`fa-solid ${action.icon}`} /> {action.label}
        </button>
      ) : null}

      {modal === 'observacao' && (
        <ObservacaoModal
          item={item}
          onClose={() => setModal(null)}
          onSaved={(updated) => {
            onUpdated?.(updated)
            setModal(null)
          }}
        />
      )}
      {modal === 'rating' && (
        <RatingModal
          item={item}
          onClose={() => setModal(null)}
          onSaved={(updated) => {
            onUpdated?.(updated)
            setModal(null)
          }}
        />
      )}
      {modal === 'specs' && (
        <EditSpecsModal
          item={item}
          onClose={() => setModal(null)}
          onSaved={(updated) => {
            onUpdated?.(updated)
            setModal(null)
          }}
        />
      )}
    </div>
  )
}
