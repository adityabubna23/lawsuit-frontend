import { FC, useEffect, useState } from 'react'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { usersApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { friendlyError } from '@/utils/errors'

/**
 * One-time DPDP privacy notice. Mounted once at the app root: on first authed
 * boot it polls the server's consent state and, if the user hasn't yet
 * acknowledged, blocks the screen with a modal until they accept. The exact
 * text shown comes from the server so it always matches what we store.
 *
 * Idempotent on the server side, so repeat mounts don't double-fire.
 */
const DpdpNoticeGate: FC = () => {
  const user = useAuthStore((s) => s.user)
  const [needsConsent, setNeedsConsent] = useState<boolean | null>(null)
  const [noticeText, setNoticeText] = useState<string>('')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Poll consent state whenever the authed user changes. No user → no modal.
  useEffect(() => {
    let cancelled = false
    if (!user?.id) {
      setNeedsConsent(null)
      return
    }
    ;(async () => {
      try {
        const res = await usersApi.getDpdpConsentStatus()
        const data = res.data as { consented?: boolean; text?: string }
        if (cancelled) return
        if (data?.text) setNoticeText(data.text)
        setNeedsConsent(!data?.consented)
      } catch {
        // Soft-fail: if the status call errors we don't want to block the app.
        // The next request that genuinely needs consent will surface the issue.
        if (!cancelled) setNeedsConsent(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const handleAgree = async () => {
    if (!agreed) {
      setError('Please tick the consent box to continue.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await usersApi.recordDpdpConsent()
      setNeedsConsent(false)
    } catch (err: any) {
      setError(friendlyError(err, "We couldn't record your consent right now. Please try again."))
    } finally {
      setBusy(false)
    }
  }

  if (!user?.id || needsConsent !== true) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-[#0a3d50] text-white px-6 py-5 flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-semibold">Privacy notice</h2>
            <p className="text-xs text-white/80">
              Under the Digital Personal Data Protection Act, 2023
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line max-h-72 overflow-y-auto pr-1">
            {noticeText || 'Loading…'}
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary/30"
            />
            <span>
              I have read and accept the Privacy Notice and consent to NyayaX processing my personal data for the purposes described.
            </span>
          </label>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleAgree}
            disabled={busy || !agreed}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {busy ? 'Recording…' : 'I agree and continue'}
          </button>
          <p className="text-[11px] text-gray-400 text-center">
            You may withdraw consent later by contacting support. Withdrawal will limit our ability to provide legal services on the platform.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DpdpNoticeGate
