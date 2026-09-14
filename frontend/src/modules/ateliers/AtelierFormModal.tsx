import { useEffect, useState, type FormEvent } from 'react'
import { ateliersApi, type Atelier, type AtelierInput } from './ateliers.api'
import { Modal } from '../../shared/ui/Modal'
import { Button } from '../../shared/ui/Button'

const EMPTY: AtelierInput = {
  nomeFantasia: '',
  razaoSocial: '',
  cnpj: '',
  siglaLote: '',
  telefone: '',
  enderecoCompleto: '',
  banco: '',
  chavePix: '',
  login: '',
  senha: '',
}

export function AtelierFormModal({
  atelierId,
  onClose,
  onSaved,
}: {
  atelierId?: string
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = Boolean(atelierId)
  const [form, setForm] = useState<AtelierInput>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(!isEdit)

  useEffect(() => {
    if (atelierId) {
      ateliersApi.get(atelierId).then((a: Atelier) => {
        setForm({
          nomeFantasia: a.nomeFantasia,
          razaoSocial: a.razaoSocial,
          cnpj: a.cnpj,
          siglaLote: a.siglaLote,
          telefone: a.telefone || '',
          enderecoCompleto: a.enderecoCompleto || '',
          banco: a.banco || '',
          chavePix: a.chavePix || '',
          login: a.login || '',
          senha: '',
        })
        setLoaded(true)
      })
    }
  }, [atelierId])

  function setField(field: keyof AtelierInput, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      if (isEdit && atelierId) {
        await ateliersApi.update(atelierId, form)
      } else {
        await ateliersApi.create(form)
      }
      onSaved()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar ateliê')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isEdit ? 'Editar Ateliê' : 'Novo Ateliê'}
      subtitle="Dados cadastrais e de acesso"
      icon={isEdit ? 'fa-pen' : 'fa-plus'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" form="atelier-form" type="submit" disabled={saving || !loaded}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Salvar Ateliê'}
          </Button>
        </>
      }
    >
      {!loaded ? (
        <p className="lya-empty-state">Carregando...</p>
      ) : (
        <form id="atelier-form" onSubmit={handleSubmit}>
          <div className="lya-form-row" style={{ gridTemplateColumns: '110px 1fr' }}>
            <Field
              label="Sigla Lote"
              value={form.siglaLote}
              onChange={(v) => setField('siglaLote', v.toUpperCase())}
              required
              maxLength={4}
            />
            <Field label="Nome Fantasia" value={form.nomeFantasia} onChange={(v) => setField('nomeFantasia', v)} required />
          </div>

          <div className="lya-form-row">
            <Field label="Razão Social" value={form.razaoSocial} onChange={(v) => setField('razaoSocial', v)} required />
          </div>

          <div className="lya-form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="CNPJ" value={form.cnpj} onChange={(v) => setField('cnpj', v)} required placeholder="00.000.000/0001-00" />
            <Field
              label="Telefone/WhatsApp"
              value={form.telefone || ''}
              onChange={(v) => setField('telefone', v)}
              placeholder="(43) 90000-0000"
            />
          </div>

          <div className="lya-form-row" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
            <Field label="Chave PIX" value={form.chavePix || ''} onChange={(v) => setField('chavePix', v)} />
            <Field label="Banco" value={form.banco || ''} onChange={(v) => setField('banco', v)} />
          </div>

          <div className="lya-credentials-box">
            <div className="lya-label" style={{ marginBottom: '0.5rem', color: 'var(--primary-dark)' }}>
              <i className="fa-solid fa-key" /> Acesso ao Portal do Ateliê
            </div>
            <div className="lya-form-row" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 0 }}>
              <Field
                label="Login do Ateliê"
                value={form.login || ''}
                onChange={(v) => setField('login', v)}
                required={!isEdit}
                disabled={isEdit}
              />
              <Field
                label={isEdit ? 'Nova Senha (opcional)' : 'Senha de Acesso'}
                type="password"
                value={form.senha || ''}
                onChange={(v) => setField('senha', v)}
                required={!isEdit}
                placeholder={isEdit ? 'Deixe em branco p/ manter' : undefined}
              />
            </div>
          </div>

          <div className="lya-form-row" style={{ marginBottom: 0 }}>
            <Field
              label="Endereço Completo"
              value={form.enderecoCompleto || ''}
              onChange={(v) => setField('enderecoCompleto', v)}
            />
          </div>

          {error && <p className="lya-form-error">{error}</p>}
        </form>
      )}
    </Modal>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
  maxLength,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  placeholder?: string
  maxLength?: number
  disabled?: boolean
}) {
  return (
    <div>
      <label className="lya-label">{label}</label>
      <input
        className="lya-input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        style={disabled ? { background: 'var(--gray-100)', color: 'var(--gray-500)', cursor: 'not-allowed' } : undefined}
      />
    </div>
  )
}
