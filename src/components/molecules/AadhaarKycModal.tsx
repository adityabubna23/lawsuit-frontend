import { FC, useEffect, useState, useRef } from 'react'
import { X, ShieldCheck, Loader2, AlertCircle, Check, RefreshCw, Lock } from 'lucide-react'
import { ekycApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { friendlyError } from '@/utils/errors'

interface AadhaarKycModalProps {
  open: boolean
  onClose: () => void
  /** Existing pending submission to resume — skips the Aadhaar step. */
  resumeSubmission?: { id: string; expiresAt?: string | null } | null
  /** Fired when the user successfully verifies. Parent should refetch status. */
  onVerified?: () => void
}

type Step = 'aadhaar' | 'otp' | 'done'

// Format 1234 5678 9012 as the user types
const formatAadhaar = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 12)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

const AadhaarKycModal: FC<AadhaarKycModalProps> = ({ open, onClose, resumeSubmission, onVerified }) => {
  const setUser = useAuthStore((s) => s.setUser)
  const [step, setStep] = useState<Step>('aadhaar')
  const [aadhaar, setAadhaar] = useState('')
  const [consent, setConsent] = useState(false)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [verifiedClient, setVerifiedClient] = useState<{ aadhaarLast4?: string; aadhaarName?: string } | null>(null)
  const otpInputRef = useRef<HTMLInputElement>(null)

  // Reset on open / handle resume
  useEffect(() => {
    if (!open) return
    setError(null)
    setOtp('')
    setVerifiedClient(null)
    setConsent(false)
    if (resumeSubmission?.id) {
      setSubmissionId(resumeSubmission.id)
      setExpiresAt(resumeSubmission.expiresAt ?? null)
      setStep('otp')
      setAadhaar('')
    } else {
      setSubmissionId(null)
      setExpiresAt(null)
      setStep('aadhaar')
      setAadhaar('')
    }
  }, [open, resumeSubmission?.id, resumeSubmission?.expiresAt])

  // Countdown for OTP expiry
  useEffect(() => {
    if (step !== 'otp' || !expiresAt) {
      setSecondsLeft(null)
      return
    }
    const target = new Date(expiresAt).getTime()
    const tick = () => {
      const left = Math.max(0, Math.floor((target - Date.now()) / 1000))
      setSecondsLeft(left)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [step, expiresAt])

  // Autofocus OTP field when entering step 2
  useEffect(() => {
    if (step === 'otp') {
      const t = setTimeout(() => otpInputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [step])

  if (!open) return null

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = aadhaar.replace(/\s/g, '')
    if (cleaned.length !== 12) {
      setError('Aadhaar must be 12 digits.')
      return
    }
    if (!consent) {
      setError('Please confirm you understand how Aadhaar OTP is used.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await ekycApi.initiateAadhaar(cleaned)
      const data = (res.data?.data ?? res.data) as { id: string; expiresAt?: string }
      setSubmissionId(data.id)
      setExpiresAt(data.expiresAt ?? null)
      setStep('otp')
      setOtp('')
    } catch (err: any) {
      // Specialised messages for known statuses, otherwise route through
      // friendlyError so server-supplied text wins.
      const status = err?.response?.status
      if (status === 429) setError("You've requested too many OTPs in the last hour. Please wait and try again.")
      else if (status === 409) setError('Your account is already verified — no further action needed.')
      else setError(friendlyError(err, "We couldn't send the OTP right now."))
    } finally {
      setBusy(false)
    }
  }

  const handleSubmitOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!submissionId) return
    if (otp.length !== 6) {
      setError('Enter the 6-digit OTP from your SMS.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await ekycApi.submitOtp(submissionId, otp)
      const client = (res.data?.data ?? res.data) as {
        ekycVerified?: boolean
        ekycVerifiedAt?: string
        aadhaarLast4?: string
        aadhaarName?: string
      }
      setVerifiedClient(client)
      // Mirror the verified flag onto the auth-store user so EkycGuard,
      // EkycStatusCard, and any other consumer reflect it without a
      // /auth/me round-trip.
      if (client?.ekycVerified) {
        setUser((prev) => prev ? ({
          ...prev,
          ekycVerified: true,
          ekycVerifiedAt: client.ekycVerifiedAt,
          aadhaarLast4: client.aadhaarLast4,
          aadhaarName: client.aadhaarName,
        } as any) : prev)
      }
      setStep('done')
      onVerified?.()
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 410) {
        // Server returns 410 GONE when the OTP expired. Bounce the user
        // back to step 1 so they can request a fresh OTP.
        setError('That OTP has expired. Please request a new one.')
        setStep('aadhaar')
        setSubmissionId(null)
        setExpiresAt(null)
        setOtp('')
      } else if (status === 429) {
        setError("Too many OTP attempts. Please wait 15 minutes and try again.")
      } else {
        // 400 with body { data: submission, error: '...' } means the OTP was
        // wrong. Show the server's reason and clear OTP for re-entry.
        setError(friendlyError(err, "That OTP didn't work. Double-check the digits and try again."))
        setOtp('')
      }
    } finally {
      setBusy(false)
    }
  }

  const handleResend = () => {
    // Resending = restart from step 1 with the same Aadhaar (server creates a new submission).
    setStep('aadhaar')
    setSubmissionId(null)
    setExpiresAt(null)
    setOtp('')
    setError(null)
  }

  const otpExpired = secondsLeft != null && secondsLeft <= 0

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Aadhaar eKYC</h2>
              <p className="text-xs text-gray-500">
                {step === 'aadhaar' && 'Step 1 of 2 · Enter Aadhaar'}
                {step === 'otp' && 'Step 2 of 2 · Enter OTP'}
                {step === 'done' && 'Verified'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step content */}
        {step === 'aadhaar' && (
          <form onSubmit={handleInitiate} className="p-5 space-y-4">
            <p className="text-sm text-gray-600">
              We'll send a one-time OTP to the mobile number linked with your Aadhaar.
              Your Aadhaar number is hashed before storage and never shown back.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Aadhaar number</label>
              <input
                value={aadhaar}
                onChange={(e) => setAadhaar(formatAadhaar(e.target.value))}
                inputMode="numeric"
                placeholder="1234 5678 9012"
                maxLength={14}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 font-mono tracking-wider"
              />
            </div>

            {/* Consent — required before initiating UIDAI OTP. Mirrors the
                mobile app and gives us a clear audit trail. */}
            <label className="flex items-start gap-2 cursor-pointer text-xs text-gray-600 leading-relaxed">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-200"
              />
              <span>
                I consent to NyayaX initiating an Aadhaar OTP via UIDAI. I understand my Aadhaar number is hashed
                (SHA-256) before storage; only the last 4 digits and my registered name are retained. My consent
                is recorded for audit purposes.
              </span>
            </label>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
              </div>
            )}
            <button
              type="submit"
              disabled={busy || aadhaar.replace(/\s/g, '').length !== 12 || !consent}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {busy ? 'Sending OTP…' : 'Send OTP'}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Up to 5 OTP requests per hour. Delivery is handled by UIDAI.
            </p>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleSubmitOtp} className="p-5 space-y-4">
            <p className="text-sm text-gray-600">
              Enter the 6-digit OTP sent to your Aadhaar-linked mobile number.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">OTP</label>
              <input
                ref={otpInputRef}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="••••••"
                maxLength={6}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 font-mono tracking-[0.4em] text-center text-lg"
              />
              {secondsLeft != null && (
                <div className={`mt-1.5 text-xs ${otpExpired ? 'text-red-600' : 'text-gray-500'}`}>
                  {otpExpired
                    ? 'OTP expired. Please request a new one.'
                    : `Expires in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`}
                </div>
              )}
            </div>
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={busy}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Resend
              </button>
              <button
                type="submit"
                disabled={busy || otp.length !== 6 || otpExpired}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {busy ? 'Verifying…' : 'Verify'}
              </button>
            </div>
          </form>
        )}

        {step === 'done' && (
          <div className="p-6 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-green-50 flex items-center justify-center mb-3">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Aadhaar verified</h3>
            <p className="text-sm text-gray-600 mt-1">
              {verifiedClient?.aadhaarName ? `Welcome, ${verifiedClient.aadhaarName}.` : 'Your eKYC is complete.'}
              {verifiedClient?.aadhaarLast4 && (
                <> Aadhaar ending <strong>{verifiedClient.aadhaarLast4}</strong>.</>
              )}
            </p>
            <button
              onClick={onClose}
              className="mt-5 px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AadhaarKycModal
