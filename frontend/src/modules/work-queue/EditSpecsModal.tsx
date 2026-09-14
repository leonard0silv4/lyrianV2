import { useMemo, useState } from 'react'
import { Modal } from '../../shared/ui/Modal'
import { Button } from '../../shared/ui/Button'
import { NumberInput } from '../../shared/ui/NumberInput'
import { workQueueApi, type WorkItem } from './workQueue.api'

export function EditSpecsModal({
  item,
  onClose,
  onSaved,
}: {
  item: WorkItem
  onClose: () => void
  onSaved: (updated: WorkItem) => void
}) {
  const [largura, setLargura] = useState(item.specs.larguraBobina)
  const [comprimento, setComprimento] = useState(item.specs.comprimentoBobina)
  const [quantidade, setQuantidade] = useState(item.specs.quantidadeFardo)
  const [emenda, setEmenda] = useState(item.specs.emenda)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview = useMemo(() => {
    const totalMetros = emenda ? (largura * 2 + comprimento * 3) * quantidade : (largura * 2 + comprimento * 2) * quantidade
    const qtdRolos = (totalMetros * 0.35) / 48
    return { totalMetros: Math.round(totalMetros * 100) / 100, qtdRolos: Math.round(qtdRolos * 100) / 100 }
  }, [largura, comprimento, quantidade, emenda])

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    try {
      const updated = await workQueueApi.updateSpecs(item._id, {
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
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Medidas'}
          </Button>
        </>
      }
    >
      <div className="lya-form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <label className="lya-label">Largura da Bobina (m)</label>
          <NumberInput value={largura} onChange={setLargura} min={0} step={0.5} />
        </div>
        <div>
          <label className="lya-label">Comprimento (m)</label>
          <NumberInput value={comprimento} onChange={setComprimento} min={0} />
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
          background: '#eff6ff',
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
