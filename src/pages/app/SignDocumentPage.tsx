import { FC, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PenLine, Loader2, CheckCircle2, Download, ShieldCheck, AlertCircle } from 'lucide-react'
import { esignApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { friendlyError } from '@/utils/errors'

interface Party { id: string; name: string; email: string; roleLabel?: string; status: string; userId?: string | null }
interface SigReq {
  id: string; title: string; status: string; documentHash?: string
  parties: Party[]
}

/**
 * Generic signing page (item 9/12). A party opens this, requests an OTP, and
 * signs. When all parties have signed the request completes and the signed PDF
 * becomes downloadable via a short-lived gated URL.
 */
const SignDocumentPage: FC = () => {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.user)
  const [req, setReq] = useState<SigReq | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const res = await esignApi.getRequest(id)
      setReq((res.data?.data ?? res.data) as SigReq)
    } catch (err) {
      setError(friendlyError(err, 'Could not load this signature request.'))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const myParty = req?.parties.find((p) => p.userId === me?.id)
  const completed = req?.status === 'COMPLETED'
  const alreadySigned = myParty?.status === 'SIGNED'

  const sendOtp = async () => {
    setBusy(true); setError(null)
    try {
      await esignApi.sendOtp(id, myParty?.id)
      setOtpSent(true)
    } catch (err) {
      setError(friendlyError(err, 'Could not send the signing code.'))
    } finally { setBusy(false) }
  }

  const sign = async () => {
    if (otp.length !== 6) { setError('Enter the 6-digit code.'); return }
    setBusy(true); setError(null)
    try {
      await esignApi.sign(id, otp, myParty?.id)
      setOtp('')
      await load()
    } catch (err) {
      setError(friendlyError(err, 'Signing failed.'))
    } finally { setBusy(false) }
  }

  const download = async () => {
    try {
      const res = await esignApi.signedUrl(id)
      const url = (res.data?.data ?? res.data).url
      if (url) window.open(url, '_blank')
    } catch (err) {
      setError(friendlyError(err, 'Could not get the signed document.'))
    }
  }

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-[#0a3d50] text-white px-6 py-5 flex items-center gap-2">
          <PenLine className="w-5 h-5" />
          <h1 className="font-semibold">{req?.title || 'Sign document'}</h1>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Parties + status */}
          <div className="space-y-1.5">
            {req?.parties.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{p.name} {p.roleLabel && <span className="text-gray-400">· {p.roleLabel}</span>}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${p.status === 'SIGNED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {p.status === 'SIGNED' ? 'Signed' : 'Pending'}
                </span>
              </div>
            ))}
          </div>

          {completed ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-gray-900">Fully signed</p>
              <button onClick={download} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90">
                <Download className="w-4 h-4" /> Download signed PDF
              </button>
            </div>
          ) : !myParty ? (
            <p className="text-sm text-gray-500">You are not a signing party on this document.</p>
          ) : alreadySigned ? (
            <p className="text-sm text-green-700">You've signed. Waiting for the other parties.</p>
          ) : !otpSent ? (
            <button onClick={sendOtp} disabled={busy} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Send me a signing code
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Enter the 6-digit code we sent you to sign.</p>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="••••••"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-center text-lg font-mono tracking-[0.4em]"
              />
              <button onClick={sign} disabled={busy || otp.length !== 6} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                Sign
              </button>
            </div>
          )}

          {req?.documentHash && (
            <p className="text-[10px] text-gray-400 break-all pt-2 border-t border-gray-100">Document hash: {req.documentHash}</p>
          )}
          <button onClick={() => navigate(-1)} className="w-full text-sm text-gray-500 hover:text-gray-700">Back</button>
        </div>
      </div>
    </div>
  )
}

export default SignDocumentPage
