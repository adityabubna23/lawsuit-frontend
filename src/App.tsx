import AppRoutes from './routes'
import ErrorBoundary from './components/organisms/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary scope="app root">
      <AppRoutes />
    </ErrorBoundary>
  )
}

export default App