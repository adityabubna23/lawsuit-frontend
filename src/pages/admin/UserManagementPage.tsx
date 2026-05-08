import { FC, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronRight, Home, Users, UserCheck, Briefcase, Loader2, AlertCircle, Search } from 'lucide-react'
import { adminApi } from '@/services/api'
import KYCDetailsModal from '@/components/molecules/KYCDetailsModal'
import { unwrapList } from '@/utils/unwrap'

/**
 * The KYC list endpoints (`/admin/not-verified-client`,
 * `/admin/not-verified-lawyers`) return FLAT prisma rows, e.g.
 *   { id, name, email, phone, isVerified, ... }
 * but this page (and KYCDetailsModal) was written against a nested shape:
 *   { id, userId, user: { id, name, email, phone, ... } }
 * We normalise every row through this adapter so both shapes render
 * identically. Backend can also be updated to nest under `user` later
 * without breaking the frontend.
 */
function normalizeKycRow(row: any): KYCUser | null {
  if (!row || typeof row !== 'object') return null
  const hasNestedUser = row.user && typeof row.user === 'object' && row.user.name
  const u = hasNestedUser ? row.user : row
  if (!u?.name && !u?.email) return null
  return {
    ...row,
    id: row.id,
    userId: row.userId || u.id || row.id,
    user: {
      id: u.id || row.id,
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      avatarUrl: u.avatarUrl,
      isVerified: u.isVerified ?? row.isVerified ?? false,
      emailVerified: u.emailVerified ?? false,
      phoneVerified: u.phoneVerified ?? false,
      createdAt: u.createdAt || row.createdAt || '',
    },
  } as KYCUser
}

interface KYCUser {
  id: string
  userId: string
  user: {
    id: string
    name: string
    email: string
    phone: string
    avatarUrl?: string
    isVerified: boolean
    emailVerified: boolean
    phoneVerified: boolean
    createdAt: string
  }
  // Client-specific fields
  city?: string
  state?: string
  pincode?: string
  country?: string
  dob?: string
  gender?: string
  income?: number
  incomeProofUrl?: string
  caste?: string
  casteProofUrl?: string
  isVerified?: boolean
  // Lawyer-specific fields
  licenseNumber?: string
  licenseProofUrl?: string
  barCouncilId?: string
  barCouncilProofUrl?: string
  barCouncil?: string
  specializations?: string[]
  organisation?: string
  experienceYears?: number
  languages?: string[]
  feePerConsultation?: number
  bio?: string
  education?: any
  address?: string
}

type TabType = 'client' | 'lawyer'

const UserManagementPage: FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('client')
  const [selectedUser, setSelectedUser] = useState<KYCUser | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const queryClient = useQueryClient()

  // Fetch not verified clients
  const {
    data: clientsData,
    isLoading: isLoadingClients,
    error: clientsError,
  } = useQuery({
    queryKey: ['notVerifiedClients'],
    queryFn: async () => {
      const response = await adminApi.getNotVerifiedClients()
      const list = unwrapList(response.data, 'clients')
      return list.map(normalizeKycRow).filter((r): r is KYCUser => r !== null)
    },
  })

  // Fetch not verified lawyers
  const {
    data: lawyersData,
    isLoading: isLoadingLawyers,
    error: lawyersError,
  } = useQuery({
    queryKey: ['notVerifiedLawyers'],
    queryFn: async () => {
      const response = await adminApi.getNotVerifiedLawyers()
      const list = unwrapList(response.data, 'lawyers')
      return list.map(normalizeKycRow).filter((r): r is KYCUser => r !== null)
    },
  })

  // Verify client mutation
  const verifyClientMutation = useMutation({
    mutationFn: (id: string) => adminApi.verifyClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notVerifiedClients'] })
      setIsModalOpen(false)
      setSelectedUser(null)
    },
  })

  // Verify lawyer mutation
  const verifyLawyerMutation = useMutation({
    mutationFn: (id: string) => adminApi.verifyLawyer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notVerifiedLawyers'] })
      setIsModalOpen(false)
      setSelectedUser(null)
    },
  })

  const handleUserClick = (user: KYCUser) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  const handleVerify = (id: string) => {
    if (activeTab === 'client') {
      verifyClientMutation.mutate(id)
    } else {
      verifyLawyerMutation.mutate(id)
    }
  }

  const handleReject = (id: string) => {
    // TODO: Implement reject functionality when backend supports it
    console.log('Reject user:', id)
    setIsModalOpen(false)
    setSelectedUser(null)
  }

  const currentData = activeTab === 'client' ? clientsData : lawyersData
  const isLoading = activeTab === 'client' ? isLoadingClients : isLoadingLawyers
  const error = activeTab === 'client' ? clientsError : lawyersError
  const isVerifying =
    activeTab === 'client'
      ? verifyClientMutation.isPending
      : verifyLawyerMutation.isPending

  // Filter data based on search query — null-safe across each user field
  // because the backend may return entries with partial info (e.g. missing
  // phone for clients who registered with email only).
  const filteredData = currentData?.filter((user) => {
    if (!user?.user) return false
    const query = searchQuery.trim().toLowerCase()
    if (!query) return true
    const name = (user.user.name || '').toLowerCase()
    const email = (user.user.email || '').toLowerCase()
    const phone = user.user.phone || ''
    return name.includes(query) || email.includes(query) || phone.includes(query)
  })

  return (
    <div className="p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-800 font-medium">User Management</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
          <p className="text-gray-600 mt-1">
            Review and verify KYC submissions from clients and lawyers.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('client')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'client'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <UserCheck className="w-5 h-5" />
              Client KYC
              {clientsData && clientsData.length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                  {clientsData.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('lawyer')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'lawyer'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Briefcase className="w-5 h-5" />
              Lawyer KYC
              {lawyersData && lawyersData.length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                  {lawyersData.length}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="ml-3 text-gray-600">Loading...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12 text-red-600">
                <AlertCircle className="w-6 h-6 mr-2" />
                <span>Failed to load data. Please try again.</span>
              </div>
            ) : filteredData && filteredData.length > 0 ? (
              <div className="grid gap-4">
                {filteredData.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserClick(user)}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      {user.user.avatarUrl ? (
                        <img
                          src={user.user.avatarUrl}
                          alt={user.user.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <Users className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 truncate">
                        {user.user.name}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">{user.user.email}</p>
                    </div>
                    <div className="hidden sm:block text-right">
                      <p className="text-sm text-gray-600">{user.user.phone}</p>
                      <p className="text-xs text-gray-400">
                        {user.city || user.state
                          ? `${user.city || ''}${user.city && user.state ? ', ' : ''}${user.state || ''}`
                          : 'Location not provided'}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Users className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-lg font-medium">No pending verifications</p>
                <p className="text-sm">
                  {searchQuery
                    ? 'No users match your search criteria.'
                    : `All ${activeTab}s have been verified.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KYC Details Modal */}
      <KYCDetailsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedUser(null)
        }}
        user={selectedUser}
        type={activeTab}
        onVerify={handleVerify}
        onReject={handleReject}
        isVerifying={isVerifying}
      />
    </div>
  )
}

export default UserManagementPage
