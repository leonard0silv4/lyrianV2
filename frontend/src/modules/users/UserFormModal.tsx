import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../../shared/ui/Modal'
import { Button } from '../../shared/ui/Button'
import { usersApi, type StaffUser } from './users.api'
import type { Role } from '../permissions/roles.api'

export function UserFormModal({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user?: StaffUser
  roles: Role[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = Boolean(user)
  const [username, setUsername] = useState(user?.username || '')
  const [name, setName] = useState(user?.name || '')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId] = useState(() => roles.find((r) => r.name === user?.role)?._id || roles[0]?._id || '')
  const [active, setActive] = useState(user?.active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setUsername(user?.username || '')
    setName(user?.name || '')
    setRoleId(roles.find((r) => r.name === user?.role)?._id || roles[0]?._id || '')
    setActive(user?.active ?? true)
  }, [user, roles])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      if (isEdit && user) {
        await usersApi.update(user.id, {
          name,
          roleId,
          active,
          ...(password ? { password } : {}),
        })
      } else {
        await usersApi.create({ username, password, name, roleId })
      }
      onSaved()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível salvar o usuário')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isEdit ? 'Editar Usuário' : 'Novo Usuário'}
      subtitle="Acesso da equipe (não é login de ateliê)"
      icon="fa-user-gear"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" form="user-form" type="submit" disabled={saving || !roleId}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Usuário'}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit}>
        <div className="lya-form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label className="lya-label">Usuário (login)</label>
            <input
              className="lya-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isEdit}
              required={!isEdit}
              style={isEdit ? { background: 'var(--gray-100)', color: 'var(--gray-500)' } : undefined}
            />
          </div>
          <div>
            <label className="lya-label">Nome</label>
            <input className="lya-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>

        <div className="lya-form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label className="lya-label">Papel</label>
            <select className="lya-select" value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
              {roles.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="lya-label">{isEdit ? 'Nova Senha (opcional)' : 'Senha'}</label>
            <input
              className="lya-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? 'Deixe em branco p/ manter' : undefined}
              required={!isEdit}
            />
          </div>
        </div>

        {isEdit && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
            <input
              type="checkbox"
              className="lya-lote-checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Usuário ativo
          </label>
        )}

        {error && <p className="lya-form-error">{error}</p>}
      </form>
    </Modal>
  )
}
