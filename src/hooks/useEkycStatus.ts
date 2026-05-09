import { useQuery } from '@tanstack/react-query'
import { ekycApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

export interface EkycSubmission {
  id: string
  status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED' | string
  provider: string | null
  failureReason: string | null
  expiresAt: string | null
  completedAt: string | null
  createdAt: string
}

export interface EkycStatusData {
  client: {
    ekycVerified: boolean
    ekycVerifiedAt: string | null
    aadhaarLast4: string | null
    aadhaarName: string | null
  } | null
  latestSubmission: EkycSubmission | null
}

/**
 * Single source of truth for the logged-in user's eKYC state.
 *
 * Cached in React Query so multiple gates / cards / banners can subscribe
 * without hammering the server. Returns `isVerified=true` for non-CLIENT
 * roles so guards don't accidentally block lawyers/admins.
 */
export function useEkycStatus() {
  const role = (useAuthStore((s) => s.user)?.role || '').toString().toUpperCase()
  const isClient = role === 'CLIENT'

  const query = useQuery({
    queryKey: ['ekycStatus'],
    enabled: isClient,
    queryFn: async (): Promise<EkycStatusData> => {
      const res = await ekycApi.getStatus()
      return (res.data?.data ?? res.data) as EkycStatusData
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })

  const data = query.data
  const isVerified = isClient ? !!data?.client?.ekycVerified : true
  const pending = isClient
    && !!data?.latestSubmission
    && data.latestSubmission.status === 'PENDING'
    && !!data.latestSubmission.expiresAt
    && new Date(data.latestSubmission.expiresAt).getTime() > Date.now()

  return {
    isClient,
    isVerified,
    pending,
    pendingSubmission: pending ? data?.latestSubmission ?? null : null,
    data: data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as unknown,
    refetch: query.refetch,
  }
}

export default useEkycStatus
