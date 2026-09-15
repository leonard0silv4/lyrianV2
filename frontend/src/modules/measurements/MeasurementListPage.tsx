import { useEffect, useMemo, useState } from 'react'
import { measurementsApi, type Measurement } from './measurements.api'
import { filterMeasurements } from './filterMeasurements'
import { usePermission } from '../permissions/usePermission'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Button } from '../../shared/ui/Button'
import { SearchBox } from '../../shared/ui/SearchBox'
import { MeasurementFormModal } from './MeasurementFormModal'

export function MeasurementListPage() {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'closed' | 'new' | string>('closed')
  const { can } = usePermission()
  const canWrite = can('measurements:write')

  function reload() {
    setLoading(true)
    measurementsApi.list().then((data) => {
      setMeasurements(data)
      setLoading(false)
    })
  }

  useEffect(() => {
    reload()
  }, [])

  async function toggleActive(measurement: Measurement) {
    await measurementsApi.setActive(measurement._id, !measurement.ativo)
    reload()
  }

  const filtered = useMemo(() => filterMeasurements(measurements, search), [measurements, search])

  return (
    <div className="lya-container">
      <PageHeader
        title="Medidas"
        subtitle="Larguras x comprimentos de bobina cadastrados e emenda padrão associada"
        actions={
          canWrite ? (
            <Button variant="primary" onClick={() => setModal('new')}>
              <i className="fa-solid fa-plus" /> Nova Medida
            </Button>
          ) : undefined
        }
      />

      <div style={{ marginBottom: '1.25rem', maxWidth: 300 }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Buscar medida (ex: 4x3)..." />
      </div>

      {loading ? (
        <p className="lya-empty-state">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="lya-empty-state">Nenhuma medida encontrada.</p>
      ) : (
        <div className="lya-grid-cards">
          {filtered.map((m) => (
            <MeasurementCard
              key={m._id}
              measurement={m}
              onToggleActive={() => toggleActive(m)}
              onEdit={() => setModal(m._id)}
              canWrite={canWrite}
            />
          ))}
        </div>
      )}

      {modal !== 'closed' && (
        <MeasurementFormModal
          measurementId={modal === 'new' ? undefined : modal}
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

function MeasurementCard({
  measurement,
  onToggleActive,
  onEdit,
  canWrite,
}: {
  measurement: Measurement
  onToggleActive: () => void
  onEdit: () => void
  canWrite: boolean
}) {
  return (
    <div className="lya-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <span
          className="lya-mono"
          style={{
            background: 'var(--gray-900)',
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
            padding: '0.3rem 0.55rem',
            fontWeight: 800,
            fontSize: '0.75rem',
          }}
        >
          {measurement.larguraBobina}x{measurement.comprimentoBobina}
          {measurement.unidade || 'm'}
        </span>
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, flex: 1 }}>
          {measurement.larguraBobina}
          {measurement.unidade || 'm'} × {measurement.comprimentoBobina}
          {measurement.unidade || 'm'}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>SKU</span>
          <span className="lya-mono">{measurement.sku || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Emenda padrão</span>
          <span style={{ color: measurement.emendaPadrao ? 'var(--success)' : 'var(--gray-800)' }}>
            {measurement.emendaPadrao ? 'Sim' : 'Não'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Status</span>
          <span style={{ color: measurement.ativo ? 'var(--success)' : 'var(--danger)' }}>
            {measurement.ativo ? 'Ativa' : 'Inativa'}
          </span>
        </div>
      </div>

      {canWrite && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <Button
            onClick={onToggleActive}
            variant={measurement.ativo ? 'danger' : 'default'}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {measurement.ativo ? 'Inativar' : 'Ativar'}
          </Button>
        </div>
      )}
    </div>
  )
}
