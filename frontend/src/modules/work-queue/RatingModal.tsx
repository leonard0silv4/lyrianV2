import { useState } from 'react'
import { Modal } from '../../shared/ui/Modal'
import { Button } from '../../shared/ui/Button'
import { workQueueApi, type WorkItem } from './workQueue.api'

export function RatingModal({
  item,
  onClose,
  onSaved,
}: {
  item: WorkItem
  onClose: () => void
  onSaved: (updated: WorkItem) => void
}) {
  const [rating, setRating] = useState(item.rating || 0)
  const [hover, setHover] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!rating) return
    setSaving(true)
    setError(null)
    try {
      const updated = await workQueueApi.rate(item._id, rating)
      onSaved(updated)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível salvar a avaliação')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Avaliar Lote — ${item.code}`}
      icon="fa-star"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={!rating}>
            {saving ? 'Salvando...' : 'Salvar Avaliação'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem 0' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '2rem',
              color: n <= (hover || rating) ? '#fbbf24' : 'var(--gray-300)',
              transition: 'color 0.15s ease',
            }}
            aria-label={`${n} estrelas`}
          >
            <i className="fa-solid fa-star" />
          </button>
        ))}
      </div>
      {error && <p className="lya-form-error">{error}</p>}
    </Modal>
  )
}
