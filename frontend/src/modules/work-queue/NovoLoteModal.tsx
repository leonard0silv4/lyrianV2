import { useMemo, useState } from 'react'
import { Modal } from '../../shared/ui/Modal'
import { StepChip, StepSelectorGroup } from '../../shared/ui/StepSelector'
import { Button } from '../../shared/ui/Button'
import { NumberInput } from '../../shared/ui/NumberInput'
import type { Atelier } from '../ateliers/ateliers.api'
import { workQueueApi } from './workQueue.api'

const PERCENTUAIS = [80, 90, 95]
const CORES = [
  { nome: 'Preto', hex: '#111827' },
  { nome: 'Prata', hex: '#c0c0c0' },
  { nome: 'Azul', hex: '#1e40af' },
  { nome: 'Verde', hex: '#059669' },
  { nome: 'Bege', hex: '#d4a373' },
]
const LARGURAS = [2, 3, 4, 5, 6, 8]

export function NovoLoteModal({
  atelier,
  onClose,
  onCreated,
}: {
  atelier: Atelier
  onClose: () => void
  onCreated: () => void
}) {
  const [percentual, setPercentual] = useState(80)
  const [cor, setCor] = useState(CORES[0])
  const [largura, setLargura] = useState(4)
  const [comprimento, setComprimento] = useState(100)
  const [quantidade, setQuantidade] = useState(10)
  const [emenda, setEmenda] = useState(largura >= 5)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const preview = useMemo(() => {
    const totalMetros = emenda ? (largura * 2 + comprimento * 3) * quantidade : (largura * 2 + comprimento * 2) * quantidade
    const qtdRolos = (totalMetros * 0.35) / 48
    return { totalMetros: Math.round(totalMetros * 100) / 100, qtdRolos: Math.round(qtdRolos * 100) / 100 }
  }, [largura, comprimento, quantidade, emenda])

  function handleLargura(v: number) {
    setLargura(v)
    setEmenda(v >= 5)
  }

  async function handleSubmit() {
    setError(null)
    setSaving(true)
    try {
      await workQueueApi.create({
        atelierId: atelier._id,
        percentualSombreamento: percentual,
        corTecido: cor.nome,
        corHex: cor.hex,
        larguraBobina: largura,
        comprimentoBobina: comprimento,
        quantidadeFardo: quantidade,
        emenda,
      })
      onCreated()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao emitir lote')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Novo Lote"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Emitindo...' : 'Emitir Lote'}
          </Button>
        </>
      }
      hero={
        <div className="lya-modal-hero">
          <div className="lya-modal-hero-sigla">{atelier.siglaLote}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{atelier.nomeFantasia}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.85 }} className="lya-mono">
              {atelier.cnpj}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#fff',
              width: 32,
              height: 32,
              borderRadius: 8,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      }
    >
      <StepSelectorGroup step={1} title="Porcentagem de Sombreamento" currentLabel={`${percentual}%`}>
        {PERCENTUAIS.map((p) => (
          <StepChip key={p} active={p === percentual} onClick={() => setPercentual(p)}>
            {p}%
          </StepChip>
        ))}
      </StepSelectorGroup>

      <StepSelectorGroup step={2} title="Cor do Tecido" currentLabel={cor.nome}>
        {CORES.map((c) => (
          <StepChip key={c.nome} active={c.nome === cor.nome} onClick={() => setCor(c)}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: c.hex,
                marginRight: 6,
              }}
            />
            {c.nome}
          </StepChip>
        ))}
      </StepSelectorGroup>

      <StepSelectorGroup step={3} title="Largura da Bobina" currentLabel={`${largura}m${emenda ? ' (Com Emenda)' : ''}`}>
        {LARGURAS.map((l) => (
          <StepChip key={l} active={l === largura} onClick={() => handleLargura(l)}>
            {l}m
          </StepChip>
        ))}
      </StepSelectorGroup>

      <StepSelectorGroup step={4} title="Comprimento e Quantidade">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', width: '100%' }}>
          <div>
            <label className="lya-label">Comprimento (m)</label>
            <NumberInput value={comprimento} onChange={setComprimento} min={0} />
          </div>
          <div>
            <label className="lya-label">Qtd. Telas no Fardo</label>
            <NumberInput value={quantidade} onChange={setQuantidade} min={0} />
          </div>
        </div>
      </StepSelectorGroup>

      <div
        style={{
          background: '#eff6ff',
          borderRadius: 'var(--radius)',
          padding: '0.875rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          fontSize: '0.8125rem',
          marginBottom: '1rem',
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
