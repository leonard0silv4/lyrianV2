import { useEffect, useMemo, useState } from 'react'
import { auditApi, type AuditLogEntry } from './audit.api'
import { PageHeader } from '../../shared/ui/PageHeader'
import { STATUS_LABELS } from '../../shared/ui/Badge'

const ACTION_LABELS: Record<string, string> = {
  create: 'Criação',
  update: 'Atualização',
  delete: 'Remoção',
  status_change: 'Mudança de status',
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatValue(value: unknown) {
  if (value === undefined || value === null) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function EntryLine({ entry }: { entry: AuditLogEntry }) {
  return (
    <div
      style={{
        padding: '0.6rem 0.75rem',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--gray-50)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: '0.8125rem' }}>{ACTION_LABELS[entry.action] || entry.action}</strong>
        <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
          {entry.userName || entry.userRole || 'Sistema'} · {formatDateTime(entry.timestamp)}
        </span>
      </div>

      {entry.action === 'status_change' ? (
        <div style={{ fontSize: '0.8125rem' }}>
          {STATUS_LABELS[String(entry.oldValue)] || formatValue(entry.oldValue)}
          {' → '}
          {STATUS_LABELS[String(entry.newValue)] || formatValue(entry.newValue)}
        </div>
      ) : (
        <div style={{ fontSize: '0.8125rem' }}>
          {entry.field && <span className="lya-mono">{entry.field}: </span>}
          {formatValue(entry.oldValue)} → {formatValue(entry.newValue)}
        </div>
      )}

      {entry.reason && (
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--gray-700)',
            background: '#fef3c7',
            borderRadius: 'var(--radius-sm)',
            padding: '0.35rem 0.55rem',
          }}
        >
          <i className="fa-solid fa-comment" style={{ marginRight: '0.35rem' }} />
          Motivo: {entry.reason}
        </div>
      )}
    </div>
  )
}

export function LogsPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 100

  useEffect(() => {
    setLoading(true)
    auditApi.list({ page, limit }).then((res) => {
      setEntries(res.items)
      setTotal(res.total)
      setLoading(false)
    })
  }, [page])

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; entries: AuditLogEntry[]; latest: string }>()
    for (const entry of entries) {
      const key = entry.entityCode ? `${entry.entityType}:${entry.entityId}` : `${entry.entityType}:${entry.entityId}`
      const label = entry.entityCode || `${entry.entityType} ${entry.entityId.slice(-6)}`
      if (!map.has(key)) {
        map.set(key, { label, entries: [], latest: entry.timestamp })
      }
      const group = map.get(key)!
      group.entries.push(entry)
      if (entry.timestamp > group.latest) group.latest = entry.timestamp
    }
    return Array.from(map.values()).sort((a, b) => (a.latest < b.latest ? 1 : -1))
  }, [entries])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="lya-container">
      <PageHeader title="Logs do Sistema" subtitle="Histórico de mudanças agrupado por lote" />

      {loading ? (
        <p className="lya-empty-state">Carregando...</p>
      ) : groups.length === 0 ? (
        <p className="lya-empty-state">Nenhum registro encontrado.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {groups.map((group) => (
            <div key={group.label} className="lya-card">
              <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>
                <i className="fa-solid fa-layer-group" style={{ marginRight: '0.4rem', color: 'var(--gray-400)' }} />
                {group.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {group.entries.map((entry) => (
                  <EntryLine key={entry._id} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="lya-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <span style={{ fontSize: '0.8125rem', alignSelf: 'center' }}>
            {page} / {totalPages}
          </span>
          <button className="lya-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </button>
        </div>
      )}
    </div>
  )
}
