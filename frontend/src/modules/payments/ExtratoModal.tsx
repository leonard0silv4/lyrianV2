import { useEffect, useState } from 'react'
import { Modal } from '../../shared/ui/Modal'
import { paymentsApi, type PaymentBatch } from './payments.api'
import { LoadingState } from '../../shared/ui/LoadingState'

export function ExtratoModal({
  atelierId,
  onClose,
  onViewDetail,
}: {
  atelierId: string
  onClose: () => void
  onViewDetail: (batch: PaymentBatch) => void
}) {
  const [batches, setBatches] = useState<PaymentBatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    paymentsApi.list(atelierId).then((data) => {
      setBatches(data)
      setLoading(false)
    })
  }, [atelierId])

  return (
    <Modal title="Extrato Geral de Pagamentos PIX" icon="fa-file-invoice-dollar" onClose={onClose} maxWidth={860} noScroll>
      {loading ? (
        <LoadingState />
      ) : batches.length === 0 ? (
        <p className="lya-empty-state">Nenhuma quitação registrada ainda.</p>
      ) : (
        <table className="lya-table">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Lotes</th>
              <th>Metros</th>
              <th>Bruto</th>
              <th>Desconto</th>
              <th>Líquido</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => {
              const totalMetros = b.items.reduce((s, i) => s + (i.totalMetros || 0), 0)
              return (
                <tr key={b._id}>
                  <td className="lya-mono">{new Date(b.createdAt).toLocaleString('pt-BR')}</td>
                  <td>{b.items.length}</td>
                  <td className="lya-mono">{totalMetros}m</td>
                  <td className="lya-mono">R$ {b.valorBruto.toFixed(2)}</td>
                  <td className="lya-mono" style={{ color: 'var(--warning)' }}>
                    - R$ {b.desconto.toFixed(2)}
                  </td>
                  <td className="lya-mono" style={{ fontWeight: 700 }}>
                    R$ {b.valorLiquido.toFixed(2)}
                  </td>
                  <td>
                    <button className="lya-btn" onClick={() => onViewDetail(b)}>
                      <i className="fa-solid fa-eye" /> Ver
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Modal>
  )
}
