import { FC, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useWalletStore from '@/stores/walletStore'
import { ArrowLeft, Building2, AlertCircle, CheckCircle } from 'lucide-react'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const WithdrawPage: FC = () => {
  const navigate = useNavigate()
  const { balance, loading, fetchBalance, withdraw } = useWalletStore()
  const [amount, setAmount] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetchBalance()
  }, [])

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleWithdraw = async () => {
    const amt = parseInt(amount, 10)
    if (!amt || amt < 1) return

    if (amt > balance) {
      showToast('Insufficient wallet balance', 'error')
      return
    }

    const result = await withdraw(amt, bankAccountId.trim() || undefined)
    if (result.success) {
      showToast(`${fmt(amt)} withdrawn successfully!`, 'success')
      setAmount('')
      setBankAccountId('')
      setTimeout(() => navigate('/app/wallet'), 1500)
    } else {
      showToast(result.message || 'Withdrawal failed', 'error')
    }
  }

  const parsedAmount = parseInt(amount, 10) || 0

  return (
    <div className="max-w-lg mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/app/wallet')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Wallet
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-[#0a3d50] p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Withdraw to Bank</h1>
              <div className="text-sm opacity-80 mt-0.5">Available: {fmt(balance)}</div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Withdrawal Amount (₹)</label>
            <input
              type="number"
              min="1"
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-lg"
            />
            {parsedAmount > balance && parsedAmount > 0 && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Amount exceeds your wallet balance
              </p>
            )}
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2">
            {[500, 1000, 2000, 5000].map((a) => (
              <button
                key={a}
                onClick={() => setAmount(String(Math.min(a, balance)))}
                disabled={a > balance}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${amount === String(a) ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
              >
                ₹{a.toLocaleString()}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Bank Account ID <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              placeholder="Enter bank account ID"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
            <p className="mt-1.5 text-xs text-gray-400">If not provided, funds will be sent to your default bank account.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex items-center gap-3">
          <button
            onClick={() => navigate('/app/wallet')}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleWithdraw}
            disabled={!parsedAmount || parsedAmount < 1 || parsedAmount > balance || loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Processing…' : `Withdraw ${parsedAmount > 0 ? fmt(parsedAmount) : '₹0'}`}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed right-6 bottom-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className={`flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}

export default WithdrawPage
