import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../../shared/ui/Modal'
import { Button } from '../../shared/ui/Button'
import { PERMISSION_LABELS, rolesApi, type Role } from './roles.api'

export function RoleFormModal({
  role,
  allPermissions,
  onClose,
  onSaved,
}: {
  role?: Role
  allPermissions: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = Boolean(role)
  const [name, setName] = useState(role?.name || '')
  const [description, setDescription] = useState(role?.description || '')
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permissions || []))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(role?.name || '')
    setDescription(role?.description || '')
    setSelected(new Set(role?.permissions || []))
  }, [role])

  function toggle(perm: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(perm)) next.delete(perm)
      else next.add(perm)
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload = { name, description, permissions: Array.from(selected) }
      if (isEdit && role) {
        await rolesApi.update(role._id, payload)
      } else {
        await rolesApi.create(payload)
      }
      onSaved()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível salvar o papel')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isEdit ? 'Editar Papel' : 'Novo Papel'}
      subtitle="Defina o nome e quais permissões este papel concede"
      icon="fa-user-shield"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" form="role-form" type="submit" loading={saving}>
            {saving ? 'Salvando...' : 'Salvar Papel'}
          </Button>
        </>
      }
    >
      <form id="role-form" onSubmit={handleSubmit}>
        <div className="lya-form-row" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
          <div>
            <label className="lya-label">Nome do Papel</label>
            <input
              className="lya-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: producao"
              required
            />
          </div>
          <div>
            <label className="lya-label">Descrição</label>
            <input
              className="lya-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex: Equipe de produção"
            />
          </div>
        </div>

        <label className="lya-label" style={{ marginTop: '0.5rem', display: 'block' }}>
          Permissões
        </label>
        <div
          style={{
            display: 'grid',
            gap: '0.5rem',
            background: 'var(--gray-50)',
            borderRadius: 'var(--radius)',
            padding: '0.75rem',
          }}
        >
          {allPermissions.map((perm) => (
            <label
              key={perm}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                className="lya-lote-checkbox"
                style={{ marginTop: '0.15rem' }}
                checked={selected.has(perm)}
                onChange={() => toggle(perm)}
              />
              <span>
                {PERMISSION_LABELS[perm] || perm}
                <span className="lya-mono" style={{ display: 'block', color: 'var(--gray-400)', fontSize: '0.6875rem' }}>
                  {perm}
                </span>
              </span>
            </label>
          ))}
        </div>

        {error && <p className="lya-form-error">{error}</p>}
      </form>
    </Modal>
  )
}
