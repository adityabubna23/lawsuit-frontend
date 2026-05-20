import { FC, FormEvent, useEffect, useState } from 'react'
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { mediationApi } from '@/services/api'
import { friendlyError } from '@/utils/errors'

/**
 * Lawyer's mediator-profile management page.
 *
 * Mounted at `/lawyer/mediator-profile`. Lets a lawyer opt into the
 * mediator panel by setting their MA 2023 §10 registration number,
 * bio, fee, and specializations. The opt-in is gated server-side —
 * `isMediator=true` is refused without a non-empty registration
 * number, so the panel only ever lists accredited mediators.
 */

interface Profile {
  id: string
  isMediator: boolean
  mediatorBio: string | null
  mediationFee: number | null
  mediationSpecializations: string[]
  languages?: string[]
}

const MediatorProfilePage: FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  // Form state (mirrors profile)
  const [isMediator, setIsMediator] = useState(false)
  const [bio, setBio] = useState('')
  const [feeRupees, setFeeRupees] = useState<string>('')
  const [specsText, setSpecsText] = useState('')

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await mediationApi.getMyMediatorProfile()
      const p = (res.data as { data?: Profile }).data ?? null
      setProfile(p)
      if (p) {
        setIsMediator(p.isMediator)
        setBio(p.mediatorBio || '')
        setFeeRupees(p.mediationFee != null ? String(p.mediationFee) : '')
        setSpecsText(p.mediationSpecializations.join(', '))
      }
    } catch (err) {
      setError(friendlyError(err, "Couldn't load your mediator profile."))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const specs = specsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const fee = feeRupees.trim() ? Number.parseInt(feeRupees, 10) : undefined
      const res = await mediationApi.updateMediatorProfile({
        isMediator,
        mediatorBio: bio.trim() || undefined,
        mediationFee: fee && Number.isFinite(fee) ? fee : undefined,
        mediationSpecializations: specs,
      })
      const p = (res.data as { data?: Profile }).data ?? null
      setProfile(p)
      setSavedAt(new Date())
    } catch (err) {
      setError(friendlyError(err, "Couldn't save your profile."))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Mediator profile</h1>
        <p className="text-sm text-gray-600">
          Opt into the platform's mediator panel to be considered for mediation appointments
          under the Mediation Act 2023.
        </p>
      </header>

      <div className="rounded-xl bg-blue-50/60 border border-blue-100 px-4 py-3 mb-6 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900 leading-relaxed">
          Opt in to be discoverable as a mediator. Court-verified lawyers with this
          toggle on are shown on the mediator shortlist panel disputing parties pick from.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-xl border border-gray-200 p-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isMediator}
            onChange={(e) => setIsMediator(e.target.checked)}
            className="mt-1"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">List me on the mediator panel</p>
            <p className="text-xs text-gray-500">
              When enabled, other users browsing for a mediator can pick you. You'll get a
              notification when chosen, and 48 hours to accept.
            </p>
          </div>
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">Public bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="A short bio shown on the mediator panel — qualifications, experience, mediation style."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Fee per session (₹)
            </label>
            <input
              type="number"
              min={0}
              value={feeRupees}
              onChange={(e) => setFeeRupees(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Specialisations
            </label>
            <input
              type="text"
              value={specsText}
              onChange={(e) => setSpecsText(e.target.value)}
              placeholder="Family law, Commercial disputes, …"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs text-gray-500 mt-1">Comma-separated practice areas.</p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {savedAt && !error && (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            Saved {savedAt.toLocaleTimeString('en-IN')}. {profile?.isMediator ? "You're listed on the panel." : "You're not listed on the panel."}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save profile
          </button>
        </div>
      </form>
    </div>
  )
}

export default MediatorProfilePage
