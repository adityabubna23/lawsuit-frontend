import { FC, useState } from 'react'
import { ShieldCheck, ShieldAlert, ShieldOff, Clock, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import useEkycStatus from '@/hooks/useEkycStatus'
import { friendlyError } from '@/utils/errors'
import AadhaarKycModal from './AadhaarKycModal'

interface EkycStatusCardProps {
  /** Compact variant for embedding inside other forms (Profile, Booking). */
  compact?: boolean
  /** Optional callback after a successful verification. */
  onVerified?: () => void
  className?: string
}

/**
 * Surfaces the current eKYC state for the logged-in CLIENT and provides a CTA
 * to open the Aadhaar OTP wizard. Renders nothing for non-CLIENT roles so it
 * can be dropped into shared layouts safely.
 */
const EkycStatusCard: FC<EkycStatusCardProps> = ({ compact, onVerified, className }) => {
  const { isClient, data: status, isLoading: loading, error: rawError, refetch } = useEkycStatus()
  const [modalOpen, setModalOpen] = useState(false)
  const error = rawError ? friendlyError(rawError, 'Failed to load eKYC status') : null

  if (!isClient) return null

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 ${className || ''}`}>
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Loading eKYC status…</span>
      </div>
    )
  }

  if (error && !status) {
    return (
      <div className={`bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 ${className || ''}`}>
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm text-red-800">{error}</div>
          <button onClick={() => refetch()} className="mt-1 text-xs text-red-700 hover:underline inline-flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      </div>
    )
  }

  // Decide which state to render
  const verified = !!status?.client?.ekycVerified
  const latest = status?.latestSubmission
  const pending = !verified && latest?.status === 'PENDING' && latest.expiresAt && new Date(latest.expiresAt).getTime() > Date.now()
  const failed = !verified && (latest?.status === 'FAILED' || latest?.status === 'EXPIRED')

  // Decide variant + content
  let icon: React.ReactNode
  let pillText: string
  let pillClass: string
  let title: string
  let body: React.ReactNode
  let cta: React.ReactNode | null = null

  if (verified) {
    icon = <ShieldCheck className="w-5 h-5 text-green-600" />
    pillText = 'Verified'
    pillClass = 'bg-green-50 text-green-700 border-green-200'
    title = 'Aadhaar verified'
    body = (
      <>
        {status?.client?.aadhaarName && <strong>{status.client.aadhaarName}</strong>}
        {status?.client?.aadhaarLast4 && (
          <>
            {status?.client?.aadhaarName && ' · '}
            Aadhaar <span className="font-mono">XXXX XXXX {status.client.aadhaarLast4}</span>
          </>
        )}
        {status?.client?.ekycVerifiedAt && (
          <div className="text-xs text-gray-400 mt-0.5">
            Verified {new Date(status.client.ekycVerifiedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        )}
        {!compact && (
          <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
            Your identity is locked to your Aadhaar profile. Contact support to change your name, date of birth, or gender.
          </p>
        )}
      </>
    )
  } else if (pending) {
    icon = <Clock className="w-5 h-5 text-amber-600" />
    pillText = 'OTP pending'
    pillClass = 'bg-amber-50 text-amber-700 border-amber-200'
    title = 'OTP sent to your Aadhaar mobile'
    body = (
      <>
        Enter the 6-digit code to finish verification.
        {latest?.expiresAt && (
          <div className="text-xs text-gray-400 mt-0.5">
            Expires {new Date(latest.expiresAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
          </div>
        )}
      </>
    )
    cta = (
      <button
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-600 text-white text-xs font-medium hover:bg-amber-700"
      >
        Enter OTP
      </button>
    )
  } else if (failed) {
    icon = <ShieldAlert className="w-5 h-5 text-red-600" />
    pillText = latest?.status === 'EXPIRED' ? 'Expired' : 'Failed'
    pillClass = 'bg-red-50 text-red-700 border-red-200'
    title = 'Verification didn\'t complete'
    body = latest?.failureReason
      ? <>Reason: {latest.failureReason}</>
      : <>Please try again with the correct Aadhaar number.</>
    cta = (
      <button
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700"
      >
        Retry
      </button>
    )
  } else {
    icon = <ShieldOff className="w-5 h-5 text-gray-400" />
    pillText = 'Not verified'
    pillClass = 'bg-gray-100 text-gray-600 border-gray-200'
    title = 'Verify your Aadhaar'
    body = (
      <>Aadhaar verification unlocks free legal aid eligibility (Tele-Law) and faster lawyer onboarding.</>
    )
    cta = (
      <button
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
      >
        Verify Aadhaar
      </button>
    )
  }

  return (
    <>
      <div
        className={`bg-white rounded-xl border border-gray-100 ${compact ? 'p-3' : 'p-5'} flex items-start gap-3 ${className || ''}`}
      >
        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>{title}</h3>
            <span className={`inline-block text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded border ${pillClass}`}>
              {pillText}
            </span>
          </div>
          <div className={`text-gray-600 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>{body}</div>
        </div>
        {cta && <div className="flex-shrink-0">{cta}</div>}
      </div>

      <AadhaarKycModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        // Resume the active OTP submission if there is one — skips Aadhaar step.
        resumeSubmission={pending ? { id: latest!.id, expiresAt: latest!.expiresAt } : null}
        onVerified={() => {
          refetch()
          onVerified?.()
        }}
      />
    </>
  )
}

export default EkycStatusCard
