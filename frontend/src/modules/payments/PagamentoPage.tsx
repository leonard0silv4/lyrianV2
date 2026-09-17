import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ateliersApi, type Atelier } from '../ateliers/ateliers.api'
import { workQueueApi, type WorkItem } from '../work-queue/workQueue.api'
import type { PaymentBatch } from './payments.api'
import { PageHeader } from '../../shared/ui/PageHeader'
import { KpiCard } from '../../shared/ui/KpiCard'
import { Button } from '../../shared/ui/Button'
import { Badge } from '../../shared/ui/Badge'
import { InfoPopover } from '../../shared/ui/InfoPopover'
import { NumberInput } from '../../shared/ui/NumberInput'
import { LoadingState } from '../../shared/ui/LoadingState'
import { QuitacaoModal } from './QuitacaoModal'
import { ExtratoModal } from './ExtratoModal'
import { ComprovanteModal } from './ComprovanteModal'
import { BonusModal } from './BonusModal'

type ChipFilter = 'todos' | 'liberados' | 'pagos'

export function PagamentoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [ateliers, setAteliers] = useState<Atelier[]>([])
  const [atelier, setAtelier] = useState<Atelier | null>(null)
  const [items, setItems] = useState<WorkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [chip, setChip] = useState<ChipFilter>('liberados')
  const [search, setSearch] = useState('')
  const [descontoInput, setDescontoInput] = useState(0)
  const [showQuitacao, setShowQuitacao] = useState<'batch' | WorkItem | null>(null)
  const [showExtrato, setShowExtrato] = useState(false)
  const [comprovante, setComprovante] = useState<PaymentBatch | null>(null)
  const [bonusTarget, setBonusTarget] = useState<WorkItem[] | null>(null)

  function loadInitial() {
    if (!id) return
    setLoading(true)
    Promise.all([ateliersApi.list(), ateliersApi.get(id), workQueueApi.list({ atelierId: id })]).then(
      ([allAteliers, a, i]) => {
        setAteliers(allAteliers)
        setAtelier(a)
        setItems(i)
        setDescontoInput(0)
        setLoading(false)
      }
    )
  }

  function refreshAtelier() {
    if (!id) return
    ateliersApi.get(id).then(setAtelier)
  }

  function patchItems(updated: WorkItem[]) {
    const byId = new Map(updated.map((i) => [i._id, i]))
    setItems((prev) => prev.map((i) => byId.get(i._id) || i))
  }

  useEffect(() => {
    loadInitial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const liberados = useMemo(() => items.filter((i) => i.paymentStatus === 'liberado'), [items])
  const pagos = useMemo(() => items.filter((i) => i.paymentStatus === 'pago'), [items])

  const totals = useMemo(() => {
    const totalMetrosLiberados = liberados.reduce((s, i) => s + (i.metrics.totalMetros || 0), 0)
    const totalBruto = liberados.reduce((s, i) => s + (i.metrics.orcamento || 0) + (i.bonus || 0), 0)
    return { totalMetrosLiberados: Math.round(totalMetrosLiberados), totalBruto: Math.round(totalBruto * 100) / 100 }
  }, [liberados])

  const descontoPreview = Math.min(Math.max(0, descontoInput), totals.totalBruto, atelier?.saldoAdiantamento || 0)
  const totalLiquido = Math.round((totals.totalBruto - descontoPreview) * 100) / 100

  const filtered = useMemo(() => {
    let list = items
    if (chip === 'liberados') list = liberados
    if (chip === 'pagos') list = pagos
    if (search) list = list.filter((i) => i.code.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [items, liberados, pagos, chip, search])

  async function handlePaidFromModal(batch: PaymentBatch) {
    setShowQuitacao(null)
    setDescontoInput(0)
    refreshAtelier()
    setItems((prev) =>
      prev.map((i) =>
        batch.items.some((bi) => bi.workItemId === i._id) ? { ...i, paymentStatus: 'pago', dataPgto: batch.createdAt } : i
      )
    )
    setComprovante(batch)
  }

  function handleAtelierChange(newId: string) {
    navigate(`/ateliers/${newId}/pagamento`)
  }

  if (loading || !atelier) {
    return (
      <div className="lya-container">
        <LoadingState />
      </div>
    )
  }

  return (
    <div className="lya-container">
      <div style={{ marginBottom: '1rem', maxWidth: 340 }}>
        <label className="lya-label">Ateliê</label>
        <select className="lya-select" value={atelier._id} onChange={(e) => handleAtelierChange(e.target.value)}>
          {ateliers.map((a) => (
            <option key={a._id} value={a._id}>
              {a.nomeFantasia} [{a.siglaLote}]
            </option>
          ))}
        </select>
      </div>

      <PageHeader
        title="Fechamento Financeiro Semanal (PIX)"
        subtitle={`${atelier.nomeFantasia} [${atelier.siglaLote}] · ${atelier.cnpj} · ${atelier.banco || ''} ${atelier.chavePix ? '· ' + atelier.chavePix : ''}`}
        actions={
          <>
            <Button onClick={() => setBonusTarget(liberados)} disabled={liberados.length === 0}>
              <i className="fa-solid fa-star" /> Aplicar Bônus a Todos
            </Button>
            <Button variant="primary" onClick={() => setShowQuitacao('batch')} disabled={liberados.length === 0}>
              <i className="fa-solid fa-money-bill-wave" /> Quitar PIX (R$ {totalLiquido.toFixed(2)})
            </Button>
            <Button onClick={() => setShowExtrato(true)}>
              <i className="fa-solid fa-file-invoice" /> Ver Extrato
            </Button>
          </>
        }
      />

      <div className="lya-kpi-grid">
        <KpiCard label="Lotes Liberados" value={`${liberados.length} fardos`} tone="success" />
        <KpiCard label="Metragem Liberada" value={`${totals.totalMetrosLiberados} m`} />
        <KpiCard label="Valor Total p/ Pagamento" value={`R$ ${totalLiquido.toFixed(2)}`} tone="warning" />
        <div className="lya-kpi-card">
          <div className="lya-kpi-label">Desconto de Adiantamento nesta Quitação</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.4rem' }}>
            Saldo disponível: <strong className="lya-mono">R$ {(atelier.saldoAdiantamento || 0).toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <NumberInput
              style={{ padding: '0.4rem 0.6rem' }}
              value={descontoInput}
              min={0}
              max={atelier.saldoAdiantamento || 0}
              step={0.01}
              onChange={setDescontoInput}
            />
            <Button style={{ padding: '0.3rem 0.5rem', fontSize: '0.7rem' }} onClick={() => setDescontoInput(0)}>
              Limpar
            </Button>
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)', marginTop: '0.35rem' }}>
            Opcional — pode quitar sem descontar nada. Para adicionar mais adiantamento ao ateliê, use o campo na Mesa
            de Produção.
          </div>
        </div>
      </div>

      <div className="lya-tabs">
        <button className={`lya-tab ${chip === 'todos' ? 'active' : ''}`} onClick={() => setChip('todos')}>
          Todos os Lotes ({items.length})
        </button>
        <button className={`lya-tab ${chip === 'liberados' ? 'active' : ''}`} onClick={() => setChip('liberados')}>
          Liberados p/ Pgto ({liberados.length})
        </button>
        <button className={`lya-tab ${chip === 'pagos' ? 'active' : ''}`} onClick={() => setChip('pagos')}>
          Quitados / Pagos ({pagos.length})
        </button>
      </div>

      <div style={{ marginBottom: '1rem', maxWidth: 300 }}>
        <input className="lya-input" placeholder="Buscar lote..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <table className="lya-table">
        <thead>
          <tr>
            <th>Lote</th>
            <th>Especificação</th>
            <th>Metros</th>
            <th>Fitas</th>
            <th>Bônus</th>
            <th>Valor</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item) => (
            <tr key={item._id}>
              <td className="lya-mono">
                {item.code}
                {item.status === 'auditoria_divergente' &&
                  (item.paymentStatus === 'pago' ? (
                    <InfoPopover
                      icon="fa-triangle-exclamation"
                      text="Auditado com ressalvas — foi encontrada uma divergência na conferência deste lote."
                    />
                  ) : (
                    <span
                      style={{ marginLeft: '0.4rem', display: 'inline-block' }}
                      title={item.observacao ? `Divergência na auditoria: ${item.observacao}` : 'Divergência encontrada na auditoria'}
                    >
                      <Badge variant="status" value="auditoria_divergente">
                        <i className="fa-solid fa-triangle-exclamation" />
                        {' '}Divergente
                      </Badge>
                    </span>
                  ))}
              </td>
              <td>
                {item.specs.larguraBobina}m × {item.specs.comprimentoBobina}m · {item.specs.quantidadeFardo} telas
              </td>
              <td className="lya-mono">{item.metrics.totalMetros}m</td>
              <td className="lya-mono">{item.metrics.qtdRolos}</td>
              <td className="lya-mono">{item.bonus ? `+R$ ${item.bonus.toFixed(2)}` : '—'}</td>
              <td className="lya-mono">R$ {((item.metrics.orcamento || 0) + (item.bonus || 0)).toFixed(2)}</td>
              <td style={{ display: 'flex', gap: '0.4rem' }}>
                {item.paymentStatus === 'pago' ? (
                  <span className="lya-badge" style={{ background: '#166534', color: '#fff' }}>
                    <i className="fa-solid fa-check-circle" /> QUITADO
                  </span>
                ) : item.paymentStatus === 'liberado' ? (
                  <>
                    <Button style={{ padding: '0.35rem 0.6rem' }} onClick={() => setBonusTarget([item])}>
                      <i className="fa-solid fa-star" /> Bônus
                    </Button>
                    <Button style={{ padding: '0.35rem 0.6rem' }} onClick={() => setShowQuitacao(item)}>
                      <i className="fa-solid fa-check" /> Quitar
                    </Button>
                  </>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && <p className="lya-empty-state">Nenhum lote encontrado.</p>}

      {showQuitacao && (
        <QuitacaoModal
          atelier={atelier}
          items={showQuitacao === 'batch' ? liberados : [showQuitacao]}
          desconto={showQuitacao === 'batch' ? descontoPreview : 0}
          onClose={() => setShowQuitacao(null)}
          onPaid={handlePaidFromModal}
        />
      )}

      {showExtrato && (
        <ExtratoModal
          atelierId={atelier._id}
          onClose={() => setShowExtrato(false)}
          onViewDetail={(batch) => setComprovante(batch)}
        />
      )}

      {comprovante && <ComprovanteModal batch={comprovante} onClose={() => setComprovante(null)} />}

      {bonusTarget && (
        <BonusModal
          items={bonusTarget}
          onClose={() => setBonusTarget(null)}
          onApplied={(updated) => {
            patchItems(updated)
            setBonusTarget(null)
          }}
        />
      )}
    </div>
  )
}
