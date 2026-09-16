import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ateliersApi, type Atelier } from '../ateliers/ateliers.api'
import { PageHeader } from '../../shared/ui/PageHeader'
import { LoadingState } from '../../shared/ui/LoadingState'

export function PaymentsEntryPage() {
  const [ateliers, setAteliers] = useState<Atelier[] | null>(null)

  useEffect(() => {
    ateliersApi.list().then(setAteliers)
  }, [])

  if (ateliers === null) {
    return (
      <div className="lya-container">
        <LoadingState />
      </div>
    )
  }

  if (ateliers.length === 0) {
    return (
      <div className="lya-container">
        <PageHeader title="Pagamentos" subtitle="Fechamento financeiro por ateliê" />
        <p className="lya-empty-state">Nenhum ateliê cadastrado ainda.</p>
      </div>
    )
  }

  return <Navigate to={`/ateliers/${ateliers[0]._id}/pagamento`} replace />
}
