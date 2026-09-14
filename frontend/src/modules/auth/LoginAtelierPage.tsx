import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function LoginAtelierPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { loginAtelier } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await loginAtelier(username, password)
      navigate('/')
    } catch {
      setError('Login ou senha inválidos')
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
        background: '#0f172a',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: '#1e293b',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem 1.75rem',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: '#fde047',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.875rem',
              fontSize: '1.5rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 900,
            }}
          >
            <i className="fa-solid fa-scissors" />
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#fff' }}>Portal do Ateliê</h1>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Acompanhe seus trabalhos e pagamentos
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '0.875rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.6875rem',
                fontWeight: 800,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                color: '#94a3b8',
                marginBottom: '0.375rem',
              }}
            >
              Login
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.6875rem',
                fontWeight: 800,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                color: '#94a3b8',
                marginBottom: '0.375rem',
              }}
            >
              Senha
            </label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
          </div>
          {error && <p style={{ color: '#fca5a5', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius)',
              border: 'none',
              background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/login" style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
            <i className="fa-solid fa-arrow-left" /> Sou da Equipe
          </Link>
        </div>
      </div>
    </div>
  )
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.875rem',
  borderRadius: 'var(--radius)',
  border: '1.5px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
  color: '#fff',
  fontSize: '0.875rem',
  boxSizing: 'border-box',
}
