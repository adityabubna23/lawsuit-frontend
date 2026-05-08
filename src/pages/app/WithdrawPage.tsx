import { FC, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useWalletStore from '@/stores/walletStore'
import { ArrowLeft, Building2, AlertCircle, CheckCircle, Smartphone, Plus } from 'lucide-react'
import { bankAccountApi } from '@/services/api'

interface BankAccount {
  id: string
  type: 'BANK' | 'UPI'
  bankName?: string | null
  accountNumber?: string | null
  upiId?: string | null
  label?: string | null
  isDefault: boolean
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const WithdrawPage: FC = () => {
  const navigate = useNavigate()
  const { balance, loading, fetchBalance, withdraw } = useWalletStore()
  const [amount, setAmount] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetchBalance()
    const loadAccounts = async () => {
      try {
        const res = await bankAccountApi.list()
        const data = (res.data?.data ?? res.data ?? []) as BankAccount[]
        const list = Array.isArray(data) ? data : []
        setAccounts(list)
        const def = list.find((a) => a.isDefault)
        if (def) setBankAccountId(def.id)
      } catch {
        /* ignore */
      } finally {
        setAccountsLoading(false)
      }
    }
    loadAccounts()
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">Withdraw to</label>
              <Link to="/app/bank-accounts" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                <Plus className="w-3 h-3" /> Manage accounts
              </Link>
            </div>
            {accountsLoading ? (
              <div className="text-xs text-gray-400">Loading accounts…</div>
            ) : accounts.length === 0 ? (
              <Link
                to="/app/bank-accounts"
                className="block w-full px-4 py-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary hover:text-primary text-center transition-colors"
              >
                No accounts yet — add one to withdraw
              </Link>
            ) : (
              <div className="space-y-2">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setBankAccountId(acc.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${bankAccountId === acc.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {acc.type === 'BANK' ? <Building2 className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {acc.label || (acc.type === 'BANK' ? acc.bankName : 'UPI')}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {acc.type === 'BANK'
                          ? `••••${(acc.accountNumber || '').slice(-4)}`
                          : acc.upiId}
                      </div>
                    </div>
                    {acc.isDefault && (
                      <span className="text-[10px] uppercase tracking-wider text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
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
