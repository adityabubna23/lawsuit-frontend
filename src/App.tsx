import AppRoutes from './routes'
import ErrorBoundary from './components/organisms/ErrorBoundary'
import GlobalProcessingIndicator from './components/organisms/GlobalProcessingIndicator'

function App() {
  return (
    <ErrorBoundary scope="app root">
      {/* Global processing animation — brand-gradient top bar + pulsing
          NyayaX pill, shown whenever any data query/mutation is in flight. */}
      <GlobalProcessingIndicator />
      <AppRoutes />
    </ErrorBoundary>
  )
}

export default App