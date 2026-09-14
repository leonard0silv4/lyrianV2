import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Button } from '../../shared/ui/Button'
import { usersApi, type StaffUser } from './users.api'
import { rolesApi, type Role } from '../permissions/roles.api'
import { UserFormModal } from './UserFormModal'

export function UsersPage() {
  const [users, setUsers] = useState<StaffUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'closed' | 'new' | StaffUser>('closed')

  function reload() {
    setLoading(true)
    Promise.all([usersApi.list(), rolesApi.list()]).then(([userList, roleList]) => {
      setUsers(userList)
      setRoles(roleList)
      setLoading(false)
    })
  }

  useEffect(() => {
    reload()
  }, [])

  return (
    <div className="lya-container">
      <PageHeader
        title="Usuários da Equipe"
        subtitle="Acessos internos (owner, administrativo, produção...)"
        actions={
          <>
            <Link to="/papeis">
              <Button>
                <i className="fa-solid fa-user-shield" /> Papéis e Permissões
              </Button>
            </Link>
            <Button variant="primary" onClick={() => setModal('new')} disabled={roles.length === 0}>
              <i className="fa-solid fa-plus" /> Novo Usuário
            </Button>
          </>
        }
      />

      {roles.length === 0 && !loading && (
        <p className="lya-empty-state">
          Nenhum papel cadastrado ainda — crie um em{' '}
          <Link to="/papeis" style={{ color: 'var(--primary)' }}>
            Papéis e Permissões
          </Link>{' '}
          antes de criar usuários.
        </p>
      )}

      {loading ? (
        <p className="lya-empty-state">Carregando...</p>
      ) : users.length === 0 ? (
        <p className="lya-empty-state">Nenhum usuário cadastrado ainda.</p>
      ) : (
        <table className="lya-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Nome</th>
              <th>Papel</th>
              <th>Status</th>
              <th>Último acesso</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="lya-mono">{u.username}</td>
                <td>{u.name || '—'}</td>
                <td style={{ textTransform: 'capitalize' }}>{u.role || '—'}</td>
                <td style={{ color: u.active ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                  {u.active ? 'Ativo' : 'Inativo'}
                </td>
                <td className="lya-mono">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('pt-BR') : '—'}</td>
                <td>
                  <Button style={{ padding: '0.35rem 0.6rem' }} onClick={() => setModal(u)}>
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal !== 'closed' && (
        <UserFormModal
          user={modal === 'new' ? undefined : modal}
          roles={roles}
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
