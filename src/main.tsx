import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
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
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>
    )
  } catch (error) {
    console.error('Failed to start the application:', error)
  }
}

startApp()