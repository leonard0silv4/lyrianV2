import { BottomSheet } from '../../shared/ui/BottomSheet'
import type { Atelier } from './ateliers.api'

export function AtelierInfoSheet({ atelier, onClose }: { atelier: Atelier; onClose: () => void }) {
  return (
    <BottomSheet onClose={onClose}>
      <div className="lya-sheet-title">
        <span>Dados do Ateliê</span>
        <button className="lya-sheet-close-btn" onClick={onClose} aria-label="Fechar">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      <InfoRow label="Ateliê / Fantasia" value={atelier.nomeFantasia} />
      <InfoRow label="Sigla de Lote" value={atelier.siglaLote} />
      <InfoRow label="Razão Social" value={atelier.razaoSocial} mono={false} />
      <InfoRow label="CNPJ" value={atelier.cnpj} />
      <InfoRow label="Banco Cadastrado" value={atelier.banco || '--'} />
      <InfoRow label="Chave PIX" value={atelier.chavePix || '--'} highlight />

      <div className="lya-sheet-adiantamento-row">
        <span>Adiantamento da Semana</span>
        <strong>R$ {(atelier.saldoAdiantamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
      </div>
    </BottomSheet>
  )
}

function InfoRow({ label, value, mono = true, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="lya-sheet-row">
      <span className="lya-sheet-row-label">{label}:</span>
      <span
        className="lya-sheet-row-value"
        style={{
          fontFamily: mono ? 'var(--font-mono)' : 'inherit',
          fontSize: mono ? undefined : '0.75rem',
          color: highlight ? '#047857' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  )
}
