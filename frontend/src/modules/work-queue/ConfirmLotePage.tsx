import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { workQueueApi, type WorkItem } from './workQueue.api'
import { STATUS_LABELS } from '../../shared/ui/Badge'
import { Spinner } from '../../shared/ui/Spinner'

type Result =
  | { kind: 'loading' }
  | { kind: 'success'; item: WorkItem; alreadyConfirmed: boolean }
  | { kind: 'error'; message: string }

export function ConfirmLotePage() {
  const { id } = useParams<{ id: string }>()
  const [result, setResult] = useState<Result>({ kind: 'loading' })
  const requested = useRef(false)

  useEffect(() => {
    if (!id || requested.current) return
    requested.current = true
    workQueueApi
      .confirmByQr(id)
      .then((data) => setResult({ kind: 'success', item: data.item, alreadyConfirmed: data.alreadyConfirmed }))
      .catch((err) => setResult({ kind: 'error', message: err.response?.data?.message || 'Erro ao confirmar' }))
  }, [id])

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
      <div className="lya-card" style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        {result.kind === 'loading' && (
          <>
            <Spinner size={32} color="var(--primary)" />
            <p style={{ marginTop: '1rem' }}>Confirmando...</p>
          </>
        )}

        {result.kind === 'success' && (
          <>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: result.alreadyConfirmed ? 'var(--gray-100)' : 'var(--tint-success-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                fontSize: '1.75rem',
                color: result.alreadyConfirmed ? 'var(--gray-500)' : 'var(--success)',
              }}
            >
              <i className={`fa-solid ${result.alreadyConfirmed ? 'fa-clock-rotate-left' : 'fa-check'}`} />
            </div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              {result.alreadyConfirmed ? 'Já confirmado anteriormente' : 'Confirmado com sucesso'}
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '1rem' }}>
              Lote <strong className="lya-mono">{result.item.code}</strong> · status atual:{' '}
              <strong>{STATUS_LABELS[result.item.status]}</strong>
            </p>
          </>
        )}

        {result.kind === 'error' && (
          <>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--tint-danger-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                fontSize: '1.75rem',
                color: 'var(--danger)',
              }}
            >
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>Erro ao confirmar</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '1rem' }}>{result.message}</p>
          </>
        )}

        <Link to="/" style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600 }}>
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
