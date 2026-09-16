import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ateliersApi, type Atelier } from '../ateliers/ateliers.api'
import { measurementsApi, type Measurement } from '../measurements/measurements.api'
import { workQueueApi, type WorkItem, type DashboardData } from './workQueue.api'
import { PageHeader } from '../../shared/ui/PageHeader'
import { KpiCard } from '../../shared/ui/KpiCard'
import { SearchBox } from '../../shared/ui/SearchBox'
import { Button } from '../../shared/ui/Button'
import { AuditoriaModal } from './AuditoriaModal'
import { usePermission } from '../permissions/usePermission'
import { useSse } from '../../shared/hooks/useSse'
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue'

const PAGE_SIZE = 100

// Os 3 status de WorkItem relevantes pra essa tela — o filtro de Status abaixo
// so restringe DENTRO desse conjunto, nunca sai dele (por isso e seguro deixar
// o filtro em "Todos" por padrao: mesmo sem nada marcado, o servidor nunca
// devolve lotes em "criado"/"em_producao"/etc., que nao tem nenhuma acao aqui).
const BASE_STATUS = 'descarregado,auditoria_aprovada,auditoria_divergente'

// Status "visual" da tela, igual ao modelo (03_tela_auditoria.html /
// 04_tela_lancamento_estoque.html): combina o status fisico da auditoria com o
// status do lancamento no BaseLinker num unico rotulo/cor por linha. "erro" e
// um estado a mais que o modelo (estatico) nao previa, mas que existe de fato
// quando a chamada pro BaseLinker falha — precisa de alguma cor/acao propria.
type DisplayStatus = 'aguardando' | 'conforme' | 'divergente' | 'lancado_estoque' | 'erro'

const STATUS_META: Record<DisplayStatus, { label: string; bg: string; fg: string; bd: string; btnBg: string; btnLabel: string }> = {
  aguardando: { label: 'Aguardando Auditoria', bg: '#eff6ff', fg: '#1d4ed8', bd: '#bfdbfe', btnBg: '#1e40af', btnLabel: 'Lançar Estoque' },
  conforme: { label: '100% Conforme', bg: '#dcfce7', fg: '#15803d', bd: '#86efac', btnBg: '#059669', btnLabel: 'Lançar Estoque' },
  divergente: { label: 'Divergente', bg: '#fef2f2', fg: '#991b1b', bd: '#fca5a5', btnBg: '#d97706', btnLabel: 'Ajustar Estoque' },
  lancado_estoque: { label: 'Estoque Integrado', bg: '#f0fdf4', fg: '#166534', bd: '#bbf7d0', btnBg: '#94a3b8', btnLabel: 'Sincronizado' },
  erro: { label: 'Erro ao Lançar', bg: '#fef2f2', fg: '#991b1b', bd: '#fca5a5', btnBg: '#dc2626', btnLabel: 'Tentar Novamente' },
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'aguardando', label: 'Aguardando Auditoria' },
  { value: 'conforme', label: '100% Conforme' },
  { value: 'divergente', label: 'Com Divergência' },
  { value: 'lancado_estoque', label: 'Lançado no Estoque' },
]

function formatDateTime(value?: string) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function displayStatus(item: WorkItem): DisplayStatus {
  const estoque = item.estoqueBaseLinker?.status
  if (estoque === 'erro') return 'erro'
  if (estoque === 'lancado') return 'lancado_estoque'
  if (item.status === 'auditoria_aprovada') return 'conforme'
  if (item.status === 'auditoria_divergente') return 'divergente'
  return 'aguardando'
}

function statusQueryParams(filtro: string): { status: string; estoqueStatus?: string } {
  switch (filtro) {
    case 'aguardando':
      return { status: 'descarregado' }
    case 'conforme':
      return { status: 'auditoria_aprovada', estoqueStatus: 'pendente,erro' }
    case 'divergente':
      return { status: 'auditoria_divergente', estoqueStatus: 'pendente,erro' }
    case 'lancado_estoque':
      return { status: 'auditoria_aprovada,auditoria_divergente', estoqueStatus: 'lancado' }
    default:
      return { status: BASE_STATUS }
  }
}

const AuditoriaRow = memo(function AuditoriaRow({
  item,
  atelier,
  sku,
  canAuditar,
  canLancar,
  pushing,
  onAuditar,
  onLancarEstoque,
  measureRef,
  dataIndex,
}: {
  item: WorkItem
  atelier?: Atelier
  sku?: string
  canAuditar: boolean
  canLancar: boolean
  pushing: boolean
  onAuditar: (item: WorkItem) => void
  onLancarEstoque: (item: WorkItem) => void
  measureRef: (el: HTMLTableRowElement | null) => void
  dataIndex: number
}) {
  const status = displayStatus(item)
  const meta = STATUS_META[status]
  // Diferente do modelo (que deixa lançar a qualquer momento), aqui o botão de
  // lançamento fica desabilitado enquanto o lote nao tem quantidade auditada —
  // sem isso nao ha o que enviar de forma confiavel pro estoque real da loja.
  const podeLancar = status !== 'aguardando' && status !== 'lancado_estoque'

  return (
    <tr ref={measureRef} data-index={dataIndex}>
      <td className="lya-mono" style={{ fontWeight: 700 }}>
        {item.code}
      </td>
      <td>
        {atelier ? (
          <Link to={`/ateliers/${atelier._id}/mesa`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
            {atelier.nomeFantasia}
          </Link>
        ) : (
          '—'
        )}
      </td>
      <td className="lya-mono" style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
        {formatDateTime(item.statusDates?.descarregadoEm)}
      </td>
      <td>
        <strong>
          {item.specs.larguraBobina}m × {item.specs.comprimentoBobina}m
        </strong>{' '}
        · {item.specs.quantidadeFardo} un. ·{' '}
        <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
          {item.specs.emenda ? 'Com Emenda' : 'Sem Emenda'}
        </span>
      </td>
      <td className="lya-mono" style={{ fontWeight: 700, fontSize: '0.75rem' }}>
        {item.metrics.totalMetros}m <span style={{ color: 'var(--gray-500)', fontWeight: 500 }}>({item.metrics.qtdRolos} rol)</span>
      </td>
      <td className="lya-mono" style={{ color: sku ? 'var(--primary)' : 'var(--gray-400)', fontWeight: 700 }}>
        {sku || 'sem SKU'}
      </td>
      <td className="lya-mono" style={{ fontWeight: 700 }}>
        {item.quantidadeAuditada ?? '—'}
      </td>
      <td>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.6875rem',
            fontWeight: 800,
            padding: '0.3rem 0.7rem',
            borderRadius: 20,
            background: meta.bg,
            color: meta.fg,
            border: `1px solid ${meta.bd}`,
          }}
        >
          {meta.label}
        </span>
        {status === 'erro' && item.estoqueBaseLinker?.ultimoErro && (
          <div style={{ fontSize: '0.6875rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
            {item.estoqueBaseLinker.ultimoErro}
          </div>
        )}
      </td>
      <td
        style={{
          color: status === 'divergente' || status === 'erro' ? '#b91c1c' : 'var(--gray-500)',
          fontWeight: status === 'divergente' || status === 'erro' ? 700 : 400,
        }}
      >
        {item.observacao || '—'}
      </td>
      <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {canAuditar && (
          <Button style={{ padding: '0.35rem 0.6rem' }} onClick={() => onAuditar(item)}>
            <i className="fa-solid fa-magnifying-glass" /> Auditar
          </Button>
        )}
        {canLancar && (
          <Button
            style={{ padding: '0.35rem 0.6rem', background: podeLancar ? meta.btnBg : undefined, color: podeLancar ? '#fff' : undefined }}
            disabled={!podeLancar || !sku || pushing}
            title={status === 'aguardando' ? 'Audite o lote antes de lançar no estoque' : undefined}
            onClick={() => onLancarEstoque(item)}
          >
            <i className="fa-solid fa-rocket" /> {pushing ? 'Lançando...' : meta.btnLabel}
          </Button>
        )}
      </td>
    </tr>
  )
})

export function AuditoriaPage() {
  const [items, setItems] = useState<WorkItem[]>([])
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [ateliers, setAteliers] = useState<Atelier[]>([])
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  // Igual ao modelo: nenhum filtro marcado ao carregar ("Todos os Ateliês" /
  // "Todos os Status"), mostrando de cara tudo que e relevante pra essa tela.
  const [atelierFiltro, setAtelierFiltro] = useState('all')
  const [statusFiltro, setStatusFiltro] = useState('all')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [modalItem, setModalItem] = useState<WorkItem | null>(null)
  const [pushingId, setPushingId] = useState<string | null>(null)
  const { can } = usePermission()
  const canAuditar = can('work-queue:advance')
  const canLancar = can('work-queue:baselinker-push')
  const parentRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)

  const search = useDebouncedValue(searchInput, 300)

  const queryParams = useMemo(
    () => ({
      atelierId: atelierFiltro === 'all' ? undefined : atelierFiltro,
      ...statusQueryParams(statusFiltro),
      q: search,
    }),
    [atelierFiltro, statusFiltro, search]
  )

  // Lista paginada no servidor (mesmo padrao do Dashboard) em vez de trazer
  // tudo de uma vez — com virtualizacao de linhas a rolagem fica leve mesmo
  // com muitos registros, mas a busca/filtro no servidor evita fatiar em memoria
  // uma tabela que pode crescer bastante com o tempo.
  useEffect(() => {
    setLoading(true)
    Promise.all([
      workQueueApi.dashboard(),
      workQueueApi.listPaged({ ...queryParams, page: 1, limit: PAGE_SIZE }),
      ateliersApi.list(),
      measurementsApi.list(),
    ]).then(([d, p, a, m]) => {
      setDashboard(d)
      setItems(p.items)
      setPage(1)
      setHasMore(p.items.length === PAGE_SIZE && p.items.length < p.total)
      setAteliers(a)
      setMeasurements(m)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams])

  async function loadMore() {
    if (loadingMoreRef.current || !hasMore) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const next = page + 1
      const p = await workQueueApi.listPaged({ ...queryParams, page: next, limit: PAGE_SIZE })
      setItems((prev) => (p.items.length > 0 ? [...prev, ...p.items] : prev))
      setPage(p.page)
      setHasMore(p.items.length === PAGE_SIZE && items.length + p.items.length < p.total)
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (loading || loadingMore || !hasMore) return
    const el = parentRef.current
    if (el && el.scrollHeight <= el.clientHeight) {
      loadMore()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, loading, loadingMore, hasMore])

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    if (loadingMore || !hasMore) return
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      loadMore()
    }
  }

  const patchItem = useCallback((updated: WorkItem) => {
    setItems((prev) => {
      const index = prev.findIndex((i) => i._id === updated._id)
      if (index === -1) return prev
      if (JSON.stringify(prev[index]) === JSON.stringify(updated)) return prev
      const next = prev.slice()
      next[index] = updated
      return next
    })
  }, [])

  useSse<{ item: WorkItem }>({
    eventName: 'workItemUpdated',
    onEvent: ({ item }) => patchItem(item),
  })

  const atelierById = useMemo(() => new Map(ateliers.map((a) => [a._id, a])), [ateliers])
  const measurementById = useMemo(() => new Map(measurements.map((m) => [m._id, m])), [measurements])

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 8,
  })

  async function handleLancarEstoque(item: WorkItem) {
    setPushingId(item._id)
    try {
      const updated = await workQueueApi.lancarEstoqueBaseLinker(item._id)
      patchItem(updated)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Não foi possível lançar o estoque no BaseLinker')
    } finally {
      setPushingId(null)
    }
  }

  if (loading) {
    return (
      <div className="lya-container">
        <p className="lya-empty-state">Carregando...</p>
      </div>
    )
  }

  const virtualRows = rowVirtualizer.getVirtualItems()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const paddingBottom = virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0

  return (
    <div className="lya-container">
      <PageHeader
        title="Auditoria de Lotes & Descarregamento"
        subtitle="Conferência física de fardos descarregados e lançamento do estoque real no BaseLinker"
      />

      <div className="lya-kpi-grid">
        <KpiCard label="Aguardando Auditoria" value={dashboard?.auditoria.aguardando ?? 0} />
        <KpiCard label="100% Conformes" value={dashboard?.auditoria.conforme ?? 0} tone="success" />
        <KpiCard label="Com Divergência" value={dashboard?.auditoria.divergente ?? 0} tone="warning" />
        <KpiCard label="Lançados no BaseLinker" value={dashboard?.auditoria.lancadoEstoque ?? 0} tone="success" />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
        <div>
          <label className="lya-label">Ateliê Parceiro</label>
          <select className="lya-input" value={atelierFiltro} onChange={(e) => setAtelierFiltro(e.target.value)}>
            <option value="all">Todos os Ateliês</option>
            {ateliers.map((a) => (
              <option key={a._id} value={a._id}>
                {a.nomeFantasia} ({a.siglaLote})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="lya-label">Status da Auditoria</label>
          <select className="lya-input" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label className="lya-label">Buscar por Lote</label>
          <SearchBox value={searchInput} onChange={setSearchInput} placeholder="Ex: BN-0012..." />
        </div>
      </div>

      <div ref={parentRef} onScroll={handleScroll} style={{ overflow: 'auto', maxHeight: '70vh' }}>
        <table className="lya-table">
          <thead>
            <tr>
              <th>Lote</th>
              <th>Ateliê Parceiro</th>
              <th>Chegada Barracão</th>
              <th>Especificação do Fardo</th>
              <th>Metros & Fitas</th>
              <th>SKU BaseLinker</th>
              <th>Qtd Auditada</th>
              <th>Status da Auditoria</th>
              <th>Divergência / Observação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td colSpan={10} style={{ height: paddingTop, padding: 0, border: 0 }} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const item = items[virtualRow.index]
              const measurement = measurementById.get(item.specs.measurementId || '')
              return (
                <AuditoriaRow
                  key={item._id}
                  item={item}
                  atelier={atelierById.get(item.atelierId)}
                  sku={measurement?.sku}
                  canAuditar={canAuditar}
                  canLancar={canLancar}
                  pushing={pushingId === item._id}
                  onAuditar={setModalItem}
                  onLancarEstoque={handleLancarEstoque}
                  measureRef={rowVirtualizer.measureElement}
                  dataIndex={virtualRow.index}
                />
              )
            })}
            {paddingBottom > 0 && (
              <tr>
                <td colSpan={10} style={{ height: paddingBottom, padding: 0, border: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
        {items.length === 0 && <p className="lya-empty-state">Nenhum fardo encontrado.</p>}
        {loadingMore && <p className="lya-empty-state">Carregando mais...</p>}
      </div>

      {modalItem && (
        <AuditoriaModal
          item={modalItem}
          onClose={() => setModalItem(null)}
          onSaved={(updated) => {
            patchItem(updated)
            setModalItem(null)
          }}
        />
      )}
    </div>
  )
}
