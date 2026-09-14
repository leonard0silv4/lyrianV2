import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './modules/auth/AuthContext'
import { LoginStaffPage } from './modules/auth/LoginStaffPage'
import { LoginAtelierPage } from './modules/auth/LoginAtelierPage'
import { PrivateRoute } from './shared/components/PrivateRoute'
import { AppLayout } from './shared/components/AppLayout'
import { AtelierListPage } from './modules/ateliers/AtelierListPage'
import { MeasurementListPage } from './modules/measurements/MeasurementListPage'
import { UsersPage } from './modules/users/UsersPage'
import { RolesPage } from './modules/permissions/RolesPage'
import { MesaProducaoPage } from './modules/work-queue/MesaProducaoPage'
import { DashboardPage } from './modules/work-queue/DashboardPage'
import { PortalAtelierPage } from './modules/work-queue/PortalAtelierPage'
import { PagamentoPage } from './modules/payments/PagamentoPage'
import { PaymentsEntryPage } from './modules/payments/PaymentsEntryPage'
import { ConfirmLotePage } from './modules/work-queue/ConfirmLotePage'
import { LogsPage } from './modules/audit/LogsPage'

function RootRedirect() {
  const { principal } = useAuth()
  if (principal?.principalType === 'atelier') {
    return <Navigate to="/portal" replace />
  }
  return <Navigate to="/dashboard" replace />
}

export function AppRouter() {
  return (
    <BrowserRouter basename="/v2">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginStaffPage />} />
          <Route path="/login-atelie" element={<LoginAtelierPage />} />

          <Route element={<PrivateRoute />}>
            <Route path="/confirm/:id" element={<ConfirmLotePage />} />

            <Route element={<AppLayout />}>
              <Route path="/" element={<RootRedirect />} />

              <Route element={<PrivateRoute requiredPermission="work-queue:read" />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/ateliers/:id/mesa" element={<MesaProducaoPage />} />
              </Route>

              <Route element={<PrivateRoute requiredPermission="ateliers:read" />}>
                <Route path="/ateliers" element={<AtelierListPage />} />
              </Route>

              <Route element={<PrivateRoute requiredPermission="measurements:read" />}>
                <Route path="/medidas" element={<MeasurementListPage />} />
              </Route>

              <Route element={<PrivateRoute requiredPermission="users:manage" />}>
                <Route path="/usuarios" element={<UsersPage />} />
              </Route>

              <Route element={<PrivateRoute requiredPermission="roles:manage" />}>
                <Route path="/papeis" element={<RolesPage />} />
              </Route>

              <Route element={<PrivateRoute requiredPermission="audit:read" />}>
                <Route path="/logs" element={<LogsPage />} />
              </Route>

              <Route element={<PrivateRoute requiredPermission="payments:manage" />}>
                <Route path="/pagamentos" element={<PaymentsEntryPage />} />
                <Route path="/ateliers/:id/pagamento" element={<PagamentoPage />} />
              </Route>
            </Route>

            <Route path="/portal" element={<PortalAtelierPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
