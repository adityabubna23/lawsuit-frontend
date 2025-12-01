import { create } from 'zustand'

interface Tx {
  id: string
  type: string
  amount: number
  meta?: any
  createdAt: string
}

interface WalletState {
  balance: number
  transactions: Tx[]
  loading: boolean
  fetchWallet: () => Promise<void>
  buyGiftCard: (amount: number, cardType: string) => Promise<{ success: boolean; message?: string }>
}

export const useWalletStore = create<WalletState>((set) => ({
  balance: 0,
  transactions: [],
  loading: false,

  fetchWallet: async () => {
    set({ loading: true })
    try {
      const mod = await import('../services/api')
      const res = await mod.walletApi.get()
      const data = (res as any).data?.data ?? (res as any).data ?? res
      set({ balance: data.balance ?? 0, transactions: data.transactions ?? [] })
    } catch (e) {
      // ignore in mock
    } finally {
      set({ loading: false })
    }
  },

  buyGiftCard: async (amount: number, cardType: string) => {
    set({ loading: true })
    try {
      const mod = await import('../services/api')
      const res = await mod.walletApi.buyGiftCard({ amount, cardType })
      const tx = (res as any).data?.data ?? (res as any).data ?? res
      // update local state
      set((state) => ({ balance: state.balance - tx.amount, transactions: [tx, ...state.transactions] }))
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || 'Failed' }
    } finally {
      set({ loading: false })
    }
  }
}))

export default useWalletStore
