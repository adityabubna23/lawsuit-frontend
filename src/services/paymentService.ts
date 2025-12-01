import api from './api'

export interface PaymentIntent {
  id: string
  amount: number
  currency: string
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded'
  clientSecret: string
}

export interface PaymentMethod {
  id: string
  type: 'card'
  card: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
  }
}

class PaymentService {
  private static instance: PaymentService
  
  private constructor() {}
  
  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService()
    }
    return PaymentService.instance
  }

  async createPaymentIntent(amount: number, currency: string = 'usd'): Promise<PaymentIntent> {
    const response = await api.post('/payments/create-intent', { amount, currency })
    return response.data
  }

  async confirmPayment(paymentIntentId: string, paymentMethod: string): Promise<PaymentIntent> {
    const response = await api.post(`/payments/${paymentIntentId}/confirm`, { paymentMethod })
    return response.data
  }

  async getSavedPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await api.get('/payments/methods')
    return response.data
  }

  async addPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    const response = await api.post('/payments/methods', { paymentMethodId })
    return response.data
  }

  async removePaymentMethod(paymentMethodId: string): Promise<void> {
    await api.delete(`/payments/methods/${paymentMethodId}`)
  }

  // Helper method to format amount in cents
  static formatAmount(amount: number): number {
    return Math.round(amount * 100)
  }

  // Helper method to format currency display
  static formatCurrency(amount: number, currency: string = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount)
  }
}

export const paymentService = PaymentService.getInstance()
export default paymentService