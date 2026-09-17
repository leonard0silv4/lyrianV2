import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../modules/auth/AuthContext'
import { usePermission } from '../../modules/permissions/usePermission'

export function PrivateRoute({ requiredPermission }: { requiredPermission?: string }) {
  const { token } = useAuth()
  const { can } = usePermission()
  const location = useLocation()

  if (!token) {
    const loginPath = location.pathname.startsWith('/portal') ? '/login-atelie' : '/login'
    return <Navigate to={loginPath} replace />
  }

  if (requiredPermission && !can(requiredPermission)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
