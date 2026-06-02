import { FC, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, Hourglass, AlertCircle, Fingerprint, Phone, Lock, Clock,
  Loader2, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2, Landmark, ExternalLink,
} from 'lucide-react'
import useEkycStatus from '@/hooks/useEkycStatus'
import AadhaarKycModal from '@/components/molecules/AadhaarKycModal'

/**
 * Dedicated full-page eKYC landing — mirrors the mobile app's
 * `EkycStatusScreen`. Renders one of four states:
 *   - VERIFIED:   green card with masked Aadhaar + verified-on date + helper
 *   - PENDING:    amber card with "Continue verification" → resumes OTP step
 *   - FAILED / EXPIRED: red card with reason + "Try again"
 *   - none yet:   intro card with privacy bullets + "Verify with Aadhaar"
 *
 * Uses the same `AadhaarKycModal` component for the OTP wizard so the
 * card-on-profile experience and the full-page experience stay in sync.
 */
const EkycPage: FC = () => {
  const navigate = useNavigate()
  const { isClient, data, isLoading, isFetching, refetch, pending, pendingSubmission, supportsDigilocker } = useEkycStatus()
  const [modalOpen, setModalOpen] = useState(false)

  const verified = !!data?.client?.ekycVerified
  const sub = data?.latestSubmission
  const failed = !verified && !pending && (sub?.status === 'FAILED' || sub?.status === 'EXPIRED')

  // Non-CLIENT users shouldn't be on this page at all — bounce them to home.
  if (!isClient) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600">Aadhaar eKYC is only available for client accounts.</p>
        <button onClick={() => navigate('/app/home')} className="mt-4 text-sm text-primary hover:underline">
          Back to home
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 -mx-4 sm:-mx-6 lg:-mx-8 -my-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-[#0a3d50] text-white px-6 pt-8 pb-12">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Identity Verification</h1>
          <p className="text-white/80 mt-1">
            {supportsDigilocker
              ? 'Verify your identity with Aadhaar via DigiLocker — takes about a minute.'
              : 'Verify your identity with Aadhaar OTP — takes about 60 seconds.'}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 -mt-8 pb-12">
        {isLoading ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 shadow-sm flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-gray-500">Loading eKYC status…</span>
          </div>
        ) : verified ? (
          <VerifiedCard
            name={data?.client?.aadhaarName || '—'}
            last4={data?.client?.aadhaarLast4}
            verifiedAt={data?.client?.ekycVerifiedAt}
            detailsMissing={!data?.client?.aadhaarName}
            via={(data?.client as any)?.ekycVerifiedVia}
            onReverify={() => setModalOpen(true)}
          />
        ) : pending ? (
          <PendingCard
            onContinue={() => setModalOpen(true)}
            expiresAt={pendingSubmission?.expiresAt}
            digilocker={supportsDigilocker}
          />
        ) : failed ? (
          <FailedCard
            reason={sub?.failureReason}
            isExpired={sub?.status === 'EXPIRED'}
            onRetry={() => setModalOpen(true)}
          />
        ) : (
          <IntroCard onStart={() => setModalOpen(true)} onSkip={() => navigate(-1)} digilocker={supportsDigilocker} />
        )}

        {/* Refresh button — useful for clients verifying on a different device */}
        {!isLoading && (
          <div className="text-center mt-4">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Checking…' : 'Refresh status'}
            </button>
          </div>
        )}
      </div>

      <AadhaarKycModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        resumeSubmission={pending && pendingSubmission
          ? { id: pendingSubmission.id, expiresAt: pendingSubmission.expiresAt }
          : null}
        onVerified={() => refetch()}
      />
    </div>
  )
}

// ─── State cards ─────────────────────────────────────────────────────────

const VerifiedCard: FC<{
  name: string
  last4?: string | null
  verifiedAt?: string | null
  detailsMissing?: boolean
  via?: 'AADHAAR' | 'EMAIL_OTP' | null
  onReverify?: () => void
}> = ({ name, last4, verifiedAt, detailsMissing, via, onReverify }) => {
  // EMAIL_OTP is the temporary fallback (no Aadhaar details captured). Offer a
  // first-class "upgrade to Aadhaar via DigiLocker" path. detailsMissing is
  // also true for an Aadhaar attempt that failed to capture the name — that
  // keeps the older "complete your details" wording.
  const isTemp = via === 'EMAIL_OTP'
  const showUpgrade = detailsMissing || isTemp
  return (
  <div className={`bg-white border ${isTemp ? 'border-amber-200' : 'border-green-200'} rounded-2xl shadow-sm overflow-hidden`}>
    <div className={`${isTemp ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'} px-6 py-4 border-b flex items-center gap-2`}>
      <CheckCircle2 className={`w-5 h-5 ${isTemp ? 'text-amber-600' : 'text-green-600'}`} />
      <h2 className={`font-semibold ${isTemp ? 'text-amber-900' : 'text-green-900'}`}>
        {isTemp ? 'Identity Verified — Temporary' : 'Identity Verified'}
      </h2>
    </div>
    <div className="p-6 space-y-3">
      <Row label="Name" value={name} />
      <Row label="Aadhaar" value={last4 ? `XXXX XXXX ${last4}` : '—'} mono />
      <Row label="Verified on" value={verifiedAt ? new Date(verifiedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} />

      {showUpgrade ? (
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            {isTemp
              ? "You're verified via the temporary email-OTP path. Upgrade to full Aadhaar verification via DigiLocker for complete, locked identity verification."
              : "Your identity is verified, but we couldn't capture your Aadhaar name/number details. Re-run DigiLocker to complete your profile."}
          </p>
          <button
            onClick={onReverify}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700"
          >
            <RefreshCw className="w-4 h-4" /> {isTemp ? 'Upgrade to Aadhaar via DigiLocker' : 'Complete verification details'}
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-500 leading-relaxed pt-3 border-t border-gray-100">
          Your identity is locked to your Aadhaar profile. You cannot change name, date of birth, or
          gender without contacting support.
        </p>
      )}
    </div>
  </div>
  )
}

const PendingCard: FC<{ onContinue: () => void; expiresAt?: string | null; digilocker?: boolean }> = ({ onContinue, expiresAt, digilocker }) => (
  <div className="bg-white border border-amber-200 rounded-2xl shadow-sm overflow-hidden">
    <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center gap-2">
      <Hourglass className="w-5 h-5 text-amber-600" />
      <h2 className="font-semibold text-amber-900">Verification In Progress</h2>
    </div>
    <div className="p-6 space-y-4">
      <p className="text-sm text-gray-700">
        {digilocker
          ? 'You started verifying with DigiLocker but didn’t finish. Continue to open DigiLocker again and complete your Aadhaar consent.'
          : 'We sent a 6-digit OTP to your Aadhaar-linked mobile number. Continue where you left off to complete verification.'}
      </p>
      {expiresAt && (
        <p className="text-xs text-gray-500">
          {digilocker ? 'Session' : 'OTP'} expires at {new Date(expiresAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}.
        </p>
      )}
      <button
        onClick={onContinue}
        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700"
      >
        Continue verification <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
)

const FailedCard: FC<{ reason?: string | null; isExpired?: boolean; onRetry: () => void }> = ({ reason, isExpired, onRetry }) => (
  <div className="bg-white border border-red-200 rounded-2xl shadow-sm overflow-hidden">
    <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-2">
      <AlertCircle className="w-5 h-5 text-red-600" />
      <h2 className="font-semibold text-red-900">{isExpired ? 'OTP Expired' : 'Verification Failed'}</h2>
    </div>
    <div className="p-6 space-y-4">
      <p className="text-sm text-gray-700">
        {reason || (isExpired
          ? 'The OTP timed out before being submitted. Please request a new one.'
          : 'We were unable to verify your identity. Please try again.')}
      </p>
      <button
        onClick={onRetry}
        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90"
      >
        Try again <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
)

const IntroCard: FC<{ onStart: () => void; onSkip: () => void; digilocker?: boolean }> = ({ onStart, onSkip, digilocker }) => (
  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
    <div className="bg-gradient-to-br from-primary/5 to-white px-6 py-4 border-b border-gray-100 flex items-center gap-2">
      {digilocker ? <Landmark className="w-5 h-5 text-primary" /> : <Fingerprint className="w-5 h-5 text-primary" />}
      <h2 className="font-semibold text-gray-900">Get Verified</h2>
    </div>
    <div className="p-6 space-y-5">
      <p className="text-sm text-gray-700 leading-relaxed">
        {digilocker
          ? "Verify your identity through DigiLocker — the Government of India's secure document wallet. We never store your full Aadhaar number — only the last four digits and your verified name."
          : 'Verify your identity in under a minute using Aadhaar OTP. We never store your full Aadhaar number — only the last four digits and a one-way hash for de-duplication.'}
      </p>

      <ul className="space-y-3">
        {digilocker ? (
          <>
            <Bullet icon={Landmark} text="Consent captured securely by DigiLocker (UIDAI)" />
            <Bullet icon={Lock} text="Only your name + masked Aadhaar (last 4) are stored" />
            <Bullet icon={Clock} text="Takes about a minute to complete" />
          </>
        ) : (
          <>
            <Bullet icon={Phone} text="OTP delivered to your Aadhaar-linked phone number" />
            <Bullet icon={Lock} text="Aadhaar number is SHA-256 hashed before storage" />
            <Bullet icon={Clock} text="Takes about 60 seconds to complete" />
          </>
        )}
      </ul>

      <button
        onClick={onStart}
        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90"
      >
        {digilocker ? <><ExternalLink className="w-4 h-4" /> Verify with DigiLocker</> : <><ShieldCheck className="w-4 h-4" /> Verify with Aadhaar</>}
      </button>
      <button
        onClick={onSkip}
        className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
      >
        Skip for now — verify later
      </button>
    </div>
  </div>
)

// ─── Helpers ─────────────────────────────────────────────────────────────

const Row: FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-gray-500">{label}</span>
    <span className={`text-gray-900 font-medium ${mono ? 'font-mono tracking-wider' : ''}`}>{value}</span>
  </div>
)

const Bullet: FC<{ icon: React.ComponentType<{ className?: string }>; text: string }> = ({ icon: Icon, text }) => (
  <li className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
      <Icon className="w-4 h-4" />
    </div>
    <span className="text-sm text-gray-700 leading-relaxed pt-1.5">{text}</span>
  </li>
)

export default EkycPage
