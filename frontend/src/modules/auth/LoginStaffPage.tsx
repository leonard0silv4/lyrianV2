import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Button } from '../../shared/ui/Button'

export function LoginStaffPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { loginStaff } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await loginStaff(username, password)
      navigate('/')
    } catch {
      setError('Usuário ou senha inválidos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div className="lya-card" style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem',
              color: '#fff',
              fontSize: '1.5rem',
            }}
          >
            <i className="fa-solid fa-scissors" />
          </div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, margin: 0 }}>Lyria Ateliês</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>Acesso da Equipe</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '0.875rem' }}>
            <label className="lya-label">Usuário</label>
            <input className="lya-input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label className="lya-label">Senha</label>
            <input
              className="lya-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="lya-form-error">{error}</p>}
          <Button type="submit" variant="primary" loading={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <Link to="/login-atelie" style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
            Sou um Ateliê <i className="fa-solid fa-arrow-right" />
          </Link>
        </div>
      </div>
    </div>
  )
}
