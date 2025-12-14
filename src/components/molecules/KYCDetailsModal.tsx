import { FC, useState } from 'react'
import { X, CheckCircle, XCircle, User, Mail, Phone, MapPin, Calendar, Briefcase, FileText, Building, Eye } from 'lucide-react'

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

interface KYCDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  user: KYCUser | null
  type: 'client' | 'lawyer'
  onVerify: (id: string) => void
  onReject: (id: string) => void
  isVerifying?: boolean
}

const KYCDetailsModal: FC<KYCDetailsModalProps> = ({
  isOpen,
  onClose,
  user,
  type,
  onVerify,
  onReject,
  isVerifying = false,
}) => {
  const [previewDocument, setPreviewDocument] = useState<{ url: string; name: string } | null>(null)

  if (!isOpen || !user) return null

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              {user.user.avatarUrl ? (
                <img
                  src={user.user.avatarUrl}
                  alt={user.user.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{user.user.name}</h2>
              <p className="text-sm text-gray-500 capitalize">{type} KYC Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Basic Info */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-800">{user.user.email}</p>
                </div>
                {user.user.emailVerified && (
                  <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                )}
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-gray-800">{user.user.phone}</p>
                </div>
                {user.user.phoneVerified && (
                  <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                )}
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Registered On</p>
                  <p className="text-sm font-medium text-gray-800">
                    {formatDate(user.user.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Client-specific fields */}
          {type === 'client' && (
            <>
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Personal Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.dob && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Date of Birth</p>
                        <p className="text-sm font-medium text-gray-800">{formatDate(user.dob)}</p>
                      </div>
                    </div>
                  )}
                  {user.gender && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Gender</p>
                        <p className="text-sm font-medium text-gray-800 capitalize">
                          {user.gender.toLowerCase().replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                  )}
                  {user.caste && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Caste Category</p>
                        <p className="text-sm font-medium text-gray-800">{user.caste}</p>
                      </div>
                    </div>
                  )}
                  {user.income !== undefined && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Briefcase className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Annual Income</p>
                        <p className="text-sm font-medium text-gray-800">
                          {formatCurrency(user.income)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Address
                </h3>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {[user.city, user.state, user.pincode, user.country]
                        .filter(Boolean)
                        .join(', ') || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.incomeProofUrl && (
                    <button
                      onClick={() => setPreviewDocument({ url: user.incomeProofUrl!, name: 'Income Proof' })}
                      className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
                    >
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700 flex-1">Income Proof</span>
                      <Eye className="w-4 h-4 text-blue-500" />
                    </button>
                  )}
                  {user.casteProofUrl && (
                    <button
                      onClick={() => setPreviewDocument({ url: user.casteProofUrl!, name: 'Caste Certificate' })}
                      className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
                    >
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700 flex-1">Caste Certificate</span>
                      <Eye className="w-4 h-4 text-blue-500" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Lawyer-specific fields */}
          {type === 'lawyer' && (
            <>
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Professional Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.licenseNumber && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">License Number</p>
                        <p className="text-sm font-medium text-gray-800">{user.licenseNumber}</p>
                      </div>
                    </div>
                  )}
                  {user.barCouncilId && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Bar Council ID</p>
                        <p className="text-sm font-medium text-gray-800">{user.barCouncilId}</p>
                      </div>
                    </div>
                  )}
                  {user.barCouncil && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Building className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Bar Council</p>
                        <p className="text-sm font-medium text-gray-800">{user.barCouncil}</p>
                      </div>
                    </div>
                  )}
                  {user.organisation && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Building className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Organisation</p>
                        <p className="text-sm font-medium text-gray-800">{user.organisation}</p>
                      </div>
                    </div>
                  )}
                  {user.experienceYears !== undefined && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Briefcase className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Experience</p>
                        <p className="text-sm font-medium text-gray-800">
                          {user.experienceYears} years
                        </p>
                      </div>
                    </div>
                  )}
                  {user.feePerConsultation !== undefined && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Briefcase className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Consultation Fee</p>
                        <p className="text-sm font-medium text-gray-800">
                          {formatCurrency(user.feePerConsultation / 100)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {user.specializations && user.specializations.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Specializations
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {user.specializations.map((spec, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {user.languages && user.languages.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Languages
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {user.languages.map((lang, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Address
                </h3>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {[user.address, user.city, user.state, user.pincode]
                        .filter(Boolean)
                        .join(', ') || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {user.bio && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Bio
                  </h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{user.bio}</p>
                </div>
              )}

              {/* Documents */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.licenseProofUrl && (
                    <button
                      onClick={() => setPreviewDocument({ url: user.licenseProofUrl!, name: 'License Proof' })}
                      className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
                    >
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700 flex-1">License Proof</span>
                      <Eye className="w-4 h-4 text-blue-500" />
                    </button>
                  )}
                  {user.barCouncilProofUrl && (
                    <button
                      onClick={() => setPreviewDocument({ url: user.barCouncilProofUrl!, name: 'Bar Council Certificate' })}
                      className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
                    >
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700 flex-1">Bar Council Certificate</span>
                      <Eye className="w-4 h-4 text-blue-500" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer with actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => onReject(user.id)}
            disabled={isVerifying}
            className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
          <button
            onClick={() => onVerify(user.id)}
            disabled={isVerifying}
            className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4" />
            {isVerifying ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </div>

      {/* Document Preview Overlay */}
      {previewDocument && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col">
          {/* Preview Header */}
          <div className="flex items-center justify-between p-4 bg-gray-900">
            <h3 className="text-white font-medium">{previewDocument.name}</h3>
            <div className="flex items-center gap-2">
              <a
                href={previewDocument.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Open in New Tab
              </a>
              <button
                onClick={() => setPreviewDocument(null)}
                className="p-2 text-white hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          {/* Preview Content */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            {previewDocument.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? (
              <img
                src={previewDocument.url}
                alt={previewDocument.name}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : previewDocument.url ? (
              <iframe
                src={previewDocument.url}
                title={previewDocument.name}
                className="w-full h-full rounded-lg bg-white"
              />
            ) : (
              <div className="text-center text-white">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Preview not available for this file type</p>
                <a
                  href={previewDocument.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Open Document
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default KYCDetailsModal
