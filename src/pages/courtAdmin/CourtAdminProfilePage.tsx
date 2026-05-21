import { FC, useEffect, useState } from 'react'
import { Loader2, Save, ShieldCheck, Upload, AlertCircle, LogOut } from 'lucide-react'
import { useCourtAdminStore } from '../../stores/courtAdminStore'
import { courtAdminApi, usersApi } from '@/services/api'
import { friendlyError } from '@/utils/errors'
import AddressPicker from '@/components/molecules/AddressPicker'

/**
 * Court admin profile + court details editor.
 *
 * Visual style mirrors the client (`/pages/app/ProfilePage.tsx`) and lawyer
 * (`/pages/lawyer/LawyerProfilePage.tsx`) profile pages:
 *   • max-w-5xl container, rounded-2xl card chrome
 *   • Two-column hero: large circular avatar + Edit overlay on the left,
 *     stacked form fields on the right
 *   • A second card below for the court-specific details (the closest
 *     court-admin analogue to the lawyer's LawyerInfo molecule)
 *
 * Endpoints unchanged from the prior version:
 *   load:  GET /court-admin/me → { user, court }
 *   save:  PUT /court-admin/me           (admin fields)
 *          PUT /court-admin/me/court     (court fields)
 */
const CourtAdminProfilePage: FC = () => {
  const { user, logout } = useCourtAdminStore()

  // ── Admin fields ─────────────────────────────────────────────────
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [registrationNumber, setRegistrationNumber] = useState('')

  // ── Court fields ─────────────────────────────────────────────────
  const [courtName, setCourtName] = useState('')
  const [courtType, setCourtType] = useState('')
  const [courtAddress, setCourtAddress] = useState('')
  const [courtPincode, setCourtPincode] = useState('')
  const [courtState, setCourtState] = useState('')
  const [courtDistrict, setCourtDistrict] = useState('')
  const [courtCity, setCourtCity] = useState('')

  const [loading, setLoading] = useState(true)
  const [savingAdmin, setSavingAdmin] = useState(false)
  const [savingCourt, setSavingCourt] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // ── Hydrate the form once from /court-admin/me ────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await courtAdminApi.getMe()
        const data = (res as { data?: unknown }).data ?? res
        // The server returns `{ courtAdmin: { ...fields, court } }`. Accept
        // that shape first, then fall back to older `{ user }` / `{ admin }`
        // / flat shapes so this stays robust across deploys.
        const me =
          (data as { courtAdmin?: unknown }).courtAdmin ??
          (data as { user?: unknown }).user ??
          (data as { admin?: unknown }).admin ??
          data
        const court =
          (me as { court?: unknown })?.court ??
          (data as { court?: unknown }).court ??
          null
        if (cancelled) return
        const meRec = me as Record<string, unknown>
        setName((meRec?.name as string) ?? '')
        setEmail((meRec?.email as string) ?? '')
        setPhone((meRec?.phone as string) ?? '')
        setAvatarUrl((meRec?.avatarUrl as string) ?? null)
        setRegistrationNumber((meRec?.registrationNumber as string) ?? '')
        if (court) {
          const c = court as Record<string, unknown>
          setCourtName((c?.name as string) ?? '')
          setCourtType((c?.type as string) ?? '')
          setCourtAddress((c?.address as string) ?? '')
          setCourtPincode((c?.pincode as string) ?? '')
          setCourtState((c?.state as string) ?? '')
          setCourtDistrict((c?.district as string) ?? '')
          setCourtCity((c?.city as string) ?? '')
        }
      } catch (err) {
        if (!cancelled) setError(friendlyError(err, "We couldn't load your profile."))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ── Avatar upload via Cloudinary signed upload ───────────────────
  // Mirrors the lawyer profile's pattern so the UX is identical: pick a
  // file → spinner overlays the avatar → success swaps the preview.
  const handleAvatarUpload = async (file: File) => {
    if (!file) return
    setIsUploading(true)
    setError(null)
    try {
      const sigRes = await usersApi.getUploadSignature()
      const sigData = (sigRes.data || {}) as {
        timestamp?: number
        signature?: string
        cloudName?: string
        apiKey?: string
        folder?: string
      }
      const { timestamp, signature, cloudName, apiKey, folder } = sigData
      if (!cloudName || !signature) throw new Error('Failed to get upload signature')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('timestamp', String(timestamp))
      formData.append('signature', signature)
      formData.append('api_key', apiKey ?? '')
      formData.append('folder', folder || 'profiles')
      const upload = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData },
      )
      if (!upload.ok) throw new Error('Cloudinary upload failed')
      const uploaded = (await upload.json()) as { secure_url?: string }
      const url = uploaded.secure_url
      if (!url) throw new Error('No URL returned from Cloudinary')
      setAvatarUrl(url)
      // Persist immediately — the lawyer/client flows also save the new
      // avatar without waiting for the "Save" button, since users expect
      // the photo to stick the moment they upload it.
      await courtAdminApi.updateMe({ avatarUrl: url })
      showToast('Photo updated')
    } catch (err) {
      setError(friendlyError(err, "We couldn't upload that photo."))
    } finally {
      setIsUploading(false)
    }
  }

  const saveAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingAdmin(true)
    setError(null)
    try {
      await courtAdminApi.updateMe({
        name: name || undefined,
        phone: phone || undefined,
        avatarUrl: avatarUrl ?? undefined,
        registrationNumber: registrationNumber || undefined,
      })
      showToast('Profile updated')
    } catch (err) {
      setError(friendlyError(err, "We couldn't save your profile."))
    } finally {
      setSavingAdmin(false)
    }
  }

  const saveCourt = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingCourt(true)
    setError(null)
    try {
      await courtAdminApi.updateMyCourt({
        name: courtName || undefined,
        type: courtType || undefined,
        address: courtAddress || undefined,
        pincode: courtPincode || undefined,
        state: courtState || undefined,
        district: courtDistrict || undefined,
        city: courtCity || undefined,
      })
      showToast('Court details updated')
    } catch (err) {
      setError(friendlyError(err, "We couldn't save the court details."))
    } finally {
      setSavingCourt(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center">
        <Loader2 className="w-7 h-7 mx-auto text-indigo-600 animate-spin" />
        <p className="mt-3 text-sm text-gray-500">Loading your profile…</p>
      </div>
    )
  }

  const displayName = name || 'Your Name'
  const displayAvatar =
    avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=256&background=random`

  return (
    <div className="max-w-5xl mx-auto py-8 lg:py-12 px-4 sm:px-6 space-y-6">
      {/* Toasts / errors */}
      {toast && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
          {toast}
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Personal details card — hero layout matching client + lawyer pages. */}
      <form
        onSubmit={saveAdmin}
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-6 lg:p-10">
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Left: avatar + identity */}
            <div className="lg:col-span-1 flex flex-col items-center">
              <div className="relative inline-block">
                <img
                  src={displayAvatar}
                  alt={displayName}
                  className="w-40 h-40 lg:w-48 lg:h-48 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                />
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                  </div>
                )}
                <label className="absolute bottom-2 right-2 cursor-pointer">
                  <div className="bg-primary text-white p-2.5 rounded-full shadow-lg hover:bg-primary/90 transition">
                    <Upload className="w-4 h-4" />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && handleAvatarUpload(e.target.files[0])
                    }
                    disabled={isUploading}
                  />
                </label>
              </div>
              <div className="mt-5 text-center">
                <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{email}</p>
                <span className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 text-indigo-800">
                  <ShieldCheck className="w-3 h-3" /> Court Admin
                </span>
              </div>
              {/* Sign Out — moved into the left rail so it's visually
                  paired with the identity, matching how UserMenu surfaces
                  it on the client/lawyer pages. */}
              <button
                type="button"
                onClick={() => logout()}
                className="mt-6 inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>

            {/* Right: form */}
            <div className="lg:col-span-2">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Personal details</h3>
              <p className="text-sm text-gray-500 mb-6">
                The name and contact shown to lawyers and organizations submitting verification
                requests to your court.
              </p>

              <div className="space-y-5">
                <Field label="Full name" value={name} onChange={setName} required />
                <Field
                  label="Email"
                  value={email}
                  onChange={() => {
                    /* email is immutable — managed via password reset / support */
                  }}
                  disabled
                />
                <Field label="Phone" value={phone} onChange={setPhone} />
                <Field
                  label="Registration number"
                  value={registrationNumber}
                  onChange={setRegistrationNumber}
                  placeholder="Your court-admin registration / service id"
                />

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingAdmin}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
                  >
                    {savingAdmin ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Court details — second card, same chrome as the hero. */}
      <form
        onSubmit={saveCourt}
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-6 lg:p-10">
          <h3 className="text-xl font-bold text-gray-900 mb-1">Court details</h3>
          <p className="text-sm text-gray-500 mb-6">
            Lawyers and organizations submit verification requests to this court based on the
            address details here. Keeping these accurate helps requests reach you.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Court name" value={courtName} onChange={setCourtName} />
            <Field
              label="Court type"
              value={courtType}
              onChange={setCourtType}
              placeholder="District / High Court / Tribunal …"
            />
            <div className="sm:col-span-2">
              <Field label="Address" value={courtAddress} onChange={setCourtAddress} />
            </div>
          </div>

          <div className="mt-5">
            <AddressPicker
              value={{
                pincode: courtPincode,
                state: courtState,
                district: courtDistrict,
                city: courtCity,
              }}
              onChange={(next) => {
                setCourtPincode(next.pincode || '')
                setCourtState(next.state || '')
                setCourtDistrict(next.district || '')
                setCourtCity(next.city || '')
              }}
            />
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={savingCourt}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
            >
              {savingCourt ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save court details
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

const Field: FC<{
  label: string
  value: string
  onChange: (next: string) => void
  required?: boolean
  disabled?: boolean
  placeholder?: string
}> = ({ label, value, onChange, required, disabled, placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label}
      {required && <span className="text-red-500"> *</span>}
    </label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
    />
  </div>
)

export default CourtAdminProfilePage
