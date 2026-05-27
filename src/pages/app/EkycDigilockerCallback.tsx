import { FC, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck, CheckCircle2, AlertCircle, Hourglass, Loader2, ArrowRight } from 'lucide-react'
import { ekycApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { friendlyError } from '@/utils/errors'
// Session key the AadhaarKycModal writes before sending the browser to the
// hosted DigiLocker page. We read it back here to know which submission to
// complete (the redirect is cross-origin, so component state is lost).
import { EKYC_DIGILOCKER_SESSION_KEY } from '@/utils/ekycProvider'

type Phase = 'loading' | 'success' | 'pending' | 'error'

/**
 * Landing page for the Surepass DigiLocker redirect. After the user grants
 * Aadhaar consent on DigiLocker, the provider sends them back here. We pull the
 * stashed submission id (and any `client_id` the provider appended), ask the
 * server to download + persist the verified profile, then show the outcome.
 */
const EkycDigilockerCallback: FC = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const setUser = useAuthStore((s) => s.setUser)
  const [phase, setPhase] = useState<Phase>('loading')
  const [message, setMessage] = useState<string>('')
  const ranRef = useRef(false)
  const autoRetriesRef = useRef(0)

  const readSubmissionId = (): string | undefined => {
    try {
      const raw = sessionStorage.getItem(EKYC_DIGILOCKER_SESSION_KEY)
      if (!raw) return undefined
      return JSON.parse(raw)?.submissionId as string | undefined
    } catch {
      return undefined
    }
  }

  const complete = async () => {
    setPhase('loading')
    setMessage('')
    const submissionId = readSubmissionId()
    // Surepass may append its own client_id to the redirect URL — accept it as
    // a fallback so completion works even if sessionStorage was cleared.
    const clientId = params.get('client_id') || params.get('clientId') || undefined

    if (!submissionId && !clientId) {
      setPhase('error')
      setMessage('We lost track of your verification session. Please start again from the verification page.')
      return
    }

    try {
      const res = await ekycApi.completeDigilocker({ submissionId, clientId })
      const body = (res.data?.data ?? res.data) as {
        pending?: boolean
        ekycVerified?: boolean
        ekycVerifiedAt?: string
        ekycVerifiedVia?: 'AADHAAR' | 'EMAIL_OTP'
        aadhaarLast4?: string
        aadhaarName?: string
      }

      if (body?.pending) {
        // `status=success` but the one-time download wasn't ready on the first
        // hit — usually a brief provider lag. Auto-retry a couple of times
        // before falling back to the manual "Check again" button.
        if (autoRetriesRef.current < 2) {
          autoRetriesRef.current += 1
          setPhase('loading')
          setMessage('Finalizing with DigiLocker…')
          setTimeout(() => { void complete() }, 2500)
          return
        }
        setPhase('pending')
        setMessage('Your DigiLocker consent is still being processed. Give it a few seconds, then check again.')
        return
      }

      // Mirror the verified flag onto the auth-store user so guards / badges
      // update without a /auth/me round-trip.
      if (body?.ekycVerified) {
        setUser((prev) =>
          prev
            ? ({
                ...prev,
                ekycVerified: true,
                ekycVerifiedAt: body.ekycVerifiedAt,
                ekycVerifiedVia: body.ekycVerifiedVia ?? 'AADHAAR',
                aadhaarLast4: body.aadhaarLast4,
                aadhaarName: body.aadhaarName,
              } as any)
            : prev,
        )
      }
      sessionStorage.removeItem(EKYC_DIGILOCKER_SESSION_KEY)
      setPhase('success')
      setMessage(
        body?.aadhaarName ? `Welcome, ${body.aadhaarName}. Your identity is verified.` : 'Your identity is verified.',
      )
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 410) {
        setPhase('error')
        setMessage('Your DigiLocker session expired. Please start verification again.')
      } else {
        setPhase('error')
        setMessage(friendlyError(err, "We couldn't confirm your DigiLocker verification. Please try again."))
      }
    }
  }

  // Run exactly once on mount (StrictMode double-invokes effects in dev).
  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true
    void complete()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 -mx-4 sm:-mx-6 lg:-mx-8 -my-8 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-[#0a3d50] text-white px-6 py-5 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          <h1 className="font-semibold">DigiLocker verification</h1>
        </div>

        <div className="p-6 text-center">
          {phase === 'loading' && (
            <>
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-gray-900">Confirming your verification…</h2>
              <p className="text-sm text-gray-500 mt-1">Fetching your Aadhaar profile from DigiLocker.</p>
            </>
          )}

          {phase === 'success' && (
            <>
              <div className="w-14 h-14 mx-auto rounded-full bg-green-50 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Identity verified</h2>
              <p className="text-sm text-gray-600 mt-1">{message}</p>
              <button
                onClick={() => navigate('/app/ekyc')}
                className="mt-5 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {phase === 'pending' && (
            <>
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 flex items-center justify-center mb-3">
                <Hourglass className="w-7 h-7 text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Almost there…</h2>
              <p className="text-sm text-gray-600 mt-1">{message}</p>
              <button
                onClick={() => { autoRetriesRef.current = 0; void complete() }}
                className="mt-5 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700"
              >
                Check again
              </button>
              <button
                onClick={() => navigate('/app/ekyc')}
                className="mt-2 w-full text-sm text-gray-500 hover:text-gray-700 py-1"
              >
                Back to verification
              </button>
            </>
          )}

          {phase === 'error' && (
            <>
              <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-3">
                <AlertCircle className="w-7 h-7 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Verification not completed</h2>
              <p className="text-sm text-gray-600 mt-1">{message}</p>
              <button
                onClick={() => navigate('/app/ekyc')}
                className="mt-5 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90"
              >
                Back to verification
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default EkycDigilockerCallback
