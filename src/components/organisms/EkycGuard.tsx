import { FC, ReactNode, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, Loader2, ArrowRight, ShieldCheck } from 'lucide-react'
import useEkycStatus from '@/hooks/useEkycStatus'
import AadhaarKycModal from '@/components/molecules/AadhaarKycModal'

interface EkycGuardProps {
  /** What to render if the gate passes. */
  children: ReactNode
  /** Action label shown in the headline, e.g. "book a consultation". */
  action?: string
  /** Render even for non-CLIENT roles (default: true — non-clients always pass). */
  passNonClient?: boolean
  /** Optional class for the blocked-state wrapper. */
  className?: string
}

/**
 * Hard gate that renders `children` only when the logged-in CLIENT has
 * completed Aadhaar eKYC. Lawyers / admins / orgs always pass through.
 *
 * The blocked state is informative, not punishing — it explains *why* the
 * action is gated, links to the full verification flow on the profile page,
 * and offers an inline "Verify now" button that opens the same OTP modal
 * EkycStatusCard uses. Pending OTP sessions resume seamlessly.
 */
const EkycGuard: FC<EkycGuardProps> = ({ children, action = 'continue', passNonClient = true, className }) => {
  const { isClient, isVerified, pending, pendingSubmission, isLoading } = useEkycStatus()
  const [modalOpen, setModalOpen] = useState(false)

  // Non-clients (lawyer/admin/org/court-admin) bypass the gate.
  if (!isClient && passNonClient) return <>{children}</>

  // Wait for the status fetch — quick, cached after first load.
  if (isClient && isLoading) {
    return (
      <div className={`flex items-center justify-center py-16 ${className || ''}`}>
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-sm text-gray-500">Checking verification…</span>
      </div>
    )
  }

  if (isVerified) return <>{children}</>

  // Blocked: show the explainer + CTAs
  return (
    <>
      <div className={`max-w-xl mx-auto py-10 ${className || ''}`}>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white">
            <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold">Aadhaar verification required</h2>
            <p className="text-sm text-white/80 mt-1">
              To {action}, we need to verify your identity through Aadhaar eKYC.
              This is a one-time step that takes less than a minute.
            </p>
          </div>
          <div className="p-6 space-y-4">
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                Lawyers know they're consulting a verified person.
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                Wallet payouts and refunds are protected against fraud.
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                Unlocks free legal-aid eligibility under the Tele-Law scheme.
              </li>
            </ul>

            {pending && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 rounded-lg text-sm">
                You have an OTP request waiting. Tap "Enter OTP" below to finish.
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                {pending ? 'Enter OTP' : 'Verify Aadhaar now'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <Link
                to="/app/ekyc"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Open verification page
              </Link>
            </div>
            <p className="text-xs text-gray-400">
              Your Aadhaar number is hashed before storage and never shown back. We follow UIDAI guidelines.
            </p>
          </div>
        </div>
      </div>

      <AadhaarKycModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        resumeSubmission={pending && pendingSubmission ? { id: pendingSubmission.id, expiresAt: pendingSubmission.expiresAt } : null}
      />
    </>
  )
}

export default EkycGuard
