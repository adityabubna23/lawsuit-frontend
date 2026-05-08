import { FC, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { usersApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

const DangerZone: FC = () => {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (confirm !== 'DELETE') {
      setError('Please type DELETE to confirm.')
      return
    }
    if (!window.confirm('This will permanently disable your account. Continue?')) return
    setBusy(true)
    setError(null)
    try {
      await usersApi.deleteMe()
      logout()
      navigate('/auth/login')
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to delete account')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-red-200">
      <div className="px-6 py-4 border-b border-red-100 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-600" />
        <h3 className="text-lg font-semibold text-red-700">Danger zone</h3>
      </div>
      <div className="p-6 space-y-3">
        <p className="text-sm text-gray-700">
          Deleting your account will deactivate your profile and remove access to consultations,
          cases, and wallet history. This action cannot be undone from the app — contact support if you change your mind.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Type <span className="font-mono font-bold">DELETE</span> to confirm:
          </label>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="DELETE"
            className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none font-mono"
          />
        </div>
        {error && <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
        <button
          onClick={handleDelete}
          disabled={busy || confirm !== 'DELETE'}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          {busy ? 'Deleting…' : 'Delete my account'}
        </button>
      </div>
    </div>
  )
}

export default DangerZone
