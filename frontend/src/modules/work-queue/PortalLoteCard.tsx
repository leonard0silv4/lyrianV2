import { useState } from 'react'
import type { WorkItem } from './workQueue.api'
import { MIN_COSTURA_MS, NEXT_ACTION, atelierCanAdvance } from './stageFlow'
import { PAYMENT_LABELS, STATUS_LABELS } from '../../shared/ui/Badge'
import { BottomSheet } from '../../shared/ui/BottomSheet'
import { InfoPopover } from '../../shared/ui/InfoPopover'

function formatDate(value?: string) {
  if (!value) return '--'
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000)
  const min = Math.floor(totalSeconds / 60)
  const seg = totalSeconds % 60
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`
}

export function PortalLoteCard({ item, now, onAdvance }: { item: WorkItem; now: number; onAdvance: () => void }) {
  const [avisoAberto, setAvisoAberto] = useState(false)
  const action = NEXT_ACTION[item.status]
  const canAdvance = atelierCanAdvance(item.status)
  const isDivergente = item.status === 'auditoria_divergente'
  // Divergente ainda e um lote auditado — pro faccionista ele deve aparecer
  // igual a um lote aprovado (mesma cor, mesmo card de "liberado p/ pagamento"),
  // so com o aviso extra abaixo avisando que foi encontrada uma divergencia.
  const isPago = item.status === 'auditoria_aprovada' || isDivergente

  const emProducaoDesde = item.statusDates?.emProducaoEm
  const remainingMs =
    item.status === 'em_producao' && emProducaoDesde
      ? Math.max(0, MIN_COSTURA_MS - (now - new Date(emProducaoDesde).getTime()))
      : 0
  const travado = item.status === 'em_producao' && remainingMs > 0
  const cardStatusClass = isPago ? 'auditoria_aprovada' : item.status

  return (
    <div className={`lya-portal-card ${cardStatusClass}`}>
      <div className="lya-portal-card-header">
        <span className="lya-portal-card-code">{item.code}</span>
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 800,
            padding: '0.25rem 0.55rem',
            borderRadius: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            background: isPago ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
            color: isPago ? '#fde047' : 'var(--p-gray-700)',
          }}
        >
          {isPago ? STATUS_LABELS.auditoria_aprovada : STATUS_LABELS[item.status]}
          {isDivergente && (
            <InfoPopover
              icon="fa-triangle-exclamation"
              text="Auditado com ressalvas — foi encontrada uma divergência na conferência deste lote."
              align="right"
            />
          )}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          background: isPago ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.03)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.4rem 0.6rem',
          fontSize: '0.6875rem',
        }}
        className="lya-mono"
      >
        <DateChip label="Entrada" value={formatDate(item.statusDates?.emProducaoEm)} dark={isPago} />
        <DateChip label="Coletado" value={formatDate(item.statusDates?.coletadoEm)} dark={isPago} />
        <DateChip label="Pago" value={formatDate(item.dataPgto)} dark={isPago} />
      </div>

      <div className="lya-specs-box">
        <div className="lya-specs-line-main">
          {item.specs.percentualSombreamento}% {item.specs.corTecido} · {item.specs.larguraBobina}m × {item.specs.comprimentoBobina}m
        </div>
        <div className="lya-mono" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
          {item.metrics.totalMetros}m · {item.metrics.qtdRolos} rolos de fita
        </div>
        {item.metrics.orcamento !== undefined && (
          <div className="lya-specs-line-valor">
            <span style={{ fontWeight: 800, color: isPago ? '#d1fae5' : 'var(--p-gray-600)' }}>Valor Mão de Obra</span>
            <span className="lya-valor-destaque">R$ {item.metrics.orcamento.toFixed(2)}</span>
          </div>
        )}
        {!!item.bonus && (
          <div className="lya-specs-line-valor">
            <span style={{ fontWeight: 800, color: isPago ? '#d1fae5' : 'var(--p-gray-600)' }}>Bônus</span>
            <span className="lya-valor-destaque">+R$ {item.bonus.toFixed(2)}</span>
          </div>
        )}
        {!!item.observacao && (
          <div style={{ fontSize: '0.75rem', color: isPago ? 'rgba(255,255,255,0.85)' : 'var(--p-gray-600)' }}>
            <span style={{ fontWeight: 800 }}>Observação: </span>
            {item.observacao}
          </div>
        )}
      </div>

      {travado ? (
        <button className="lya-btn-mobile-action lya-btn-locked" onClick={() => setAvisoAberto(true)}>
          <i className="fa-solid fa-hourglass-half fa-spin" />
          <span>Costura: {formatCountdown(remainingMs)} restantes</span>
        </button>
      ) : action && canAdvance ? (
        <button
          className="lya-btn-mobile-action"
          style={{ background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', color: '#fff' }}
          onClick={onAdvance}
        >
          <i className={`fa-solid ${action.icon}`} /> {action.label}
        </button>
      ) : item.status === 'pronto' ? (
        <div className="lya-info-status-box pronto">Aguardando Coleta</div>
      ) : item.status === 'coletado' || item.status === 'descarregado' ? (
        <div className="lya-info-status-box coletado">Liberado p/ Pagamento</div>
      ) : isPago ? (
        <div className="lya-info-status-box pago">
          {item.paymentStatus === 'pago' ? `Concluído e Quitado no PIX` : PAYMENT_LABELS[item.paymentStatus || 'liberado']}
        </div>
      ) : null}

      {avisoAberto && (
        <BottomSheet onClose={() => setAvisoAberto(false)}>
          <div style={{ textAlign: 'center' }}>
            <div className="lya-lock-icon">
              <i className="fa-solid fa-hourglass-half" />
            </div>
            <h3 className="lya-sheet-alert-title">Costura em Andamento</h3>
            <p className="lya-sheet-alert-text">
              O lote {item.code} está na etapa de costura. Faltam {formatCountdown(remainingMs)} minutos para completar o
              tempo mínimo de confecção (15 min).
            </p>
            <button className="lya-btn-mobile-action lya-btn-dark" onClick={() => setAvisoAberto(false)}>
              <span>Compreendido, continuar costura</span>
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

function DateChip({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: '0.5625rem', fontWeight: 800, color: dark ? '#a7f3d0' : 'var(--p-gray-500)', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontWeight: 700, color: dark ? '#fff' : 'var(--p-gray-800)' }}>{value}</span>
    </div>
  )
}
