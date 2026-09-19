import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '../../shared/ui/Modal'
import { Button } from '../../shared/ui/Button'
import { NumberInput } from '../../shared/ui/NumberInput'
import { SearchBox } from '../../shared/ui/SearchBox'
import { workQueueApi, type WorkItem } from './workQueue.api'
import { measurementsApi, type Measurement } from '../measurements/measurements.api'
import { filterMeasurements } from '../measurements/filterMeasurements'

function measurementLabel(m: Measurement): string {
  return `${m.larguraBobina}x${m.comprimentoBobina}m${m.sku ? ` — ${m.sku}` : ''}`
}

export function AuditoriaModal({
  item,
  onClose,
  onSaved,
}: {
  item: WorkItem
  onClose: () => void
  onSaved: (updated: WorkItem) => void
}) {
  // Reabrir a auditoria de um lote ja conferido pre-preenche com o que foi
  // registrado da ultima vez (igual ao modelo), em vez de sempre comecar do zero.
  const [divergente, setDivergente] = useState(item.status === 'auditoria_divergente')
  const [quantidadeReal, setQuantidadeReal] = useState(item.quantidadeAuditada ?? item.specs.quantidadeFardo)
  const [observacao, setObservacao] = useState(item.status === 'auditoria_divergente' ? item.observacao || '' : '')
  const [skuIncorreto, setSkuIncorreto] = useState(Boolean(item.skuAuditado))
  const [skuAuditadoId, setSkuAuditadoId] = useState(item.skuAuditado ?? '')
  const [skuSearch, setSkuSearch] = useState('')
  const [skuDropdownOpen, setSkuDropdownOpen] = useState(false)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [autoObservacaoLine, setAutoObservacaoLine] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const skuFieldRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (skuIncorreto && measurements.length === 0) {
      measurementsApi.list().then((data) => setMeasurements(data.filter((m) => m.ativo)))
    }
  }, [skuIncorreto, measurements.length])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (skuFieldRef.current && !skuFieldRef.current.contains(e.target as Node)) {
        setSkuDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Preenche a busca com a medida ja selecionada assim que a lista carrega
  // (reabertura de uma auditoria que ja tinha SKU corrigido registrado).
  useEffect(() => {
    if (skuAuditadoId && !skuSearch) {
      const m = measurements.find((x) => x._id === skuAuditadoId)
      if (m) setSkuSearch(measurementLabel(m))
    }
  }, [measurements, skuAuditadoId, skuSearch])

  const measurementOriginal = measurements.find((m) => m._id === item.specs.measurementId)

  const skuOptions = useMemo(
    () => filterMeasurements(measurements, skuSearch).filter((m) => m._id !== item.specs.measurementId).slice(0, 8),
    [measurements, skuSearch, item.specs.measurementId]
  )

  function handlePickMeasurement(m: Measurement) {
    setSkuAuditadoId(m._id)
    setSkuSearch(measurementLabel(m))
    setSkuDropdownOpen(false)

    // Insere/atualiza automaticamente a linha "medida original x medida auditada"
    // na observação, sem apagar o que o operador já tiver escrito ali.
    const origemLabel = measurementOriginal
      ? `${measurementOriginal.larguraBobina}x${measurementOriginal.comprimentoBobina}m${measurementOriginal.sku ? ` (${measurementOriginal.sku})` : ''}`
      : `${item.specs.larguraBobina}x${item.specs.comprimentoBobina}m`
    const auditadaLabel = `${m.larguraBobina}x${m.comprimentoBobina}m${m.sku ? ` (${m.sku})` : ''}`
    const newLine = `Medida original ${origemLabel} → medida auditada ${auditadaLabel}.`

    setObservacao((prev) => {
      const rest = autoObservacaoLine && prev.startsWith(autoObservacaoLine) ? prev.slice(autoObservacaoLine.length).replace(/^\s+/, '') : prev
      return rest ? `${newLine} ${rest}` : newLine
    })
    setAutoObservacaoLine(newLine)
  }

  function handleClearSku() {
    setSkuAuditadoId('')
    setSkuSearch('')
    if (autoObservacaoLine) {
      setObservacao((prev) => (prev.startsWith(autoObservacaoLine) ? prev.slice(autoObservacaoLine.length).replace(/^\s+/, '') : prev))
      setAutoObservacaoLine('')
    }
  }

  async function handleSubmit() {
    setError(null)
    if (divergente && (!observacao.trim() || observacao.trim().length < 5)) {
      setError('Descreva a divergência encontrada (mínimo 5 caracteres)')
      return
    }
    if (divergente && (!quantidadeReal || quantidadeReal < 1 || quantidadeReal > 50)) {
      setError('Informe uma quantidade entre 1 e 50')
      return
    }
    if (divergente && skuIncorreto && !skuAuditadoId) {
      setError('Selecione o SKU/medida realmente recebido')
      return
    }

    setSaving(true)
    try {
      const updated = await workQueueApi.auditar(item._id, {
        toStatus: divergente ? 'auditoria_divergente' : 'auditoria_aprovada',
        quantidadeAuditada: divergente ? quantidadeReal : item.specs.quantidadeFardo,
        observacao: divergente ? observacao.trim() : '100% Conforme',
        skuAuditadoId: divergente ? (skuIncorreto ? skuAuditadoId : null) : undefined,
      })
      onSaved(updated)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível salvar a auditoria')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Auditoria Física · Lote ${item.code}`}
      subtitle={`Medida: ${item.specs.larguraBobina}x${item.specs.comprimentoBobina}m · Planejado: ${item.specs.quantidadeFardo} un.`}
      icon="fa-shield-halved"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            {saving ? 'Salvando...' : 'Salvar Auditoria'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <button
          type="button"
          className={`lya-btn ${!divergente ? 'lya-btn-primary' : ''}`}
          style={{ justifyContent: 'center' }}
          onClick={() => setDivergente(false)}
        >
          <i className="fa-solid fa-check" /> 100% Conforme
        </button>
        <button
          type="button"
          className={`lya-btn ${divergente ? 'lya-btn-danger' : ''}`}
          style={{ justifyContent: 'center' }}
          onClick={() => setDivergente(true)}
        >
          <i className="fa-solid fa-triangle-exclamation" /> Houve Divergência
        </button>
      </div>

      {divergente && (
        <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
          <div>
            <label className="lya-label">Quantidade Real de Telas no Fardo</label>
            <NumberInput value={quantidadeReal} min={1} max={50} onChange={setQuantidadeReal} />
          </div>
          <div>
            <label className="lya-label">Descreva a Divergência Encontrada</label>
            <textarea
              className="lya-input"
              style={{ minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Fardo veio com 9 telas ao invés de 10."
              maxLength={240}
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}>
              <input
                type="checkbox"
                className="lya-lote-checkbox"
                checked={skuIncorreto}
                onChange={(e) => {
                  setSkuIncorreto(e.target.checked)
                  if (!e.target.checked) handleClearSku()
                }}
              />
              Lote veio com SKU/medida diferente do esperado
            </label>
            {skuIncorreto && (
              <div style={{ marginTop: '0.5rem' }} ref={skuFieldRef}>
                <label className="lya-label">SKU/Medida Realmente Recebido</label>
                <div style={{ position: 'relative' }}>
                  <SearchBox
                    value={skuSearch}
                    onChange={(v) => {
                      setSkuSearch(v)
                      setSkuDropdownOpen(true)
                      if (skuAuditadoId) setSkuAuditadoId('')
                    }}
                    placeholder="Buscar medida ou SKU (ex: 9x9)..."
                  />
                  {skuAuditadoId && (
                    <button
                      type="button"
                      className="lya-btn"
                      onClick={handleClearSku}
                      title="Limpar seleção"
                      style={{
                        position: 'absolute',
                        right: 6,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 24,
                        height: 24,
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                      }}
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  )}
                  {skuDropdownOpen && skuSearch && !skuAuditadoId && (
                    <div
                      className="lya-card"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 20,
                        marginTop: 4,
                        maxHeight: 220,
                        overflowY: 'auto',
                        padding: '0.25rem',
                      }}
                    >
                      {skuOptions.length === 0 ? (
                        <p className="lya-empty-state" style={{ padding: '0.5rem', margin: 0 }}>
                          Nenhuma medida encontrada.
                        </p>
                      ) : (
                        skuOptions.map((m) => (
                          <button
                            key={m._id}
                            type="button"
                            className="lya-btn"
                            style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 2 }}
                            onClick={() => handlePickMeasurement(m)}
                          >
                            {measurementLabel(m)}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                  Isso só corrige o SKU usado no lançamento de estoque. Não altera a medida do
                  pedido nem o valor a pagar ao ateliê.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="lya-form-error">{error}</p>}
    </Modal>
  )
}
