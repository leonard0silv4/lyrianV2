import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../shared/ui/Modal'
import { Button } from '../../shared/ui/Button'
import { NumberInput } from '../../shared/ui/NumberInput'
import { SearchBox } from '../../shared/ui/SearchBox'
import { workQueueApi, type WorkItem } from './workQueue.api'
import { measurementsApi, type Measurement } from '../measurements/measurements.api'
import { filterMeasurements } from '../measurements/filterMeasurements'

export function EditSpecsModal({
  item,
  onClose,
  onSaved,
}: {
  item: WorkItem
  onClose: () => void
  onSaved: (updated: WorkItem) => void
}) {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [measurementSearch, setMeasurementSearch] = useState('')
  const [measurementId, setMeasurementId] = useState(item.specs.measurementId || '')
  const [largura, setLargura] = useState(item.specs.larguraBobina)
  const [comprimento, setComprimento] = useState(item.specs.comprimentoBobina)
  const [quantidade, setQuantidade] = useState(item.specs.quantidadeFardo)
  const [emenda, setEmenda] = useState(item.specs.emenda)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    measurementsApi.list().then((data) => {
      let options = data
        .filter((m) => m.ativo)
        .sort((a, b) => a.larguraBobina - b.larguraBobina || a.comprimentoBobina - b.comprimentoBobina)
      const current = item.specs.measurementId
      if (current && !options.some((m) => m._id === current)) {
        const inactive = data.find((m) => m._id === current)
        if (inactive) options = [...options, inactive]
      }
      setMeasurements(options)
    })
  }, [item.specs.measurementId])

  const filteredMeasurements = useMemo(() => {
    const filtered = filterMeasurements(measurements, measurementSearch)
    if (measurementId && !filtered.some((m) => m._id === measurementId)) {
      const selected = measurements.find((m) => m._id === measurementId)
      if (selected) return [selected, ...filtered]
    }
    return filtered
  }, [measurements, measurementSearch, measurementId])

  const preview = useMemo(() => {
    const totalMetros = emenda ? (largura * 2 + comprimento * 3) * quantidade : (largura * 2 + comprimento * 2) * quantidade
    const qtdRolos = (totalMetros * 0.35) / 48
    return { totalMetros: Math.round(totalMetros * 100) / 100, qtdRolos: Math.round(qtdRolos * 100) / 100 }
  }, [largura, comprimento, quantidade, emenda])

  function handleSelectMeasurement(id: string) {
    setMeasurementId(id)
    const m = measurements.find((mm) => mm._id === id)
    if (m) {
      setLargura(m.larguraBobina)
      setComprimento(m.comprimentoBobina)
      setEmenda(m.emendaPadrao)
    }
  }

  function handleLarguraChange(v: number) {
    setLargura(v)
    const selected = measurements.find((m) => m._id === measurementId)
    if (selected && selected.larguraBobina !== v) {
      setMeasurementId('')
    }
  }

  function handleComprimentoChange(v: number) {
    setComprimento(v)
    const selected = measurements.find((m) => m._id === measurementId)
    if (selected && selected.comprimentoBobina !== v) {
      setMeasurementId('')
    }
  }

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    try {
      const updated = await workQueueApi.updateSpecs(item._id, {
        measurementId: measurementId || null,
        larguraBobina: largura,
        comprimentoBobina: comprimento,
        quantidadeFardo: quantidade,
        emenda,
      })
      onSaved(updated)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível salvar as medidas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Editar Medidas — ${item.code}`}
      icon="fa-ruler-combined"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            {saving ? 'Salvando...' : 'Salvar Medidas'}
          </Button>
        </>
      }
    >
      {measurements.length > 0 && (
        <div className="lya-form-row" style={{ gridTemplateColumns: '1fr' }}>
          <div>
            <label className="lya-label">Medida (atalho)</label>
            {measurements.length > 6 && (
              <div style={{ marginBottom: '0.4rem' }}>
                <SearchBox value={measurementSearch} onChange={setMeasurementSearch} placeholder="Buscar medida (ex: 4x3)..." />
              </div>
            )}
            <select
              className="lya-input"
              value={measurementId}
              onChange={(e) => handleSelectMeasurement(e.target.value)}
            >
              <option value="">Selecione uma medida cadastrada...</option>
              {filteredMeasurements.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.larguraBobina}x{m.comprimentoBobina}m{m.ativo ? '' : ' (inativa)'}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="lya-form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <label className="lya-label">Largura da Bobina (m)</label>
          <NumberInput value={largura} onChange={handleLarguraChange} min={0} step={0.5} />
        </div>
        <div>
          <label className="lya-label">Comprimento (m)</label>
          <NumberInput value={comprimento} onChange={handleComprimentoChange} min={0} />
        </div>
      </div>

      <div className="lya-form-row" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'end' }}>
        <div>
          <label className="lya-label">Qtd. Telas no Fardo</label>
          <NumberInput value={quantidade} onChange={setQuantidade} min={0} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', paddingBottom: '0.6rem' }}>
          <input type="checkbox" className="lya-lote-checkbox" checked={emenda} onChange={(e) => setEmenda(e.target.checked)} />
          Com Emenda
        </label>
      </div>

      <div
        style={{
          background: 'var(--tint-info-bg)',
          borderRadius: 'var(--radius)',
          padding: '0.875rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          fontSize: '0.8125rem',
        }}
      >
        <div>
          <div className="lya-kpi-label">Metragem Total</div>
          <div className="lya-mono" style={{ fontWeight: 700 }}>
            {preview.totalMetros} m
          </div>
        </div>
        <div>
          <div className="lya-kpi-label">Rolos de Fita</div>
          <div className="lya-mono" style={{ fontWeight: 700 }}>
            {preview.qtdRolos}
          </div>
        </div>
      </div>

      {error && <p className="lya-form-error">{error}</p>}
    </Modal>
  )
}
