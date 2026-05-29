import AppRoutes from './routes'
import ErrorBoundary from './components/organisms/ErrorBoundary'
import GlobalProcessingIndicator from './components/organisms/GlobalProcessingIndicator'
import DpdpNoticeGate from './components/organisms/DpdpNoticeGate'

function App() {
  return (
    <ErrorBoundary scope="app root">
      {/* Global processing animation — brand-gradient top bar + pulsing
          NyayaX pill, shown whenever any data query/mutation is in flight. */}
      <GlobalProcessingIndicator />
      {/* DPDP first-login notice — blocks the screen until the authed user has
          acknowledged the privacy notice. Idempotent on the server. */}
      <DpdpNoticeGate />
      <AppRoutes />
    </ErrorBoundary>
  )
}

export default App