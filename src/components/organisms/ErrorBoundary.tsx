import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  /** Optional label so the user knows where the crash happened. */
  scope?: string
}

interface State {
  error: Error | null
  info: ErrorInfo | null
}

/**
 * Catches render-time errors in any subtree and shows a real UI instead of
 * the silent blank screen React falls back to. Without this, a single page
 * component throwing unmounts the whole tree and the user has no recourse.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary${this.props.scope ? ' · ' + this.props.scope : ''}]`, error, info)
    this.setState({ info })
  }

  reset = () => {
    this.setState({ error: null, info: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white border border-red-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-red-100 flex items-start gap-3 bg-red-50">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-red-900">Something went wrong</h2>
              <p className="text-sm text-red-700 mt-0.5">
                {this.props.scope ? `Crash inside ${this.props.scope}.` : 'A page in this section failed to render.'}
              </p>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <details className="bg-gray-50 rounded-lg p-3 text-sm">
              <summary className="cursor-pointer font-medium text-gray-700">Error details</summary>
              <pre className="mt-2 text-xs text-red-700 whitespace-pre-wrap break-words font-mono">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack?.split('\n').slice(0, 8).join('\n')}
              </pre>
            </details>
            <p className="text-sm text-gray-600">
              You can try retrying the page, or go back to the dashboard. If the problem persists,
              copy the error above and report an issue.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={this.reset}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
              <button
                onClick={() => { window.location.reload() }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" /> Hard reload
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Home className="w-4 h-4" /> Home
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
