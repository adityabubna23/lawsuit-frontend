import { FC, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { Scale, CheckCircle, Loader2, Edit3, Lock, Send } from 'lucide-react'

type ResolutionMethod = 'TRIAL' | 'MEDIATION' | 'ARBITRATION'

// Terminal case states — once a case reaches any of these, it's settled
// and nothing about it (including the resolution method) may change.
const CLOSED_STATUSES = ['CLOSED', 'WON', 'LOST', 'SETTLED']

interface ResolutionTabProps {
  caseId: string
  disputeResolutionMethod: ResolutionMethod | null
  /** Current case status — used to lock edits on closed/terminal cases. */
  caseStatus?: string | null
}

const resolutionOptions: { value: ResolutionMethod; label: string; description: string }[] = [
  {
    value: 'TRIAL',
    label: 'Trial',
    description: 'Formal court proceedings where a judge or jury decides the outcome based on evidence and arguments.',
  },
  {
    value: 'MEDIATION',
    label: 'Mediation',
    description: 'A neutral mediator helps both parties reach a voluntary agreement through guided negotiation.',
  },
  {
    value: 'ARBITRATION',
    label: 'Arbitration',
    description: 'A private arbitrator hears both sides and makes a binding decision outside of court.',
  },
]

const ResolutionTab: FC<ResolutionTabProps> = ({ caseId, disputeResolutionMethod, caseStatus }) => {
  const navigate = useNavigate()
  const isClosed = CLOSED_STATUSES.includes(String(caseStatus || '').toUpperCase())
  const [selectedMethod, setSelectedMethod] = useState<ResolutionMethod | null>(disputeResolutionMethod)
  // A closed case is never editable — even if no method was ever set,
  // don't drop into the selection form.
  const [isEditing, setIsEditing] = useState(!disputeResolutionMethod && !isClosed)
  const queryClient = useQueryClient()

  const updateResolutionMutation = useMutation({
    mutationFn: async (method: ResolutionMethod) => {
      const res = await api.put(`/cases/${caseId}/resolution-method`, { resolutionMethod: method })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caseDetailsClient', caseId] })
      setIsEditing(false)
    },
  })

  const handleSubmit = () => {
    if (selectedMethod) {
      updateResolutionMutation.mutate(selectedMethod)
    }
  }

  const currentMethod = resolutionOptions.find((opt) => opt.value === disputeResolutionMethod)

  // Closed / terminal case → fully read-only. No "Change Method", no
  // selection form — the case is settled and cannot be edited.
  if (isClosed) {
    return (
      <div className="p-6 h-full">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Scale className="w-6 h-6 text-primary" />
              Dispute Resolution Method
            </h3>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg">
              <Lock className="w-3.5 h-3.5" />
              Case closed — locked
            </span>
          </div>

          {currentMethod ? (
            <div className="bg-gradient-to-br from-primary to-midnight rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-white/70">Resolution Method</p>
                  <h4 className="text-2xl font-bold">{currentMethod.label}</h4>
                </div>
              </div>
              <p className="text-white/90 text-sm leading-relaxed mt-4">
                {currentMethod.description}
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-gray-600 text-sm">
              No resolution method was set for this case.
            </div>
          )}

          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h5 className="font-medium text-gray-900 mb-2">This case is closed</h5>
            <p className="text-sm text-gray-600 leading-relaxed">
              The case has been concluded, so its resolution method can no longer be
              changed. This record is read-only.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // If there's a method set and not editing, show the current method
  if (disputeResolutionMethod && !isEditing) {
    return (
      <div className="p-6 h-full">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Scale className="w-6 h-6 text-primary" />
              Dispute Resolution Method
            </h3>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Change Method
            </button>
          </div>

          {/* Current Method Display */}
          <div className="bg-gradient-to-br from-primary to-midnight rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-white/70">Current Resolution Method</p>
                <h4 className="text-2xl font-bold">{currentMethod?.label}</h4>
              </div>
            </div>
            <p className="text-white/90 text-sm leading-relaxed mt-4">
              {currentMethod?.description}
            </p>
          </div>

          {/* Lawyer-initiated mediation — canonical flow step 1. The
              lawyer sends the invitation from the Case; the server
              records initiator client = case client, initiator lawyer =
              this lawyer, and links Mediation.caseId on accept. */}
          {disputeResolutionMethod === 'MEDIATION' && (
            <div className="mt-6 bg-white rounded-xl border border-primary/30 p-5 shadow-sm">
              <h5 className="font-medium text-gray-900 mb-1">Start the mediation</h5>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Send a mediation invitation to the other party on your client's behalf.
                They'll get an email (and an in-app notification if they're on NyayaX) and,
                once they accept, the mediation flow begins.
              </p>
              <button
                onClick={() => navigate(`/lawyer/mediation/new?caseId=${caseId}`)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Send className="w-4 h-4" />
                Send mediation invitation
              </button>
            </div>
          )}

          {/* Info Card */}
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h5 className="font-medium text-gray-900 mb-2">What does this mean?</h5>
            <p className="text-sm text-gray-600 leading-relaxed">
              The resolution method determines how this case will be resolved. You can update this at any time
              if the approach changes during the case proceedings.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Selection mode
  return (
    <div className="p-6 h-full">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Scale className="w-6 h-6 text-primary" />
            {disputeResolutionMethod ? 'Update Resolution Method' : 'Choose Resolution Method'}
          </h3>
          <p className="text-gray-600 text-sm mt-1">
            Select how this case should be resolved. This can be updated later if needed.
          </p>
        </div>

        {/* Options Grid */}
        <div className="space-y-4 mb-6">
          {resolutionOptions.map((option) => {
            const isSelected = selectedMethod === option.value
            return (
              <button
                key={option.value}
                onClick={() => setSelectedMethod(option.value)}
                className={`
                  w-full text-left p-5 rounded-xl border-2 transition-all duration-200
                  ${isSelected 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                    ${isSelected ? 'border-primary bg-primary' : 'border-gray-300'}
                  `}>
                    {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <h4 className={`font-semibold text-lg ${isSelected ? 'text-primary' : 'text-gray-900'}`}>
                      {option.label}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {disputeResolutionMethod && (
            <button
              onClick={() => {
                setSelectedMethod(disputeResolutionMethod)
                setIsEditing(false)
              }}
              className="px-6 py-3 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!selectedMethod || updateResolutionMutation.isPending}
            className={`
              flex-1 px-6 py-3 font-medium rounded-lg transition-all duration-200
              flex items-center justify-center gap-2
              ${selectedMethod 
                ? 'bg-primary text-white hover:bg-midnight' 
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {updateResolutionMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                {disputeResolutionMethod ? 'Update Method' : 'Confirm Selection'}
              </>
            )}
          </button>
        </div>

        {/* Error State */}
        {updateResolutionMutation.isError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              Failed to update resolution method. Please try again.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResolutionTab
