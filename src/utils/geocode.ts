// Free OpenStreetMap (Nominatim) geocoding helpers — no API key required.
//
// Nominatim usage policy: ≤ 1 request/second and identify the app via a valid
// HTTP Referer (browsers send this automatically). We only call these in
// response to user actions (typing a pincode / picking state-district /
// clicking the map), so volume stays well within limits.

export interface GeocodedAddress {
  state?: string
  district?: string
  city?: string
  pincode?: string
}

export interface LatLng {
  lat: number
  lng: number
}

const NOMINATIM = 'https://nominatim.openstreetmap.org'

/**
 * Reverse-geocode a clicked map point into Indian address components.
 * Returns best-effort fields; any of them may be undefined for sparse areas.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedAddress> {
  try {
    const url = `${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18&accept-language=en`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return {}
    const data = await res.json()
    const a = (data?.address ?? {}) as Record<string, string>
    return {
      state: a.state,
      district: a.state_district || a.district || a.county,
      // Localities go by many OSM tags depending on urban/rural — try them in
      // rough "most specific first" order.
      city:
        a.suburb || a.neighbourhood || a.quarter || a.village || a.town ||
        a.city_district || a.city || a.municipality || a.hamlet,
      pincode: a.postcode ? String(a.postcode).replace(/\D/g, '').slice(0, 6) : undefined,
    }
  } catch {
    return {}
  }
}

/**
 * Geocode an Indian 6-digit pincode to a lat/lng centroid so the map can
 * center on that area. Returns null if Nominatim has no match.
 */
export async function geocodePincode(pincode: string): Promise<LatLng | null> {
  try {
    const url = `${NOMINATIM}/search?format=jsonv2&country=India&postalcode=${encodeURIComponent(pincode)}&limit=1`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = await res.json()
    const hit = Array.isArray(data) ? data[0] : null
    if (!hit?.lat || !hit?.lon) return null
    return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) }
  } catch {
    return null
  }
}

/**
 * Free-text forward geocode within India (e.g. "Ganjam, Odisha, India" or
 * "Berhampur, Ganjam, Odisha, India"). Used to recenter the map as the user
 * narrows down state → district → locality.
 */
export async function geocodeText(query: string): Promise<LatLng | null> {
  try {
    const url = `${NOMINATIM}/search?format=jsonv2&country=India&q=${encodeURIComponent(query)}&limit=1`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = await res.json()
    const hit = Array.isArray(data) ? data[0] : null
    if (!hit?.lat || !hit?.lon) return null
    return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) }
  } catch {
    return null
  }
}
