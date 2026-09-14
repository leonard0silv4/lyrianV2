import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { apiClient, TOKEN_KEY, PRINCIPAL_KEY } from '../../shared/api/client'

type Principal = {
  id: string
  principalType: 'staff' | 'atelier'
  name?: string
  username: string
  role?: string
  permissions: string[]
  atelierId?: string
}

type AuthContextValue = {
  principal: Principal | null
  token: string | null
  loginStaff: (username: string, password: string) => Promise<void>
  loginAtelier: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredPrincipal(): Principal | null {
  const raw = localStorage.getItem(PRINCIPAL_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Principal
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY))
  const [principal, setPrincipal] = useState<Principal | null>(readStoredPrincipal())

  function persist(newToken: string, newPrincipal: Principal) {
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(PRINCIPAL_KEY, JSON.stringify(newPrincipal))
    setToken(newToken)
    setPrincipal(newPrincipal)
  }

  async function loginStaff(username: string, password: string) {
    const { data } = await apiClient.post('/auth/login', { username, password })
    persist(data.token, {
      id: data.user.id,
      principalType: 'staff',
      username: data.user.username,
      name: data.user.name,
      role: data.user.role,
      permissions: data.user.permissions,
    })
  }

  async function loginAtelier(username: string, password: string) {
    const { data } = await apiClient.post('/auth/atelier/login', { username, password })
    persist(data.token, {
      id: data.atelierUser.id,
      principalType: 'atelier',
      username: data.atelierUser.username,
      permissions: ['ateliers:read', 'work-queue:read', 'work-queue:advance'],
      atelierId: data.atelierUser.atelierId,
    })
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(PRINCIPAL_KEY)
    setToken(null)
    setPrincipal(null)
  }

  const value = useMemo(
    () => ({ principal, token, loginStaff, loginAtelier, logout }),
    [principal, token]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
