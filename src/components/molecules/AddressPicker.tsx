import { FC, useEffect, useRef, useState } from 'react'
import { Loader2, MapPin, ChevronDown, Check } from 'lucide-react'
import { addressApi } from '@/services/api'
import AddressMap, { MapFocus } from '@/components/molecules/AddressMap'
import { reverseGeocode, geocodePincode, geocodeText } from '@/utils/geocode'

export interface AddressValue {
  state?: string
  district?: string
  city?: string
  pincode?: string
  country?: string
  /** Map coordinates of the chosen point (from a field geocode or a map click). */
  lat?: number
  lng?: number
  /** Optional free-text full address the user can type for extra detail. */
  addressLine?: string
}

interface AddressPickerProps {
  value: AddressValue
  onChange: (next: AddressValue) => void
  /** Hide the (locked) country field. Defaults to false — India is shown. */
  hideCountry?: boolean
  /** Hide the interactive map. Defaults to false — the map is shown. */
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

/**
 * Address form with a top-down cascade + a two-way reactive OpenStreetMap.
 * Used by every address form in the app (client / lawyer / org / court-admin /
 * admin), so improvements here apply everywhere.
 *
 * Field order: Country (locked → India) → State → District (populates from the
 * chosen state) → Pincode → City/Locality → Full address (optional).
 *
 * Two-way map sync (loop-guarded via `pickSource`):
 *   - Fields → Map: choosing state / district / pincode / locality geocodes the
 *     most-specific value (free Nominatim) and recenters + progressively zooms.
 *   - Map → Fields: clicking the map reverse-geocodes the point and fills
 *     state / district / pincode / locality.
 *
 * Pincode is not gated behind state/district — typing it back-fills state +
 * district (and offers localities), so a user can start from the pincode OR the
 * map and the rest fills in.
 */
const AddressPicker: FC<AddressPickerProps> = ({ value, onChange, hideCountry = false, hideMap = false, className }) => {
  const [states, setStates] = useState<string[]>([])
  const [districts, setDistricts] = useState<string[]>([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [pincodeBusy, setPincodeBusy] = useState(false)
  const [postOffices, setPostOffices] = useState<PostOffice[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [focus, setFocus] = useState<MapFocus | null>(null)

  const lastLookedUp = useRef<string | null>(null)
  // 'user' = a field was edited / a value loaded (fields → map geocode runs).
  // 'map'  = a map click set the fields (skip the geocode so the view doesn't
  //          jump away from the clicked point). Reset to 'user' after each skip.
  const pickSource = useRef<'user' | 'map'>('user')
  // Guards against out-of-order async geocode responses.
  const geocodeSeq = useRef(0)
  // Always-current value so async callbacks merge into the latest state.
  const valueRef = useRef(value)
  useEffect(() => { valueRef.current = value }, [value])

  // Merge a field change and mark it user-driven (so the map reacts to it).
  const userUpdate = (patch: Partial<AddressValue>) => {
    pickSource.current = 'user'
    onChange({ ...valueRef.current, ...patch })
  }

  // Country is fixed to India — ensure it persists even if the form loaded blank.
  useEffect(() => {
    if (!valueRef.current.country) onChange({ ...valueRef.current, country: 'India' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // When state changes → load that state's districts (the District dropdown is
  // only meaningful once a state is chosen).
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
    // The backend proxies India Post server-side. The browser can't call that
    // API directly (it sends no CORS header), so the backend is the only path.
    try {
      const res = await addressApi.getPincode(pin)
      const data = (res.data?.data ?? res.data) as any
      const offices = data?.postOffices ?? data
      if (Array.isArray(offices) && offices.length) return offices as PostOffice[]
    } catch { /* leave fields for manual entry */ }
    return []
  }

  // Pincode → localities (+ back-fill state/district when blank). Runs on the
  // 6th digit and on blur. Idempotent via `lastLookedUp`.
  const lookupPincode = async () => {
    const pin = (valueRef.current.pincode || '').trim()
    if (pin.length !== 6) return
    if (lastLookedUp.current === pin) return
    lastLookedUp.current = pin
    setPincodeBusy(true)
    try {
      const offices = await fetchPostOffices(pin)
      setPostOffices(offices)
      const first = offices[0]
      if (!first) return
      pickSource.current = 'user'
      const next: AddressValue = { ...valueRef.current }
      if (first.state) next.state = first.state
      if (first.district) next.district = first.district
      if (offices.length === 1) {
        if (first.name) next.city = first.name
        setPickerOpen(false)
      } else {
        setPickerOpen(true)
      }
      onChange(next)
    } finally {
      setPincodeBusy(false)
    }
  }

  // Reset lookup state whenever the pincode is no longer 6 digits.
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

  // Fields → Map. Geocode the most-specific available value and recenter +
  // progressively zoom. Skipped right after a map click (pickSource === 'map').
  useEffect(() => {
    if (hideMap) return
    if (pickSource.current === 'map') { pickSource.current = 'user'; return }
    const { state, district, pincode, city } = value
    if (!state && !(pincode && pincode.length === 6)) return
    const seq = ++geocodeSeq.current
    const timer = setTimeout(async () => {
      let pt: { lat: number; lng: number } | null = null
      let zoom = 6
      if (state && city) {
        pt = await geocodeText([city, district, state, 'India'].filter(Boolean).join(', '))
        zoom = 14
      }
      if (!pt && pincode && pincode.length === 6) {
        pt = await geocodePincode(pincode)
        zoom = 12
      }
      if (!pt && state && district) {
        pt = await geocodeText(`${district}, ${state}, India`)
        zoom = 10
      }
      if (!pt && state) {
        pt = await geocodeText(`${state}, India`)
        zoom = 6
      }
      if (pt && seq === geocodeSeq.current) {
        setFocus({ lat: pt.lat, lng: pt.lng, zoom })
        onChange({ ...valueRef.current, lat: pt.lat, lng: pt.lng })
      }
    }, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.state, value.district, value.pincode, value.city, hideMap])

  const pickPostOffice = async (po: PostOffice) => {
    // Selecting a locality is a deliberate action — recenter the map on it
    // right away (no debounce). `pickSource = 'map'` stops the fields→map
    // effect from double-firing. Falls back to the pincode centroid when the
    // locality name doesn't resolve in Nominatim.
    pickSource.current = 'map'
    onChange({
      ...valueRef.current,
      city: po.name,
      state: po.state || valueRef.current.state,
      district: po.district || valueRef.current.district,
    })
    setPickerOpen(false)
    const query = [po.name, po.division || po.district, po.state, 'India'].filter(Boolean).join(', ')
    let pt = await geocodeText(query)
    if (!pt) {
      const pin = (valueRef.current.pincode || '').trim()
      if (pin.length === 6) pt = await geocodePincode(pin)
    }
    if (pt) {
      setFocus({ lat: pt.lat, lng: pt.lng, zoom: 15 })
      onChange({ ...valueRef.current, lat: pt.lat, lng: pt.lng })
    }
  }

  // Map click → drop the pin immediately, then reverse-geocode to fill the
  // fields. `pickSource = 'map'` stops the fields→map effect from recentering.
  const onMapPick = async (lat: number, lng: number) => {
    pickSource.current = 'map'
    onChange({ ...valueRef.current, lat, lng })
    setPincodeBusy(true)
    try {
      const addr = await reverseGeocode(lat, lng)
      if (addr.pincode) lastLookedUp.current = addr.pincode
      setPostOffices([])
      setPickerOpen(false)
      pickSource.current = 'map'
      onChange({
        ...valueRef.current,
        lat,
        lng,
        country: 'India',
        state: addr.state || valueRef.current.state,
        district: addr.district || valueRef.current.district,
        city: addr.city || valueRef.current.city,
        pincode: addr.pincode || valueRef.current.pincode,
      })
    } finally {
      setPincodeBusy(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
  const marker = typeof value.lat === 'number' && typeof value.lng === 'number'
    ? { lat: value.lat, lng: value.lng }
    : null

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className || ''}`}>
      {/* 1. Country — fixed to India. */}
      {!hideCountry && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
          <input
            value={value.country || 'India'}
            disabled
            className={`${inputCls} bg-gray-50 text-gray-600 cursor-not-allowed`}
          />
        </div>
      )}

      {/* 2. State */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
        <select
          value={value.state || ''}
          onChange={(e) => userUpdate({ state: e.target.value, district: '' })}
          className={`${inputCls} bg-white`}
        >
          <option value="">{loadingStates ? 'Loading…' : 'Select state…'}</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* 3. District — enabled once a state is chosen. */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">District</label>
        {!value.state ? (
          <select disabled className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}>
            <option>Select a state first</option>
          </select>
        ) : districts.length > 0 ? (
          <select
            value={value.district || ''}
            onChange={(e) => userUpdate({ district: e.target.value })}
            className={`${inputCls} bg-white`}
          >
            <option value="">{loadingDistricts ? 'Loading…' : 'Select district…'}</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        ) : (
          <input
            value={value.district || ''}
            onChange={(e) => userUpdate({ district: e.target.value })}
            disabled={loadingDistricts}
            placeholder={loadingDistricts ? 'Loading…' : 'District'}
            className={inputCls}
          />
        )}
      </div>

      {/* 4. Pincode */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-gray-400" /> Pincode
        </label>
        <div className="relative">
          <input
            value={value.pincode || ''}
            onChange={(e) => userUpdate({ pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            onBlur={lookupPincode}
            maxLength={6}
            inputMode="numeric"
            placeholder="6 digits"
            className={inputCls}
          />
          {pincodeBusy && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
        </div>
        {postOffices.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            {postOffices.length === 1
              ? `Found ${postOffices[0].district}, ${postOffices[0].state}.`
              : `Found ${postOffices.length} localities. Pick one below.`}
          </p>
        )}
      </div>

      {/* 5. City / Locality */}
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
              <div className="absolute z-[1000] mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
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
          </div>
        ) : (
          <input
            value={value.city || ''}
            onChange={(e) => userUpdate({ city: e.target.value })}
            placeholder="Locality, area, or landmark"
            className={inputCls}
          />
        )}
      </div>

      {/* 6. Full address — optional free text the user can add for more detail. */}
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Full address <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={value.addressLine || ''}
          onChange={(e) => userUpdate({ addressLine: e.target.value })}
          rows={2}
          placeholder="House / flat no., street, landmark…"
          className={`${inputCls} resize-y`}
        />
      </div>

      {/* Interactive map — reacts to the fields above; click to set / refine. */}
      {!hideMap && (
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400" /> Pick on map
            </span>
            <span className="text-[11px] text-gray-400">Tap the map to auto-fill the address</span>
          </div>
          <AddressMap marker={marker} focus={focus} onPick={onMapPick} />
        </div>
      )}
    </div>
  )
}

export default AddressPicker
