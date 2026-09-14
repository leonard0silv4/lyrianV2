import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { workQueueApi, type WorkItem, type WorkItemStatus } from './workQueue.api'
import { useAuth } from '../auth/AuthContext'
import { NEXT_ACTION, atelierCanAdvance } from './stageFlow'
import { PAYMENT_LABELS, STATUS_LABELS } from '../../shared/ui/Badge'

const TABS: Array<{ key: string; label: string; statuses?: WorkItemStatus[] }> = [
  { key: 'todos', label: 'Todos' },
  { key: 'aguardando', label: 'Aguardando', statuses: ['criado', 'em_atelie'] },
  { key: 'em_producao', label: 'Em Costura', statuses: ['em_producao'] },
  { key: 'pronto', label: 'Prontos', statuses: ['pronto'] },
  { key: 'coletado', label: 'Coletados', statuses: ['coletado', 'descarregado'] },
  { key: 'pago', label: 'Pagos', statuses: ['auditoria_aprovada'] },
]

function formatDate(value?: string) {
  if (!value) return '--'
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function PortalAtelierPage() {
  const [items, setItems] = useState<WorkItem[]>([])
  const [tab, setTab] = useState('todos')
  const [loading, setLoading] = useState(true)
  const { principal, logout } = useAuth()
  const navigate = useNavigate()

  function loadInitial() {
    setLoading(true)
    workQueueApi.list().then((data) => {
      setItems(data)
      setLoading(false)
    })
  }

  function patchItem(updated: WorkItem) {
    setItems((prev) => prev.map((i) => (i._id === updated._id ? updated : i)))
  }

  useEffect(() => {
    loadInitial()
  }, [])

  const filtered = useMemo(() => {
    const activeTab = TABS.find((t) => t.key === tab)
    if (!activeTab?.statuses) return items
    return items.filter((i) => activeTab.statuses!.includes(i.status))
  }, [items, tab])

  const finance = useMemo(() => {
    const emAtelie = items.filter((i) => ['criado', 'em_atelie', 'em_producao', 'pronto'].includes(i.status))
    const liberado = items.filter((i) => ['coletado', 'descarregado', 'auditoria_aprovada'].includes(i.status))
    const sum = (list: WorkItem[]) => list.reduce((s, i) => s + (i.metrics.orcamento || 0), 0)
    const sumMetros = (list: WorkItem[]) => list.reduce((s, i) => s + (i.metrics.totalMetros || 0), 0)
    return {
      atelieValor: Math.round(sum(emAtelie) * 100) / 100,
      atelieMetros: Math.round(sumMetros(emAtelie) * 100) / 100,
      atelieCount: emAtelie.length,
      liberadoValor: Math.round(sum(liberado) * 100) / 100,
      liberadoMetros: Math.round(sumMetros(liberado) * 100) / 100,
      liberadoCount: liberado.length,
    }
  }, [items])

  async function handleAdvance(item: WorkItem) {
    const action = NEXT_ACTION[item.status]
    if (!action) return
    try {
      const updated = await workQueueApi.transition(item._id, action.toStatus)
      patchItem(updated)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Não foi possível avançar a etapa')
    }
  }

  function handleLogout() {
    logout()
    navigate('/login-atelie')
  }

  if (loading) {
    return (
      <div className="lya-portal">
        <p className="lya-empty-state">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="lya-portal">
      <div className="lya-portal-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
          <div className="lya-portal-avatar">{principal?.username?.slice(0, 2).toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.9375rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {principal?.username}
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Portal do Ateliê</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            color: '#fff',
            width: 36,
            height: 36,
            borderRadius: 8,
            cursor: 'pointer',
          }}
          aria-label="Sair"
        >
          <i className="fa-solid fa-right-from-bracket" />
        </button>
      </div>

      <div className="lya-portal-container">
        <div className="lya-finance-panel">
          <div className="lya-finance-card liberado">
            <div className="lya-fin-top">Pgto Liberado</div>
            <div className="lya-fin-val">R$ {finance.liberadoValor.toFixed(2)}</div>
            <div className="lya-fin-sub">
              {finance.liberadoCount} lotes · {finance.liberadoMetros}m
            </div>
          </div>
          <div className="lya-finance-card atelie">
            <div className="lya-fin-top">Valores em Ateliê</div>
            <div className="lya-fin-val">R$ {finance.atelieValor.toFixed(2)}</div>
            <div className="lya-fin-sub">
              {finance.atelieCount} lotes · {finance.atelieMetros}m
            </div>
          </div>
        </div>

        <div className="lya-portal-tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`lya-portal-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="lya-empty-state">Nenhum lote nesta etapa.</p>
        ) : (
          filtered.map((item) => (
            <PortalLoteCard key={item._id} item={item} onAdvance={() => handleAdvance(item)} />
          ))
        )}
      </div>
    </div>
  )
}

function PortalLoteCard({ item, onAdvance }: { item: WorkItem; onAdvance: () => void }) {
  const action = NEXT_ACTION[item.status]
  const canAdvance = atelierCanAdvance(item.status)
  const isPago = item.status === 'auditoria_aprovada'

  return (
    <div className={`lya-portal-card ${item.status}`}>
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
            color: isPago ? '#fde047' : 'var(--gray-700)',
          }}
        >
          {STATUS_LABELS[item.status]}
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
            <span style={{ fontWeight: 800, color: isPago ? '#d1fae5' : 'var(--gray-600)' }}>Valor Mão de Obra</span>
            <span className="lya-valor-destaque">R$ {item.metrics.orcamento.toFixed(2)}</span>
          </div>
        )}
      </div>

      {action && canAdvance ? (
        <button className="lya-btn-mobile-action" style={{ background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', color: '#fff' }} onClick={onAdvance}>
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
    </div>
  )
}

function DateChip({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: '0.5625rem', fontWeight: 800, color: dark ? '#a7f3d0' : 'var(--gray-500)', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontWeight: 700, color: dark ? '#fff' : 'var(--gray-800)' }}>{value}</span>
    </div>
  )
}
