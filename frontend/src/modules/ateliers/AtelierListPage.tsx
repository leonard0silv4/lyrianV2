import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ateliersApi, type Atelier } from './ateliers.api'
import { usePermission } from '../permissions/usePermission'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Button } from '../../shared/ui/Button'
import { SearchBox } from '../../shared/ui/SearchBox'
import { LoadingState } from '../../shared/ui/LoadingState'
import { AtelierFormModal } from './AtelierFormModal'

export function AtelierListPage() {
  const [ateliers, setAteliers] = useState<Atelier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'closed' | 'new' | string>('closed')
  const { can } = usePermission()

  function reload() {
    setLoading(true)
    ateliersApi.list().then((data) => {
      setAteliers(data)
      setLoading(false)
    })
  }

  useEffect(() => {
    reload()
  }, [])

  async function toggleActive(atelier: Atelier) {
    await ateliersApi.setActive(atelier._id, !atelier.active)
    reload()
  }

  const filtered = ateliers.filter((a) => {
    const q = search.toLowerCase()
    return (
      a.nomeFantasia.toLowerCase().includes(q) ||
      a.siglaLote.toLowerCase().includes(q) ||
      a.cnpj.includes(q)
    )
  })

  return (
    <div className="lya-container">
      <PageHeader
        title="Ateliês"
        subtitle="Cadastro e gestão dos ateliês parceiros"
        actions={
          can('ateliers:write') ? (
            <Button variant="primary" onClick={() => setModal('new')}>
              <i className="fa-solid fa-plus" /> Novo Ateliê
            </Button>
          ) : undefined
        }
      />

      <div style={{ marginBottom: '1.25rem', maxWidth: 360 }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Buscar por nome, sigla ou CNPJ..." />
      </div>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <p className="lya-empty-state">Nenhum ateliê encontrado.</p>
      ) : (
        <div className="lya-grid-cards">
          {filtered.map((a) => (
            <AtelierCard
              key={a._id}
              atelier={a}
              onToggleActive={() => toggleActive(a)}
              onEdit={() => setModal(a._id)}
              canWrite={can('ateliers:write')}
            />
          ))}
        </div>
      )}

      {modal !== 'closed' && (
        <AtelierFormModal
          atelierId={modal === 'new' ? undefined : modal}
          onClose={() => setModal('closed')}
          onSaved={() => {
            setModal('closed')
            reload()
          }}
        />
      )}
    </div>
  )
}

function AtelierCard({
  atelier,
  onToggleActive,
  onEdit,
  canWrite,
}: {
  atelier: Atelier
  onToggleActive: () => void
  onEdit: () => void
  canWrite: boolean
}) {
  const mapsHref = atelier.enderecoCompleto
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(atelier.enderecoCompleto)}`
    : undefined

  return (
    <div className="lya-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <span
          className="lya-mono"
          style={{
            // Literal (não var(--gray-900)): este chip precisa de fundo sempre
            // escuro nos dois temas — var(--gray-900) inverteria para claro no dark.
            background: '#0f172a',
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
            padding: '0.3rem 0.55rem',
            fontWeight: 800,
            fontSize: '0.75rem',
          }}
        >
          {atelier.siglaLote}
        </span>
        <h3
          style={{
            margin: 0,
            fontSize: '0.9375rem',
            fontWeight: 700,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {atelier.nomeFantasia}
        </h3>
        {canWrite && (
          <Button style={{ padding: '0.35rem 0.6rem' }} onClick={onEdit}>
            Editar
          </Button>
        )}
      </div>

      <div
        style={{
          background: 'var(--gray-50)',
          borderRadius: 'var(--radius)',
          padding: '0.75rem',
          fontSize: '0.75rem',
          display: 'grid',
          gap: '0.4rem',
        }}
      >
        <Row label="Razão Social" value={atelier.razaoSocial} />
        <Row label="CNPJ" value={atelier.cnpj} mono />
        {atelier.chavePix && <Row label="PIX" value={atelier.chavePix} mono color="var(--success)" />}
        {atelier.banco && <Row label="Banco" value={atelier.banco} />}
        {atelier.enderecoCompleto && (
          <Row
            label="Endereço"
            value={
              mapsHref ? (
                <a href={mapsHref} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>
                  {atelier.enderecoCompleto}
                </a>
              ) : (
                atelier.enderecoCompleto
              )
            }
          />
        )}
        {atelier.telefone && <Row label="Telefone" value={atelier.telefone} color="var(--success)" />}
        <Row
          label="Status"
          value={atelier.active ? 'Ativo' : 'Inativo'}
          color={atelier.active ? 'var(--success)' : 'var(--danger)'}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <Link to={`/ateliers/${atelier._id}/mesa`} style={{ flex: 1 }}>
          <Button variant="primary" style={{ width: '100%', justifyContent: 'center' }}>
            <i className="fa-solid fa-table-cells" /> Abrir Mesa de Produção
          </Button>
        </Link>
        {canWrite && (
          <Button onClick={onToggleActive} variant={atelier.active ? 'danger' : 'default'}>
            {atelier.active ? 'Inativar' : 'Ativar'}
          </Button>
        )}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
  color,
}: {
  label: string
  value: ReactNode
  mono?: boolean
  color?: string
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
      <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>{label}</span>
      <span className={mono ? 'lya-mono' : ''} style={{ color: color || 'var(--gray-800)', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  )
}
