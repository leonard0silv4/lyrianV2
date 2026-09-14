import { Modal } from '../../shared/ui/Modal'
import { Button } from '../../shared/ui/Button'
import { PixQrCode } from '../../shared/ui/PixQrCode'
import type { PaymentBatch } from './payments.api'

export function ComprovanteModal({ batch, onClose }: { batch: PaymentBatch; onClose: () => void }) {
  const atelierName = typeof batch.atelierId === 'object' ? batch.atelierId.nomeFantasia : ''
  const totalBase = batch.items.reduce((s, i) => s + (i.orcamento ?? i.valor), 0)
  const totalBonus = batch.items.reduce((s, i) => s + (i.bonus || 0), 0)

  return (
    <Modal title="Comprovante de Pagamento" icon="fa-receipt" onClose={onClose} footer={<Button onClick={() => window.print()}><i className="fa-solid fa-print" /> Imprimir</Button>}>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px' }}>
          <div className="lya-kpi-label">Beneficiário</div>
          <div style={{ fontWeight: 700, marginBottom: '0.75rem' }}>{batch.beneficiario || atelierName}</div>

          <div className="lya-kpi-label">Chave PIX</div>
          <div className="lya-mono" style={{ fontWeight: 700, marginBottom: '0.75rem' }}>{batch.pixKey}</div>

          <div className="lya-kpi-label">Banco</div>
          <div style={{ fontWeight: 700, marginBottom: '0.75rem' }}>{batch.banco || '—'}</div>

          <div className="lya-kpi-label">Data/Hora</div>
          <div style={{ fontWeight: 700 }}>{new Date(batch.createdAt).toLocaleString('pt-BR')}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <PixQrCode payload={batch.pixPayload} size={150} />
          <span style={{ fontSize: '0.6875rem', color: 'var(--gray-500)' }}>Escaneie para pagar via Pix</span>
        </div>
      </div>

      <table className="lya-table" style={{ marginTop: '1.25rem' }}>
        <thead>
          <tr>
            <th>Lote</th>
            <th>Metros</th>
            <th>Base</th>
            <th>Bônus</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {batch.items.map((item) => (
            <tr key={item.workItemId}>
              <td className="lya-mono">{item.code}</td>
              <td className="lya-mono">{item.totalMetros}m</td>
              <td className="lya-mono">R$ {(item.orcamento ?? item.valor).toFixed(2)}</td>
              <td className="lya-mono" style={{ color: item.bonus ? 'var(--success)' : 'var(--gray-400)' }}>
                {item.bonus ? `+R$ ${item.bonus.toFixed(2)}` : '—'}
              </td>
              <td className="lya-mono" style={{ fontWeight: 700 }}>
                R$ {item.valor.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius)', padding: '1rem', marginTop: '1rem' }}>
        <Row label="Total Base" value={`R$ ${totalBase.toFixed(2)}`} />
        {totalBonus > 0 && <Row label="Total de Bônus" value={`+ R$ ${totalBonus.toFixed(2)}`} color="var(--success)" />}
        <Row label="Total Bruto" value={`R$ ${batch.valorBruto.toFixed(2)}`} />
        <Row label="Desconto de Adiantamento" value={`- R$ ${batch.desconto.toFixed(2)}`} color="var(--warning)" />
        <Row label="Valor Transferido (PIX)" value={`R$ ${batch.valorLiquido.toFixed(2)}`} bold color="var(--success)" />
      </div>
    </Modal>
  )
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: bold ? '1rem' : '0.875rem' }}>
      <span style={{ color: 'var(--gray-600)' }}>{label}</span>
      <span className="lya-mono" style={{ fontWeight: bold ? 800 : 700, color: color || 'var(--gray-800)' }}>
        {value}
      </span>
    </div>
  )
}
