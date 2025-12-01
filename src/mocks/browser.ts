import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// Create worker instance
export const worker = setupWorker(...handlers)

// Explicitly log any errors during worker start
worker.events.on('request:unhandled', ({ request }) => {
  console.log('Unhandled request:', request.method, request.url)
})

worker.events.on('request:start', ({ request }) => {
  console.log('Intercepted:', request.method, request.url)
})

export async function startMockServer() {
  try {
    if (import.meta.env.MODE === 'development') {
      console.log('Starting MSW worker...')
      await worker.start({
        onUnhandledRequest: 'bypass',
      })
      console.log('MSW worker started successfully')
    }
  } catch (error) {
    console.error('Failed to start MSW worker:', error)
  }
}