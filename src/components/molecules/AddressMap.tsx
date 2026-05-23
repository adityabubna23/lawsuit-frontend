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

// Geographic centroid of India — the initial view before a point is known.
const INDIA_CENTER: [number, number] = [22.9734, 78.6569]

const ClickHandler: FC<{ onPick: (lat: number, lng: number) => void }> = ({ onPick }) => {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  })
  return null
}

// react-leaflet only reads `center`/`zoom` on first render, so we imperatively
// recenter whenever the chosen point changes (e.g. after a pincode geocode).
const Recenter: FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 14))
  }, [lat, lng, map])
  return null
}

interface AddressMapProps {
  lat?: number
  lng?: number
  onPick: (lat: number, lng: number) => void
  /** Pixel height of the map. */
  height?: number
}

const AddressMap: FC<AddressMapProps> = ({ lat, lng, onPick, height = 240 }) => {
  const hasPoint = typeof lat === 'number' && typeof lng === 'number'
  const center: [number, number] = hasPoint ? [lat as number, lng as number] : INDIA_CENTER

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height }}>
      <MapContainer
        center={center}
        zoom={hasPoint ? 14 : 4}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onPick} />
        {hasPoint && (
          <>
            <Marker position={[lat as number, lng as number]} icon={PIN_ICON} />
            <Recenter lat={lat as number} lng={lng as number} />
          </>
        )}
      </MapContainer>
    </div>
  )
}

export default AddressMap
