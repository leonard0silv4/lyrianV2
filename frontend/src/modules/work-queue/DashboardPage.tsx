import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { workQueueApi, type DashboardData, type WorkItem } from './workQueue.api'
import { ateliersApi, type Atelier } from '../ateliers/ateliers.api'
import { PageHeader } from '../../shared/ui/PageHeader'
import { KpiCard } from '../../shared/ui/KpiCard'
import { SearchBox } from '../../shared/ui/SearchBox'
import { FilterPopover } from '../../shared/ui/FilterPopover'
import { Badge, PAYMENT_LABELS, STATUS_LABELS } from '../../shared/ui/Badge'
import { usePermission } from '../permissions/usePermission'
import { useSse } from '../../shared/hooks/useSse'
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue'

const PAGE_SIZE = 100

const DashboardRow = memo(function DashboardRow({
  item,
  atelier,
  isOwner,
  measureRef,
  dataIndex,
}: {
  item: WorkItem
  atelier?: Atelier
  isOwner: boolean
  measureRef: (el: HTMLTableRowElement | null) => void
  dataIndex: number
}) {
  return (
    <tr ref={measureRef} data-index={dataIndex}>
      <td className="lya-mono">{item.code}</td>
      <td>
        {atelier ? (
          <Link to={`/ateliers/${atelier._id}/mesa`} style={{ color: 'var(--primary)' }}>
            {atelier.nomeFantasia}
          </Link>
        ) : (
          '—'
        )}
      </td>
      <td>
        {item.specs.larguraBobina}m × {item.specs.comprimentoBobina}m · {item.specs.quantidadeFardo}{' '}
        {item.specs.emenda && '· Emenda'}
      </td>
      <td className="lya-mono">{item.metrics.totalMetros} m</td>
      <td>
        <Badge variant="status" value={item.status}>
          {STATUS_LABELS[item.status]}
        </Badge>
      </td>
      {isOwner && (
        <td>
          {item.paymentStatus && (
            <Badge variant="payment" value={item.paymentStatus}>
              {PAYMENT_LABELS[item.paymentStatus]}
            </Badge>
          )}
        </td>
      )}
    </tr>
  )
})

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [items, setItems] = useState<WorkItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [ateliers, setAteliers] = useState<Atelier[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [atelierFilter, setAtelierFilter] = useState<string[]>([])
  const [paymentFilter, setPaymentFilter] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const { isOwner } = usePermission()
  const parentRef = useRef<HTMLDivElement>(null)

  const search = useDebouncedValue(searchInput, 300)

  const queryParams = useMemo(
    () => ({
      status: statusFilter.join(','),
      atelierId: atelierFilter.join(','),
      paymentStatus: paymentFilter.join(','),
      q: search,
    }),
    [statusFilter, atelierFilter, paymentFilter, search]
  )

  // Carrega/recarrega a primeira pagina sempre que filtros ou busca mudam —
  // a busca e os filtros agora rodam no servidor (GET /work-queue paginado),
  // entao a tabela nao depende mais de trazer todos os lotes do sistema de uma vez.
  useEffect(() => {
    setLoading(true)
    Promise.all([
      workQueueApi.dashboard(),
      workQueueApi.listPaged({ ...queryParams, page: 1, limit: PAGE_SIZE }),
      ateliersApi.list(),
    ]).then(([d, p, a]) => {
      setDashboard(d)
      setItems(p.items)
      setTotal(p.total)
      setPage(1)
      setAteliers(a)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams])

  const hasMore = items.length < total

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const next = page + 1
      const p = await workQueueApi.listPaged({ ...queryParams, page: next, limit: PAGE_SIZE })
      setItems((prev) => [...prev, ...p.items])
      setTotal(p.total)
      setPage(p.page)
    } finally {
      setLoadingMore(false)
    }
  }

  // Dispara o carregamento automatico quando a pagina atual nao preenche o
  // container (ex: poucos resultados apos filtro), ja que sem scrollbar o
  // handler de onScroll nunca seria acionado.
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return
    const el = parentRef.current
    if (el && el.scrollHeight <= el.clientHeight) {
      loadMore()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, total, loading, loadingMore, hasMore])

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    if (loadingMore || !hasMore) return
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      loadMore()
    }
  }

  // Mesma logica de patch defensivo do MesaProducaoPage: so troca a
  // referencia do item (e recalcula porStatus) quando o conteudo realmente
  // mudou, evitando re-render de toda a tabela a cada evento SSE redundante.
  const patchItem = useCallback((updated: WorkItem) => {
    setItems((prev) => {
      const index = prev.findIndex((i) => i._id === updated._id)
      if (index === -1) return prev
      const existing = prev[index]
      if (JSON.stringify(existing) === JSON.stringify(updated)) return prev

      if (existing.status !== updated.status) {
        setDashboard((prevDashboard) => {
          if (!prevDashboard) return prevDashboard
          const porStatus = { ...prevDashboard.porStatus }
          porStatus[existing.status] = Math.max(0, (porStatus[existing.status] || 0) - 1)
          porStatus[updated.status] = (porStatus[updated.status] || 0) + 1
          return { ...prevDashboard, porStatus }
        })
      }

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

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 8,
  })

  if (loading || !dashboard) {
    return (
      <div className="lya-container">
        <p className="lya-empty-state">Carregando...</p>
      </div>
    )
  }

  const statusOptions = Object.keys(STATUS_LABELS).map((value) => ({
    value,
    label: STATUS_LABELS[value],
    count: dashboard.porStatus[value] || 0,
  }))
  const atelierOptions = ateliers.map((a) => ({ value: a._id, label: a.nomeFantasia }))
  const paymentOptions = Object.keys(PAYMENT_LABELS).map((value) => ({ value, label: PAYMENT_LABELS[value] }))
  const numCols = isOwner ? 6 : 5

  const virtualRows = rowVirtualizer.getVirtualItems()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const paddingBottom = virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0

  return (
    <div className="lya-container">
      <PageHeader title="Dashboard de Produção" subtitle="Visão geral dos ateliês e da fila de trabalho" />

      <div className="lya-kpi-grid">
        <KpiCard label="Total de Lotes" value={dashboard.totalLotes} />
        <KpiCard label="Total de Metros" value={`${dashboard.totalMetros} m`} />
        {isOwner && dashboard.pagamento && (
          <>
            <KpiCard label="Lotes p/ Pagamento" value={dashboard.pagamento.lotesLiberados} tone="warning" />
            <KpiCard label="Valor Liberado" value={`R$ ${dashboard.pagamento.valorLiberado.toFixed(2)}`} tone="success" />
          </>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
        <FilterPopover label="Ateliê" options={atelierOptions} selected={atelierFilter} onChange={setAtelierFilter} />
        <FilterPopover label="Status" options={statusOptions} selected={statusFilter} onChange={setStatusFilter} />
        {isOwner && (
          <FilterPopover label="Pagamento" options={paymentOptions} selected={paymentFilter} onChange={setPaymentFilter} />
        )}
        <div style={{ maxWidth: 260, marginLeft: 'auto' }}>
          <SearchBox value={searchInput} onChange={setSearchInput} placeholder="Buscar por código ou medida (ex: 4x3)..." />
        </div>
      </div>

      <div ref={parentRef} onScroll={handleScroll} style={{ overflow: 'auto', maxHeight: '70vh' }}>
        <table className="lya-table">
          <thead>
            <tr>
              <th>Lote</th>
              <th>Ateliê</th>
              <th>Especificação</th>
              <th>Metros</th>
              <th>Status</th>
              {isOwner && <th>Pagamento</th>}
            </tr>
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td colSpan={numCols} style={{ height: paddingTop, padding: 0, border: 0 }} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const item = items[virtualRow.index]
              return (
                <DashboardRow
                  key={item._id}
                  item={item}
                  atelier={atelierById.get(item.atelierId)}
                  isOwner={isOwner}
                  measureRef={rowVirtualizer.measureElement}
                  dataIndex={virtualRow.index}
                />
              )
            })}
            {paddingBottom > 0 && (
              <tr>
                <td colSpan={numCols} style={{ height: paddingBottom, padding: 0, border: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
        {items.length === 0 && <p className="lya-empty-state">Nenhum lote encontrado.</p>}
        {loadingMore && <p className="lya-empty-state">Carregando mais...</p>}
      </div>
    </div>
  )
}
