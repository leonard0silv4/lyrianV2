import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { workQueueApi, type WorkItem, type WorkItemStatus } from './workQueue.api'
import { useAuth } from '../auth/AuthContext'
import { NEXT_ACTION } from './stageFlow'
import { useSse } from '../../shared/hooks/useSse'
import { useToast } from '../../shared/ui/toast/ToastProvider'
import { LoadingState } from '../../shared/ui/LoadingState'
import { SearchBox } from '../../shared/ui/SearchBox'
import { PortalLoteCard } from './PortalLoteCard'
import { PortalBottomNav } from './PortalBottomNav'
import { AtelierInfoSheet } from '../ateliers/AtelierInfoSheet'
import { ateliersApi, type Atelier } from '../ateliers/ateliers.api'

const TABS: Array<{ key: string; label: string; icon: string; statuses?: WorkItemStatus[] }> = [
  { key: 'todos', label: 'Todos', icon: 'fa-layer-group' },
  { key: 'aguardando', label: 'Aguardando', icon: 'fa-clock', statuses: ['criado', 'em_atelie'] },
  { key: 'em_producao', label: 'Em Costura', icon: 'fa-scissors', statuses: ['em_producao'] },
  { key: 'pronto', label: 'Prontos', icon: 'fa-box-open', statuses: ['pronto'] },
  { key: 'coletado', label: 'Coletados', icon: 'fa-truck', statuses: ['coletado', 'descarregado'] },
  { key: 'pago', label: 'Pagos', icon: 'fa-money-bill-wave', statuses: ['auditoria_aprovada'] },
]

export function PortalAtelierPage() {
  const [items, setItems] = useState<WorkItem[]>([])
  const [atelier, setAtelier] = useState<Atelier | null>(null)
  const [tab, setTab] = useState('todos')
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [sheetAberta, setSheetAberta] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const { principal, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  function loadInitial() {
    setLoading(true)
    Promise.all([workQueueApi.list(), ateliersApi.list()]).then(([workItems, ateliers]) => {
      setItems(workItems)
      setAtelier(ateliers[0] || null)
      setLoading(false)
    })
  }

  function patchItem(updated: WorkItem) {
    setItems((prev) => prev.map((i) => (i._id === updated._id ? updated : i)))
  }

  useEffect(() => {
    loadInitial()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  useSse<{ item: WorkItem }>({
    eventName: 'workItemUpdated',
    onEvent: ({ item }) => {
      setItems((prev) => (prev.some((i) => i._id === item._id) ? prev.map((i) => (i._id === item._id ? item : i)) : prev))
    },
  })

  const filtered = useMemo(() => {
    const activeTab = TABS.find((t) => t.key === tab)
    const termo = busca.trim().toLowerCase()
    return items
      .filter((i) => !activeTab?.statuses || activeTab.statuses.includes(i.status))
      .filter((i) => !termo || i.code.toLowerCase().includes(termo))
  }, [items, tab, busca])

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
      toast.error(err.response?.data?.message || 'Não foi possível avançar a etapa')
    }
  }

  function handleLogout() {
    logout()
    navigate('/login-atelie')
  }

  function handleTabChange(newTab: string) {
    setTab(newTab)
    setBusca('')
  }

  if (loading) {
    return (
      <div className="lya-portal">
        <LoadingState />
      </div>
    )
  }

  return (
    <div className="lya-portal">
      <div className="lya-portal-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, cursor: 'pointer' }} onClick={() => setSheetAberta(true)}>
          <div className="lya-portal-avatar">{principal?.username?.slice(0, 2).toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.9375rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {principal?.username}
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Portal do Ateliê</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {atelier && (
            <button className="lya-adiantamento-badge" onClick={() => setSheetAberta(true)} title="Adiantamento pelo Serviço">
              <i className="fa-solid fa-sack-dollar" />
              <span>R$ {(atelier.saldoAdiantamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </button>
          )}
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
      </div>

      <div className="lya-portal-container">
        <div className="lya-finance-panel">
          <div className="lya-finance-card liberado">
            <div className="lya-fin-top">
              <span>Pgto Liberado</span>
              <i className="fa-solid fa-truck-fast" />
            </div>
            <div className="lya-fin-val">R$ {finance.liberadoValor.toFixed(2)}</div>
            <div className="lya-fin-sub">
              {finance.liberadoCount} lotes · {finance.liberadoMetros}m
            </div>
          </div>
          <div className="lya-finance-card atelie">
            <div className="lya-fin-top">
              <span>Valores em Ateliê</span>
              <i className="fa-solid fa-hourglass-half" />
            </div>
            <div className="lya-fin-val">R$ {finance.atelieValor.toFixed(2)}</div>
            <div className="lya-fin-sub">
              {finance.atelieCount} lotes · {finance.atelieMetros}m
            </div>
          </div>
        </div>

        <SearchBox value={busca} onChange={setBusca} placeholder="Buscar número do lote..." />

        <div className="lya-portal-tabs" style={{ marginTop: '1rem' }}>
          {TABS.map((t) => (
            <button key={t.key} className={`lya-portal-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              <i className={`fa-solid ${t.icon}`} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="lya-empty-state">Nenhum lote encontrado.</p>
        ) : (
          filtered.map((item) => (
            <PortalLoteCard key={item._id} item={item} now={now} onAdvance={() => handleAdvance(item)} />
          ))
        )}
      </div>

      <PortalBottomNav tab={tab} onTabChange={handleTabChange} onAtelieClick={() => setSheetAberta(true)} />

      {sheetAberta && atelier && <AtelierInfoSheet atelier={atelier} onClose={() => setSheetAberta(false)} />}
    </div>
  )
}
