import { useAuth } from '../auth/AuthContext'

export function usePermission() {
  const { principal } = useAuth()
  const permissions = principal?.permissions || []

  function can(...required: string[]) {
    return required.every((p) => permissions.includes(p))
  }

  function canAny(...required: string[]) {
    return required.some((p) => permissions.includes(p))
  }

  return {
    can,
    canAny,
    isOwner: principal?.role === 'owner',
    isAtelier: principal?.principalType === 'atelier',
  }
}
