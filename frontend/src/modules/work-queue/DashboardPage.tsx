import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { workQueueApi, type DashboardData, type WorkItem } from './workQueue.api'
import { ateliersApi, type Atelier } from '../ateliers/ateliers.api'
import { PageHeader } from '../../shared/ui/PageHeader'
import { KpiCard } from '../../shared/ui/KpiCard'
import { SearchBox } from '../../shared/ui/SearchBox'
import { FilterPopover } from '../../shared/ui/FilterPopover'
import { Badge, PAYMENT_LABELS, STATUS_LABELS } from '../../shared/ui/Badge'
import { usePermission } from '../permissions/usePermission'
import { useSse } from '../../shared/hooks/useSse'

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [items, setItems] = useState<WorkItem[]>([])
  const [ateliers, setAteliers] = useState<Atelier[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [atelierFilter, setAtelierFilter] = useState<string[]>([])
  const [paymentFilter, setPaymentFilter] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const { isOwner } = usePermission()

  useEffect(() => {
    Promise.all([workQueueApi.dashboard(), workQueueApi.list(), ateliersApi.list()]).then(([d, i, a]) => {
      setDashboard(d)
      setItems(i)
      setAteliers(a)
      setLoading(false)
    })
  }, [])

  useSse<{ item: WorkItem }>({
    eventName: 'workItemUpdated',
    onEvent: ({ item: updated }) => {
      setItems((prev) => {
        const existing = prev.find((i) => i._id === updated._id)
        if (!existing) return prev
        if (existing.status !== updated.status) {
          setDashboard((prevDashboard) => {
            if (!prevDashboard) return prevDashboard
            const porStatus = { ...prevDashboard.porStatus }
            porStatus[existing.status] = Math.max(0, (porStatus[existing.status] || 0) - 1)
            porStatus[updated.status] = (porStatus[updated.status] || 0) + 1
            return { ...prevDashboard, porStatus }
          })
        }
        return prev.map((i) => (i._id === updated._id ? updated : i))
      })
    },
  })

  const atelierById = useMemo(() => new Map(ateliers.map((a) => [a._id, a])), [ateliers])

  const filtered = useMemo(() => {
    const raw = search.trim().toLowerCase()
    const dimsMatch = raw.match(/^(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)$/)
    const q = raw.replace(/m$/, '')

    return items.filter((item) => {
      if (raw) {
        if (dimsMatch) {
          const larguraQ = dimsMatch[1].replace(',', '.')
          const comprimentoQ = dimsMatch[2].replace(',', '.')
          const matchesLargura = String(item.specs.larguraBobina).includes(larguraQ)
          const matchesComprimento = String(item.specs.comprimentoBobina).includes(comprimentoQ)
          if (!matchesLargura || !matchesComprimento) return false
        } else {
          const matchesCode = item.code.toLowerCase().includes(q)
          const matchesMedida = String(item.specs.larguraBobina).includes(q)
          if (!matchesCode && !matchesMedida) return false
        }
      }
      if (statusFilter.length && !statusFilter.includes(item.status)) return false
      if (atelierFilter.length && !atelierFilter.includes(item.atelierId)) return false
      if (paymentFilter.length && (!item.paymentStatus || !paymentFilter.includes(item.paymentStatus))) return false
      return true
    })
  }, [items, search, statusFilter, atelierFilter, paymentFilter])

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
          <SearchBox value={search} onChange={setSearch} placeholder="Buscar por código ou medida (ex: 4x3)..." />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
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
            {filtered.map((item) => {
              const atelier = atelierById.get(item.atelierId)
              return (
                <tr key={item._id}>
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
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="lya-empty-state">Nenhum lote encontrado.</p>}
      </div>
    </div>
  )
}
