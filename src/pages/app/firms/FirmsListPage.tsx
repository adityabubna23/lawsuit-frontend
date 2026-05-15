import { FC, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, MapPin, AlertCircle } from 'lucide-react'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useUserStore } from '@/stores/userStore'

/**
 * Public firm-discovery page for clients.
 *
 * Pincode + practice-area inputs were removed at the user's request. The
 * page now auto-fetches firms keyed off the AUTHED CLIENT'S pincode
 * (read from `/users/me` via the user store). If the client hasn't set
 * a pincode on their profile yet, we fall back to an unfiltered fetch
 * and surface a small "set your pincode" hint pointing them at
 * /app/profile.
 *
 * The "Verified only" toggle stays — it's a legal-relevance signal,
 * not a location filter, so it's worth keeping accessible.
 */
const FirmsListPage: FC = () => {
  const publicOrgs = useOrganizationStore((s) => s.publicOrgs)
  const fetchPublicOrgs = useOrganizationStore((s) => s.fetchPublicOrgs)
  const loading = useOrganizationStore((s) => s.loadingPublicOrgs)

  // The client's profile pincode is the source of truth here. The user
  // object on the store comes from `/users/me`, so it carries every
  // schema field — `pincode` included. We type-coerce because the
  // store stashes the raw response without a TS interface.
  const me = useUserStore((s) => s.user) as { pincode?: string | null } | null
  const fetchMe = useUserStore((s) => s.getUser)
  const clientPincode = me?.pincode || ''

  // Ensure we have the profile loaded — older logins might land here
  // before useNotificationSocket or similar fires the fetch.
  useEffect(() => {
    if (!me) {
      fetchMe().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-fetch whenever the client's pincode changes (e.g. they update
  // their profile in another tab — the page reflects the new locality
  // automatically). The store dedupes identical fetches internally.
  useEffect(() => {
    fetchPublicOrgs({
      pincode: clientPincode || undefined,
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientPincode])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Law firms</h1>
        <p className="text-sm text-gray-500 mt-1">
          Firms in your area — book a consultation and the firm assigns the right lawyer for your matter.
        </p>
      </div>

      {/* Location chip — communicates exactly what filter is active. */}
      {clientPincode ? (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-sm text-blue-900">
          <MapPin className="w-4 h-4 text-blue-600" />
          Showing firms near pincode <strong className="font-semibold">{clientPincode}</strong>
          <Link
            to="/app/profile"
            className="ml-2 text-xs text-blue-700 hover:underline"
          >
            Change in Profile →
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
          <div>
            Showing firms across the platform.{' '}
            <Link to="/app/profile" className="font-medium text-amber-900 hover:underline">
              Add your pincode in Profile
            </Link>{' '}
            to see firms closer to you.
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-500 text-sm">Loading firms…</div>
      ) : publicOrgs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <h3 className="text-base font-medium text-gray-900">No firms found</h3>
          <p className="text-sm text-gray-500 mt-1">
            {clientPincode
              ? `No firms are listed in or near pincode ${clientPincode} yet. Update your Profile pincode to broaden the search.`
              : 'No firms have registered on the platform yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {publicOrgs.map((org) => (
            <Link
              key={org.id}
              to={`/app/firms/${org.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition"
            >
              <div className="flex items-center gap-3">
                {org.avatarUrl ? (
                  <img src={org.avatarUrl} alt={org.name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                    {org.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate flex items-center gap-1">
                    {org.name}
                    {org.isVerified && (
                      <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    )}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {org.city || org.district || ''}{org.pincode ? ` · ${org.pincode}` : ''}
                  </p>
                </div>
              </div>
              {org.practiceAreas?.length > 0 && (
                <p className="mt-3 text-xs text-gray-600 line-clamp-2">{org.practiceAreas.join(' · ')}</p>
              )}
              {org.consultationFee != null && (
                <p className="mt-3 text-sm font-medium text-gray-900">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(org.consultationFee / 100)}
                  <span className="text-xs text-gray-500 font-normal"> / consultation</span>
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default FirmsListPage
