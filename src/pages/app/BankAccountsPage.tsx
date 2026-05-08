import { FC, useEffect, useState } from 'react'
import { Building2, Smartphone, Plus, Star, Trash2, Loader2, X, Check, AlertCircle } from 'lucide-react'
import { bankAccountApi, BankAccountPayload } from '@/services/api'

interface BankAccount {
  id: string
  type: 'BANK' | 'UPI'
  accountHolderName?: string | null
  accountNumber?: string | null
  ifscCode?: string | null
  bankName?: string | null
  upiId?: string | null
  label?: string | null
  isDefault: boolean
  createdAt: string
}

const maskAccount = (acc?: string | null) =>
  acc ? `••••${acc.slice(-4)}` : ''

const BankAccountsPage: FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await bankAccountApi.list()
      const data = (res.data?.data ?? res.data ?? []) as BankAccount[]
      setAccounts(Array.isArray(data) ? data : [])
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to load bank accounts', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSetDefault = async (acc: BankAccount) => {
    try {
      await bankAccountApi.update(acc.id, { isDefault: true })
      showToast('Default account updated', 'success')
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to update', 'error')
    }
  }

  const handleDelete = async (acc: BankAccount) => {
    if (!confirm('Remove this account?')) return
    try {
      await bankAccountApi.delete(acc.id)
      showToast('Account removed', 'success')
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to remove', 'error')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Accounts & UPI</h1>
          <p className="text-sm text-gray-500 mt-1">Used as the destination for wallet withdrawals.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-gray-500">Loading…</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center shadow-sm">
          <Building2 className="w-12 h-12 mx-auto text-gray-300" />
          <p className="mt-3 text-gray-500">No accounts added yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex items-center gap-4"
            >
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {acc.type === 'BANK' ? <Building2 className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">
                    {acc.label || (acc.type === 'BANK' ? acc.bankName : 'UPI')}
                  </span>
                  {acc.isDefault && (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3 fill-current" /> Default
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {acc.type === 'BANK'
                    ? `${acc.bankName ?? ''} • ${maskAccount(acc.accountNumber)} • ${acc.ifscCode ?? ''}`
                    : acc.upiId}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {!acc.isDefault && (
                  <button
                    onClick={() => handleSetDefault(acc)}
                    className="text-sm text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Set default
                  </button>
                )}
                <button
                  onClick={() => handleDelete(acc)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddBankAccountModal
          onClose={() => setShowAdd(false)}
          onSaved={async () => {
            setShowAdd(false)
            showToast('Account added', 'success')
            await load()
          }}
        />
      )}

      {toast && (
        <div className="fixed right-6 bottom-6 z-50">
          <div className={`flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}

interface ModalProps {
  onClose: () => void
  onSaved: () => void
}

const AddBankAccountModal: FC<ModalProps> = ({ onClose, onSaved }) => {
  const [type, setType] = useState<'BANK' | 'UPI'>('BANK')
  const [label, setLabel] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  // BANK fields
  const [accountHolderName, setAccountHolderName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [bankName, setBankName] = useState('')

  // UPI fields
  const [upiId, setUpiId] = useState('')

  const [saving, setSaving] = useState(false)
  const [lookingUpIfsc, setLookingUpIfsc] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleIfscBlur = async () => {
    if (!ifscCode || ifscCode.length !== 11) return
    setLookingUpIfsc(true)
    try {
      const res = await bankAccountApi.ifscLookup(ifscCode.toUpperCase())
      const data = (res.data?.data ?? res.data) as any
      if (data?.bank?.bankName) setBankName(data.bank.bankName)
      else if (data?.bankName) setBankName(data.bankName)
    } catch {
      /* ignore — user can type bank name manually */
    } finally {
      setLookingUpIfsc(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload: BankAccountPayload = {
        type,
        label: label || undefined,
        isDefault: isDefault || undefined,
      }
      if (type === 'BANK') {
        Object.assign(payload, {
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          bankName: bankName.trim(),
        })
      } else {
        payload.upiId = upiId.trim()
      }
      await bankAccountApi.create(payload)
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to add account')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">Add account</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['BANK', 'UPI'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-3 rounded-xl border text-sm font-medium transition-colors ${type === t
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
              >
                {t === 'BANK' ? 'Bank account' : 'UPI ID'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Label (optional)</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Primary Account"
              maxLength={50}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          {type === 'BANK' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Account holder name</label>
                <input
                  required
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Account number</label>
                <input
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">IFSC code</label>
                  <input
                    required
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    onBlur={handleIfscBlur}
                    placeholder="HDFC0001234"
                    maxLength={11}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none uppercase"
                  />
                  {lookingUpIfsc && <p className="mt-1 text-xs text-gray-400">Looking up bank…</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Bank name</label>
                  <input
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">UPI ID</label>
              <input
                required
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="name@bank"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded text-primary focus:ring-primary/30"
            />
            Set as default withdrawal account
          </label>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Adding…' : 'Add account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BankAccountsPage
