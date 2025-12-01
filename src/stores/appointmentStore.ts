import { create } from 'zustand'
import type { Appointment } from '@/types'

interface AppointmentStore {
  appointments: Appointment[]
  loading: boolean
  error: string | null
  fetchAppointments: () => Promise<void>
  bookAppointment: (payload: { lawyerId: string; datetime: string; paymentId?: string }) => Promise<void>
  rescheduleAppointment: (id: string, datetime: string) => Promise<void>
  cancelAppointment: (id: string) => Promise<void>
}

export const useAppointmentStore = create<AppointmentStore>((set, get) => ({
  appointments: [],
  loading: false,
  error: null,

  fetchAppointments: async () => {
    set({ loading: true, error: null })
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/appointments')
      const data = await response.json()
      // normalize response shape: API may return { data: [...] } or the array directly
  const list = (data && (data.data ?? data)) || []
  set({ appointments: Array.isArray(list) ? (list as Appointment[]) : [], loading: false })
    } catch (error) {
      set({ error: 'Failed to fetch appointments', loading: false })
    }
  },

  bookAppointment: async (payload) => {
    set({ loading: true, error: null })
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      // API may return { data: appt } or the appt itself
      const appt = (data && (data.data ?? data)) as Appointment
      set((state) => ({
        appointments: [...state.appointments, appt],
        loading: false
      }))
    } catch (error) {
      set({ error: 'Failed to book appointment', loading: false })
    }
  },

  rescheduleAppointment: async (id, datetime) => {
    set({ loading: true, error: null })
    try {
      // TODO: Replace with actual API call
      await fetch(`/api/appointments/${id}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datetime })
      })
      
      const appointments = get().appointments.map(apt =>
        apt.id === id ? { ...apt, datetime } : apt
      )
  set({ appointments: appointments as Appointment[], loading: false })
    } catch (error) {
      set({ error: 'Failed to reschedule appointment', loading: false })
    }
  },

  cancelAppointment: async (id) => {
    set({ loading: true, error: null })
    try {
      // TODO: Replace with actual API call
      await fetch(`/api/appointments/${id}/cancel`, {
        method: 'PUT'
      })
      
      const appointments = get().appointments.map(apt =>
        apt.id === id ? { ...apt, status: 'cancelled' } : apt
      )
  set({ appointments: appointments as Appointment[], loading: false })
    } catch (error) {
      set({ error: 'Failed to cancel appointment', loading: false })
    }
  }
}))