import { FC, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// A self-contained teardrop pin built with a divIcon so we don't depend on
// Leaflet's bundled marker PNGs (which break under Vite without extra config).
const PIN_ICON = L.divIcon({
  className: '',
  html:
    '<div style="width:20px;height:20px;border-radius:9999px 9999px 9999px 0;' +
    'transform:rotate(45deg);background:#6366f1;border:2px solid #ffffff;' +
    'box-shadow:0 1px 4px rgba(0,0,0,0.45)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 20],
})

// Geographic centroid of India — the initial view before anything is known.
const INDIA_CENTER: [number, number] = [22.9734, 78.6569]

export interface MapPoint {
  lat: number
  lng: number
}

export interface MapFocus extends MapPoint {
  zoom: number
}

const ClickHandler: FC<{ onPick: (lat: number, lng: number) => void }> = ({ onPick }) => {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  })
  return null
}

// react-leaflet only reads `center`/`zoom` on first render. A `focus` command
// (set when the user narrows state → district → pincode → locality) imperatively
// recenters + zooms. A map *click* does NOT set focus, so the view stays put
// and only the marker moves — that's what keeps the two-way sync from fighting.
const FocusController: FC<{ focus?: MapFocus | null }> = ({ focus }) => {
  const map = useMap()
  useEffect(() => {
    if (focus) map.setView([focus.lat, focus.lng], focus.zoom)
  }, [focus?.lat, focus?.lng, focus?.zoom, map])
  return null
}

interface AddressMapProps {
  /** Where the pin sits (the chosen point). */
  marker?: MapPoint | null
  /** A recenter/zoom command — changes drive map.setView. */
  focus?: MapFocus | null
  onPick: (lat: number, lng: number) => void
  /** Pixel height of the map. */
  height?: number
}

const AddressMap: FC<AddressMapProps> = ({ marker, focus, onPick, height = 240 }) => {
  const center: [number, number] = marker ? [marker.lat, marker.lng] : INDIA_CENTER

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height }}>
      <MapContainer
        center={center}
        zoom={marker ? 13 : 4}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onPick} />
        <FocusController focus={focus} />
        {marker && <Marker position={[marker.lat, marker.lng]} icon={PIN_ICON} />}
      </MapContainer>
    </div>
  )
}

export default AddressMap
