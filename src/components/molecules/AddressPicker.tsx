import { FC, useEffect, useRef, useState } from 'react'
import { Loader2, MapPin, ChevronDown, Check } from 'lucide-react'
import { addressApi } from '@/services/api'
import AddressMap from '@/components/molecules/AddressMap'
import { reverseGeocode, geocodePincode } from '@/utils/geocode'

export interface AddressValue {
  state?: string
  district?: string
  city?: string
  pincode?: string
  country?: string
  /** Map coordinates of the chosen point (from pincode geocode or map click). */
  lat?: number
  lng?: number
  /** Optional free-text full address the user can type to refine the location. */
  addressLine?: string
}

interface AddressPickerProps {
  value: AddressValue
  onChange: (next: AddressValue) => void
  /** Hide the country field if true (defaults to true — most users are India-only). */
  hideCountry?: boolean
  /** Hide the interactive map (defaults to false — map is shown). */
  hideMap?: boolean
  className?: string
}

interface PostOffice {
  name: string
  branchType?: string
  deliveryStatus?: string
  district?: string
  division?: string
  region?: string
  state?: string
  country?: string
}

// Map India Post's capitalized PostOffice shape → our lowercase shape.
function fromIndiaPost(po: any): PostOffice {
  return {
    name: po.Name,
    branchType: po.BranchType,
    deliveryStatus: po.DeliveryStatus,
    district: po.District,
    division: po.Division,
    region: po.Region,
    state: po.State,
    country: po.Country,
  }
}

/**
 * Address form with India-pincode auto-fetch + an interactive OpenStreetMap
 * picker. Used by every address form in the app (client / lawyer / org /
 * court-admin / admin), so improvements here apply everywhere.
 *
 *  - Pincode (6 digits) → fetch localities (post offices). Tries the backend
 *    proxy first, then falls back to calling India Post directly from the
 *    browser, so the lookup is resilient even if the backend is unreachable.
 *  - The pincode also geocodes (free Nominatim) to CENTER the map on that area.
 *  - Clicking the map reverse-geocodes the point and fills
 *    state / district / pincode / locality; the user can then optionally type
 *    a full address.
 *  - State + district auto-fill only when blank; city offers a picker when a
 *    pincode maps to multiple post offices.
 */
const AddressPicker: FC<AddressPickerProps> = ({ value, onChange, hideCountry = true, hideMap = false, className }) => {
  const [states, setStates] = useState<string[]>([])
  const [districts, setDistricts] = useState<string[]>([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [pincodeBusy, setPincodeBusy] = useState(false)
  const [postOffices, setPostOffices] = useState<PostOffice[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const lastLookedUp = useRef<string | null>(null)
  // Pincodes we've already geocoded to a map centroid — avoids re-centering and
  // avoids fighting a point the user set by clicking the map.
  const geocodedPin = useRef<string | null>(null)
  // Always-current value so async callbacks (geocode / reverse-geocode) merge
  // into the latest state instead of a stale closure.
  const valueRef = useRef(value)
  useEffect(() => { valueRef.current = value }, [value])

  // Load states once
  useEffect(() => {
    let cancelled = false
    setLoadingStates(true)
    addressApi.getStates()
      .then((res) => {
        const data = (res.data?.states ?? res.data?.data ?? res.data ?? []) as any[]
        if (cancelled) return
        const list: string[] = data.map((s: any) => (typeof s === 'string' ? s : s.name || s.state || ''))
          .filter(Boolean)
        setStates(list)
      })
      .catch(() => { /* offline ok */ })
      .finally(() => !cancelled && setLoadingStates(false))
    return () => { cancelled = true }
  }, [])

  // When state changes → load districts
  useEffect(() => {
    if (!value.state) {
      setDistricts([])
      return
    }
    let cancelled = false
    setLoadingDistricts(true)
    addressApi.getDistricts(value.state)
      .then((res) => {
        const data = (res.data?.districts ?? res.data?.data ?? res.data ?? []) as any[]
        if (cancelled) return
        const list: string[] = data.map((d: any) => (typeof d === 'string' ? d : d.name || d.district || ''))
          .filter(Boolean)
        setDistricts(list)
      })
      .catch(() => setDistricts([]))
      .finally(() => !cancelled && setLoadingDistricts(false))
    return () => { cancelled = true }
  }, [value.state])

  // Fetch post offices for a pincode. Backend proxy first; if it errors or
  // returns nothing, fall back to India Post directly (their API is CORS-enabled).
  const fetchPostOffices = async (pin: string): Promise<PostOffice[]> => {
    try {
      const res = await addressApi.getPincode(pin)
      const data = (res.data?.data ?? res.data) as any
      const offices = data?.postOffices ?? data
      if (Array.isArray(offices) && offices.length) return offices as PostOffice[]
    } catch { /* fall through to direct lookup */ }
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
      const json = await res.json()
      const po = json?.[0]?.PostOffice
      if (Array.isArray(po) && po.length) return po.map(fromIndiaPost)
    } catch { /* ignore — leave fields for manual entry */ }
    return []
  }

  /**
   * Pull post-office matches for the current pincode. Runs on input (6 digits)
   * and on blur. Idempotent via `lastLookedUp`.
   */
  const lookupPincode = async () => {
    const pin = (value.pincode || '').trim()
    if (pin.length !== 6) return
    if (lastLookedUp.current === pin) return
    lastLookedUp.current = pin
    setPincodeBusy(true)
    try {
      const offices = await fetchPostOffices(pin)
      setPostOffices(offices)
      const first = offices[0]
      if (!first) return
      const next: AddressValue = { ...valueRef.current }
      if (!next.state && first.state) next.state = first.state
      if (!next.district && first.district) next.district = first.district
      if (offices.length === 1) {
        if (first.name) next.city = first.name
        setPickerOpen(false)
      } else {
        // Multiple matches → let the user choose (first is rarely right for metros).
        setPickerOpen(true)
      }
      onChange(next)
    } finally {
      setPincodeBusy(false)
    }
  }

  // Reset lookup state whenever the pincode is no longer a 6-digit value.
  useEffect(() => {
    const pin = value.pincode || ''
    if (pin.length !== 6) {
      lastLookedUp.current = null
      setPostOffices([])
      setPickerOpen(false)
    }
  }, [value.pincode])

  // Auto-trigger the locality lookup at the 6th digit.
  useEffect(() => {
    if ((value.pincode || '').length === 6 && lastLookedUp.current !== value.pincode) {
      lookupPincode()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.pincode])

  // Center the map on the pincode area. Skipped when the pincode came from a
  // map click (geocodedPin is primed in onMapPick) so the marker isn't yanked
  // off the clicked point.
  useEffect(() => {
    if (hideMap) return
    const pin = (value.pincode || '').trim()
    if (pin.length !== 6 || geocodedPin.current === pin) return
    geocodedPin.current = pin
    geocodePincode(pin).then((pt) => {
      if (pt) onChange({ ...valueRef.current, lat: pt.lat, lng: pt.lng })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.pincode, hideMap])

  const pickPostOffice = (po: PostOffice) => {
    onChange({
      ...value,
      city: po.name,
      state: po.state || value.state,
      district: po.district || value.district,
    })
    setPickerOpen(false)
  }

  // Map click → reverse-geocode → fill fields + set the point. Prime the dedupe
  // refs so the resulting pincode change doesn't re-fetch localities / re-center.
  const onMapPick = async (lat: number, lng: number) => {
    setPincodeBusy(true)
    try {
      const addr = await reverseGeocode(lat, lng)
      if (addr.pincode) {
        geocodedPin.current = addr.pincode
        lastLookedUp.current = addr.pincode
      }
      setPostOffices([])
      setPickerOpen(false)
      onChange({
        ...valueRef.current,
        lat,
        lng,
        state: addr.state || valueRef.current.state,
        district: addr.district || valueRef.current.district,
        city: addr.city || valueRef.current.city,
        pincode: addr.pincode || valueRef.current.pincode,
      })
    } finally {
      setPincodeBusy(false)
    }
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className || ''}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-gray-400" /> Pincode
        </label>
        <div className="relative">
          <input
            value={value.pincode || ''}
            onChange={(e) => onChange({ ...value, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            onBlur={lookupPincode}
            maxLength={6}
            inputMode="numeric"
            placeholder="6 digits"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {pincodeBusy && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
        </div>
        {postOffices.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            {postOffices.length === 1
              ? `Found ${postOffices[0].district}, ${postOffices[0].state}.`
              : `Found ${postOffices.length} localities under ${postOffices[0].district || ''}. Pick one below.`}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
        <select
          value={value.state || ''}
          onChange={(e) => onChange({ ...value, state: e.target.value, district: '' })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
        >
          <option value="">{loadingStates ? 'Loading…' : 'Select…'}</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">District</label>
        {districts.length > 0 ? (
          <select
            value={value.district || ''}
            onChange={(e) => onChange({ ...value, district: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          >
            <option value="">{loadingDistricts ? 'Loading…' : 'Select…'}</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        ) : (
          <input
            value={value.district || ''}
            onChange={(e) => onChange({ ...value, district: e.target.value })}
            disabled={loadingDistricts}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">City / Locality</label>
        {postOffices.length > 1 ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className={`w-full text-left px-3 py-2 border rounded-lg outline-none flex items-center justify-between gap-2 ${
                pickerOpen ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'
              } bg-white`}
            >
              <span className={value.city ? 'text-gray-900' : 'text-gray-400'}>
                {value.city || `Pick from ${postOffices.length} localities…`}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition ${pickerOpen ? 'rotate-180' : ''}`} />
            </button>
            {pickerOpen && (
              <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                {postOffices.map((po) => (
                  <button
                    key={`${po.name}-${po.district}`}
                    type="button"
                    onClick={() => pickPostOffice(po)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-start justify-between gap-2 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="text-gray-900 truncate">{po.name}</div>
                      <div className="text-[11px] text-gray-500 truncate">
                        {po.branchType || 'Post office'}{po.district ? ` · ${po.district}` : ''}{po.state ? `, ${po.state}` : ''}
                      </div>
                    </div>
                    {po.name === value.city && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-1 text-[11px] text-gray-500">
              Or{' '}
              <button
                type="button"
                onClick={() => {
                  setPostOffices([])
                  setPickerOpen(false)
                }}
                className="underline text-primary"
              >
                type a custom value
              </button>
              .
            </p>
          </div>
        ) : (
          <input
            value={value.city || ''}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            placeholder="Locality, area, or landmark"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        )}
      </div>

      {!hideCountry && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
          <input
            value={value.country || 'India'}
            onChange={(e) => onChange({ ...value, country: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      )}

      {/* Full address — optional free text the user can refine after picking. */}
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Full address <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={value.addressLine || ''}
          onChange={(e) => onChange({ ...value, addressLine: e.target.value })}
          rows={2}
          placeholder="House / flat no., street, landmark…"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
        />
      </div>

      {/* Interactive map — center follows the pincode; click to set / refine. */}
      {!hideMap && (
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400" /> Pick on map
            </span>
            <span className="text-[11px] text-gray-400">Tap the map to auto-fill the address</span>
          </div>
          <AddressMap lat={value.lat} lng={value.lng} onPick={onMapPick} />
        </div>
      )}
    </div>
  )
}

export default AddressPicker
