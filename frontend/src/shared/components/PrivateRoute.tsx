import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../modules/auth/AuthContext'
import { usePermission } from '../../modules/permissions/usePermission'

export function PrivateRoute({ requiredPermission }: { requiredPermission?: string }) {
  const { token } = useAuth()
  const { can } = usePermission()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (requiredPermission && !can(requiredPermission)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
