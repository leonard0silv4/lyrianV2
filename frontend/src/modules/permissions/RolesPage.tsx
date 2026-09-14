import { useEffect, useState } from 'react'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Button } from '../../shared/ui/Button'
import { PERMISSION_LABELS, rolesApi, type Role } from './roles.api'
import { RoleFormModal } from './RoleFormModal'

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [allPermissions, setAllPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'closed' | 'new' | Role>('closed')

  function reload() {
    setLoading(true)
    Promise.all([rolesApi.list(), rolesApi.listPermissions()]).then(([rolesList, perms]) => {
      setRoles(rolesList)
      setAllPermissions(perms)
      setLoading(false)
    })
  }

  useEffect(() => {
    reload()
  }, [])

  return (
    <div className="lya-container">
      <PageHeader
        title="Papéis e Permissões"
        subtitle="Defina o que cada papel pode ver e fazer no sistema"
        actions={
          <Button variant="primary" onClick={() => setModal('new')}>
            <i className="fa-solid fa-plus" /> Novo Papel
          </Button>
        }
      />

      {loading ? (
        <p className="lya-empty-state">Carregando...</p>
      ) : roles.length === 0 ? (
        <p className="lya-empty-state">Nenhum papel cadastrado ainda.</p>
      ) : (
        <div className="lya-grid-cards">
          {roles.map((role) => (
            <div key={role._id} className="lya-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, textTransform: 'capitalize', flex: 1 }}>
                  {role.name}
                </h3>
                <Button style={{ padding: '0.3rem 0.55rem' }} onClick={() => setModal(role)}>
                  Editar
                </Button>
              </div>
              {role.description && (
                <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.65rem' }}>{role.description}</p>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {role.permissions.length === 0 ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Sem permissões</span>
                ) : (
                  role.permissions.map((perm) => (
                    <span key={perm} className="lya-badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-700)' }}>
                      {PERMISSION_LABELS[perm] || perm}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== 'closed' && (
        <RoleFormModal
          role={modal === 'new' ? undefined : modal}
          allPermissions={allPermissions}
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
