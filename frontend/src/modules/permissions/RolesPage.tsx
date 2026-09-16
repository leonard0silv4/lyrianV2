import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Button } from '../../shared/ui/Button'
import { PERMISSION_CATEGORY_META, PERMISSION_LABELS, permissionCategory, rolesApi, type Role } from './roles.api'
import { LoadingState } from '../../shared/ui/LoadingState'
import { RoleFormModal } from './RoleFormModal'

const CATEGORY_ORDER = Object.keys(PERMISSION_CATEGORY_META)

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function groupPermissions(perms: string[]) {
  const byCategory = new Map<string, string[]>()
  for (const perm of perms) {
    const cat = permissionCategory(perm)
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(perm)
  }
  const orderedKeys = [...CATEGORY_ORDER.filter((cat) => byCategory.has(cat)), ...[...byCategory.keys()].filter((cat) => !CATEGORY_ORDER.includes(cat))]
  return orderedKeys.map((cat) => ({
    cat,
    meta: PERMISSION_CATEGORY_META[cat] || { label: cat, icon: 'fa-solid fa-key', color: 'var(--gray-600)' },
    perms: byCategory.get(cat)!,
  }))
}

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

  const totalPermissions = allPermissions.length

  const roleGroups = useMemo(() => {
    const map = new Map<string, ReturnType<typeof groupPermissions>>()
    roles.forEach((role) => map.set(role._id, groupPermissions(role.permissions)))
    return map
  }, [roles])

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

      {!loading && roles.length > 0 && (
        <div className="lya-kpi-grid">
          <div className="lya-kpi-card">
            <div className="lya-kpi-label">Papéis cadastrados</div>
            <div className="lya-kpi-value">{roles.length}</div>
          </div>
          <div className="lya-kpi-card">
            <div className="lya-kpi-label">Permissões no catálogo</div>
            <div className="lya-kpi-value">{totalPermissions}</div>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : roles.length === 0 ? (
        <p className="lya-empty-state">Nenhum papel cadastrado ainda.</p>
      ) : (
        <div className="lya-roles-grid">
          {roles.map((role) => {
            const groups = roleGroups.get(role._id) || []
            const coveragePct = totalPermissions === 0 ? 0 : Math.round((role.permissions.length / totalPermissions) * 100)

            return (
              <div key={role._id} className="lya-card lya-role-card">
                <div className="lya-role-card-header">
                  <div className="lya-role-avatar">{initials(role.name)}</div>
                  <div className="lya-role-card-title">
                    <h3>{role.name}</h3>
                    <p>{role.description || 'Sem descrição'}</p>
                  </div>
                  <Button style={{ padding: '0.35rem 0.6rem' }} onClick={() => setModal(role)}>
                    Editar
                  </Button>
                </div>

                <div className="lya-role-coverage">
                  <div className="lya-role-coverage-track">
                    <div className="lya-role-coverage-fill" style={{ width: `${coveragePct}%` }} />
                  </div>
                  <span className="lya-role-coverage-label">
                    {role.permissions.length}/{totalPermissions}
                  </span>
                </div>

                {groups.length === 0 ? (
                  <div className="lya-role-empty-perms">
                    <i className="fa-solid fa-ban" /> Nenhuma permissão concedida
                  </div>
                ) : (
                  groups.map(({ cat, meta, perms }) => (
                    <div className="lya-perm-group" key={cat}>
                      <div className="lya-perm-group-label" style={{ color: meta.color }}>
                        <i className={meta.icon} /> {meta.label}
                      </div>
                      <div className="lya-perm-chip-row">
                        {perms.map((perm) => (
                          <span key={perm} className={`lya-perm-badge cat-${cat}`} title={perm}>
                            {PERMISSION_LABELS[perm] || perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )
          })}
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
