import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ateliersApi, type Atelier } from '../ateliers/ateliers.api'
import { workQueueApi, type WorkItem } from './workQueue.api'
import { PageHeader } from '../../shared/ui/PageHeader'
import { KpiCard } from '../../shared/ui/KpiCard'
import { SearchBox } from '../../shared/ui/SearchBox'
import { Button } from '../../shared/ui/Button'
import { NumberInput } from '../../shared/ui/NumberInput'
import { LoteCard } from './LoteCard'
import { NovoLoteModal } from './NovoLoteModal'
import { usePermission } from '../permissions/usePermission'
import { NEXT_ACTION } from './stageFlow'
import { useSse } from '../../shared/hooks/useSse'
import { VirtualCardGrid } from '../../shared/ui/VirtualCardGrid'

const TABS = [
  { key: 'todos', label: 'Todos' },
  { key: 'criado', label: 'Criado' },
  { key: 'em_producao', label: 'Em Costura' },
  { key: 'pronto', label: 'Aguardando Coleta' },
  { key: 'descarregado', label: 'Aguardando Auditoria' },
] as const

export function MesaProducaoPage() {
  const { id } = useParams<{ id: string }>()
  const [atelier, setAtelier] = useState<Atelier | null>(null)
  const [items, setItems] = useState<WorkItem[]>([])
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('todos')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adiantamentoDraft, setAdiantamentoDraft] = useState(0)
  const [savingAdiantamento, setSavingAdiantamento] = useState(false)
  const { can, isOwner } = usePermission()

  function loadInitial() {
    if (!id) return
    setLoading(true)
    Promise.all([ateliersApi.get(id), workQueueApi.list({ atelierId: id })]).then(([a, i]) => {
      setAtelier(a)
      setItems(i)
      setAdiantamentoDraft(a.saldoAdiantamento || 0)
      setLoading(false)
    })
  }

  async function handleSaveAdiantamento() {
    if (!id) return
    setSavingAdiantamento(true)
    try {
      const updated = await ateliersApi.setAdiantamento(id, adiantamentoDraft)
      setAtelier(updated)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Não foi possível salvar o adiantamento')
    } finally {
      setSavingAdiantamento(false)
    }
  }

  function refreshItemsSilently() {
    if (!id) return
    workQueueApi.list({ atelierId: id }).then(setItems)
  }

  // Substitui a referencia do item somente quando o conteudo realmente muda,
  // para nao disparar re-render de todos os LoteCards (memoizados) a cada
  // evento SSE que apenas confirma um estado ja conhecido. Lote arquivado sai
  // da lista na hora (a listagem do servidor ja exclui arquivados, entao manter
  // o card na tela ate o proximo F5 destoava do restante da aplicacao).
  const patchItem = useCallback((updated: WorkItem) => {
    setItems((prev) => {
      const index = prev.findIndex((i) => i._id === updated._id)
      if (index === -1) return prev
      if (updated.isArchived) {
        const next = prev.slice()
        next.splice(index, 1)
        return next
      }
      if (JSON.stringify(prev[index]) === JSON.stringify(updated)) return prev
      const next = prev.slice()
      next[index] = updated
      return next
    })
  }, [])

  useEffect(() => {
    loadInitial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useSse<{ item: WorkItem }>({
    eventName: 'workItemUpdated',
    onEvent: ({ item }) => {
      if (item.atelierId !== id) return
      patchItem(item)
    },
  })

  const filtered = useMemo(() => {
    let list = items
    if (tab !== 'todos') list = list.filter((i) => i.status === tab)
    if (search) list = list.filter((i) => i.code.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [items, tab, search])

  const kpis = useMemo(() => {
    const totalLotes = items.length
    const totalMetros = items.reduce((sum, i) => sum + (i.metrics.totalMetros || 0), 0)
    const liberados = items.filter((i) => i.paymentStatus === 'liberado')
    return {
      totalLotes,
      totalMetros: Math.round(totalMetros * 100) / 100,
      lotesLiberados: liberados.length,
      metrosLiberados: Math.round(liberados.reduce((s, i) => s + (i.metrics.totalMetros || 0), 0) * 100) / 100,
    }
  }, [items])

  const handleAdvance = useCallback(
    async (item: WorkItem) => {
      const action = NEXT_ACTION[item.status]
      if (!action) return
      try {
        const updated = await workQueueApi.transition(item._id, action.toStatus)
        patchItem(updated)
      } catch (err: any) {
        alert(err.response?.data?.message || 'Não foi possível avançar a etapa')
      }
    },
    [patchItem]
  )

  const handleReprocess = useCallback(
    async (item: WorkItem) => {
      try {
        const updated = await workQueueApi.transition(item._id, 'em_producao')
        patchItem(updated)
      } catch (err: any) {
        alert(err.response?.data?.message || 'Não foi possível reprocessar')
      }
    },
    [patchItem]
  )

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  function toggleSelectAllVisible() {
    setSelected((prev) => {
      const allSelected = filtered.every((i) => prev.has(i._id))
      if (allSelected) return new Set()
      return new Set(filtered.map((i) => i._id))
    })
  }

  const selectionTotals = useMemo(() => {
    const selectedItems = items.filter((i) => selected.has(i._id))
    const totalMetros = selectedItems.reduce((s, i) => s + (i.metrics.totalMetros || 0), 0)
    const totalRolos = selectedItems.reduce((s, i) => s + (i.metrics.qtdRolos || 0), 0)
    return {
      count: selectedItems.length,
      totalMetros: Math.round(totalMetros * 100) / 100,
      totalRolos: Math.round(totalRolos * 100) / 100,
    }
  }, [items, selected])

  if (loading || !atelier) {
    return (
      <div className="lya-container">
        <p className="lya-empty-state">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="lya-container">
      <PageHeader
        title={`Mesa de Produção — ${atelier.nomeFantasia}`}
        subtitle={`Sigla ${atelier.siglaLote} · ${atelier.cnpj}`}
        actions={
          <>
            {isOwner && (
              <Link to={`/ateliers/${id}/pagamento`}>
                <Button>
                  <i className="fa-solid fa-money-bill-wave" /> Pagamento
                </Button>
              </Link>
            )}
            {can('work-queue:write') && (
              <Button variant="primary" onClick={() => setShowModal(true)}>
                <i className="fa-solid fa-plus" /> Novo Lote
              </Button>
            )}
          </>
        }
      />

      <div className="lya-kpi-grid">
        <KpiCard label="Lotes no Ateliê" value={kpis.totalLotes} />
        <KpiCard label="Total de Metros" value={`${kpis.totalMetros} m`} />
        {isOwner && <KpiCard label="Lotes p/ Pagamento" value={kpis.lotesLiberados} tone="warning" />}
        {isOwner && <KpiCard label="Metros p/ Pagamento" value={`${kpis.metrosLiberados} m`} tone="success" />}
        {isOwner && (
          <div className="lya-kpi-card">
            <div className="lya-kpi-label">Adiantamento do Ateliê</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
              <NumberInput
                style={{ padding: '0.4rem 0.6rem' }}
                value={adiantamentoDraft}
                min={0}
                step={0.01}
                onChange={setAdiantamentoDraft}
              />
              <Button
                variant="primary"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                onClick={handleSaveAdiantamento}
                disabled={savingAdiantamento || adiantamentoDraft === (atelier.saldoAdiantamento || 0)}
              >
                Salvar
              </Button>
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)', marginTop: '0.4rem' }}>
              Saldo total do ateliê — descontado aos poucos nos pagamentos.
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="lya-tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`lya-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {!can('work-queue:write') ? null : (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--gray-600)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                className="lya-lote-checkbox"
                checked={filtered.length > 0 && filtered.every((i) => selected.has(i._id))}
                onChange={toggleSelectAllVisible}
              />
              Selecionar todos
            </label>
          )}
          <div style={{ maxWidth: 280 }}>
            <SearchBox value={search} onChange={setSearch} placeholder="Buscar por código..." />
          </div>
        </div>
      </div>

      <div style={{ height: '1rem' }} />

      {selectionTotals.count > 0 && (
        <div className="lya-selection-bar">
          <div className="lya-selection-metrics">
            <span>
              <i className="fa-solid fa-layer-group" /> Selecionados: <strong>{selectionTotals.count}</strong>
            </span>
            <span>
              Metros: <strong>{selectionTotals.totalMetros} m</strong>
            </span>
            <span>
              Rolos de Fita: <strong>{selectionTotals.totalRolos}</strong>
            </span>
          </div>
          <button
            className="lya-btn"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            onClick={() => setSelected(new Set())}
          >
            Limpar seleção
          </button>
        </div>
      )}

      <VirtualCardGrid
        items={filtered}
        keyExtractor={(item) => item._id}
        emptyState={<p className="lya-empty-state">Nenhum lote encontrado.</p>}
        renderItem={(item) => (
          <LoteCard
            item={item}
            onAdvance={handleAdvance}
            onReprocess={handleReprocess}
            onUpdated={patchItem}
            selectable={can('work-queue:write')}
            selected={selected.has(item._id)}
            onToggleSelect={toggleSelect}
            atelierNome={atelier.nomeFantasia}
          />
        )}
      />

      {showModal && (
        <NovoLoteModal
          atelier={atelier}
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false)
            refreshItemsSilently()
          }}
        />
      )}
    </div>
  )
}
