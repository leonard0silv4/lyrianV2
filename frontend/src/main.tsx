import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './shared/theme.css'
import { AppRouter } from './router'
import { ThemeProvider } from './shared/theme/ThemeContext'
import { ToastProvider } from './shared/ui/toast/ToastProvider'
import { ConfirmProvider } from './shared/ui/confirm/ConfirmProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AppRouter />
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)
