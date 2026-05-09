import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { queryClient } from './lib/queryClient'
import App from './App'
import './index.css'
// import { startMockServer } from './mocks/browser'

async function startApp() {
  try {
    // Start MSW for frontend only development
    // if (import.meta.env.DEV) {
    //   await startMockServer()
    //   console.log('Mock server started successfully')
    // }

    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          {/*
            Opt into v7 future flags so the upgrade is incremental and the
            console deprecation warnings go away. `v7_startTransition` wraps
            internal state updates in React.startTransition; `v7_relativeSplatPath`
            adopts the v7 behaviour for relative routes inside splat routes.
            Both are safe defaults for our routing setup.
          */}
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </React.StrictMode>
    )
  } catch (error) {
    console.error('Failed to start the application:', error)
  }
}

startApp()