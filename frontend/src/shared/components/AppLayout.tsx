import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../modules/auth/AuthContext'
import { usePermission } from '../../modules/permissions/usePermission'

export function AppLayout() {
  const { principal, logout } = useAuth()
  const { can, isAtelier } = usePermission()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div>
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--gray-200)',
          padding: '0.75rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <strong style={{ fontSize: '0.9375rem' }}>
            <i className="fa-solid fa-scissors" /> Lyria Ateliês
          </strong>
          {!isAtelier && can('work-queue:read') && (
            <Link to="/dashboard" style={{ color: 'var(--gray-700)', fontSize: '0.8125rem', fontWeight: 600 }}>
              Dashboard
            </Link>
          )}
          {!isAtelier && can('ateliers:read') && (
            <Link to="/ateliers" style={{ color: 'var(--gray-700)', fontSize: '0.8125rem', fontWeight: 600 }}>
              Ateliês
            </Link>
          )}
          {!isAtelier && can('payments:manage') && (
            <Link to="/pagamentos" style={{ color: 'var(--gray-700)', fontSize: '0.8125rem', fontWeight: 600 }}>
              Pagamentos
            </Link>
          )}
          {!isAtelier && can('users:manage') && (
            <Link to="/usuarios" style={{ color: 'var(--gray-700)', fontSize: '0.8125rem', fontWeight: 600 }}>
              Usuários
            </Link>
          )}
          {isAtelier && (
            <Link to="/portal" style={{ color: 'var(--gray-700)', fontSize: '0.8125rem', fontWeight: 600 }}>
              Meus Trabalhos
            </Link>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem' }}>
          <span style={{ color: 'var(--gray-500)' }}>{principal?.username}</span>
          <button className="lya-btn" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </nav>
      <Outlet />
    </div>
  )
}
