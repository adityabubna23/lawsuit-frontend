import { FC, useEffect, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { addressApi } from '@/services/api'

export interface AddressValue {
  state?: string
  district?: string
  city?: string
  pincode?: string
  country?: string
}

interface AddressPickerProps {
  value: AddressValue
  onChange: (next: AddressValue) => void
  /** Hide the country field if true (defaults to true — most users are India-only). */
  hideCountry?: boolean
  className?: string
}

const AddressPicker: FC<AddressPickerProps> = ({ value, onChange, hideCountry = true, className }) => {
  const [states, setStates] = useState<string[]>([])
  const [districts, setDistricts] = useState<string[]>([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [pincodeBusy, setPincodeBusy] = useState(false)

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

  // Pincode auto-fill
  const handlePincodeBlur = async () => {
    if (!value.pincode || value.pincode.length !== 6) return
    setPincodeBusy(true)
    try {
      const res = await addressApi.getPincode(value.pincode)
      const data = (res.data?.data ?? res.data) as any
      const office = data?.postOffices?.[0] ?? data?.[0] ?? data
      if (!office) return
      const next: AddressValue = { ...value }
      if (!next.state && office.state) next.state = office.state
      if (!next.district && office.district) next.district = office.district
      if (!next.city && (office.city || office.name)) next.city = office.city || office.name
      onChange(next)
    } catch {
      /* ignore */
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
            onBlur={handlePincodeBlur}
            maxLength={6}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {pincodeBusy && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
        </div>
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
        <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
        <input
          value={value.city || ''}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
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
    </div>
  )
}

export default AddressPicker
