import { useEffect, useState, type FormEvent } from 'react'
import { measurementsApi, type Measurement, type MeasurementInput } from './measurements.api'
import { Modal } from '../../shared/ui/Modal'
import { Button } from '../../shared/ui/Button'
import { NumberInput } from '../../shared/ui/NumberInput'

const EMPTY: MeasurementInput = {
  larguraBobina: 0,
  comprimentoBobina: 0,
  unidade: 'm',
  sku: '',
  emendaPadrao: false,
}

export function MeasurementFormModal({
  measurementId,
  onClose,
  onSaved,
}: {
  measurementId?: string
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = Boolean(measurementId)
  const [form, setForm] = useState<MeasurementInput>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(!isEdit)

  useEffect(() => {
    if (measurementId) {
      measurementsApi.get(measurementId).then((m: Measurement) => {
        setForm({
          larguraBobina: m.larguraBobina,
          comprimentoBobina: m.comprimentoBobina,
          unidade: m.unidade || 'm',
          sku: m.sku || '',
          emendaPadrao: m.emendaPadrao,
        })
        setLoaded(true)
      })
    }
  }, [measurementId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      if (isEdit && measurementId) {
        await measurementsApi.update(measurementId, form)
      } else {
        await measurementsApi.create(form)
      }
      onSaved()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar medida')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isEdit ? 'Editar Medida' : 'Nova Medida'}
      subtitle="Largura x comprimento de bobina e emenda padrão associada"
      icon={isEdit ? 'fa-pen' : 'fa-plus'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" form="measurement-form" type="submit" disabled={saving || !loaded}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Salvar Medida'}
          </Button>
        </>
      }
    >
      {!loaded ? (
        <p className="lya-empty-state">Carregando...</p>
      ) : (
        <form id="measurement-form" onSubmit={handleSubmit}>
          <div className="lya-form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label className="lya-label">Largura da Bobina (m)</label>
              <NumberInput
                value={form.larguraBobina}
                onChange={(v) => setForm((f) => ({ ...f, larguraBobina: v }))}
                min={0.5}
                step={0.5}
                required
              />
            </div>
            <div>
              <label className="lya-label">Comprimento da Bobina (m)</label>
              <NumberInput
                value={form.comprimentoBobina}
                onChange={(v) => setForm((f) => ({ ...f, comprimentoBobina: v }))}
                min={0.5}
                step={0.5}
                required
              />
            </div>
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <label className="lya-label">SKU (opcional)</label>
            <input
              className="lya-input"
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              placeholder="ex: TEC-4X3-AZUL"
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', marginTop: '0.75rem' }}>
            <input
              type="checkbox"
              className="lya-lote-checkbox"
              checked={form.emendaPadrao}
              onChange={(e) => setForm((f) => ({ ...f, emendaPadrao: e.target.checked }))}
            />
            Emenda padrão para essa medida
          </label>

          {error && <p className="lya-form-error">{error}</p>}
        </form>
      )}
    </Modal>
  )
}
