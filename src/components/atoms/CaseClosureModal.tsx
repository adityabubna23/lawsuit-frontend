import { FC, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api, { apiEndpoints } from '@/services/api'
import {
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Scale,
  Lock,
  Loader2,
  DollarSign,
  FileText,
  MessageSquare,
} from 'lucide-react'

type ClosureStatus = 'CLOSED' | 'WON' | 'LOST' | 'SETTLED'

interface CaseClosureModalProps {
  caseId: string
  caseTitle: string
  isOpen: boolean
  onClose: () => void
}

const closureOptions: {
  value: ClosureStatus
  label: string
  description: string
  icon: typeof CheckCircle
  color: string
  bgColor: string
}[] = [
  {
    value: 'WON',
    label: 'Won',
    description: 'The case was decided in favor of the client.',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200 hover:border-green-400',
  },
  {
    value: 'LOST',
    label: 'Lost',
    description: 'The case was decided against the client.',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200 hover:border-red-400',
  },
  {
    value: 'SETTLED',
    label: 'Settled',
    description: 'Both parties reached a settlement agreement.',
    icon: Scale,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200 hover:border-purple-400',
  },
  {
    value: 'CLOSED',
    label: 'Closed',
    description: 'Case closed without a definitive outcome (withdrawn, dismissed, etc.).',
    icon: Lock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 border-gray-200 hover:border-gray-400',
  },
]

const CaseClosureModal: FC<CaseClosureModalProps> = ({
  caseId,
  caseTitle,
  isOpen,
  onClose,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<ClosureStatus | null>(null)
  const [closureNotes, setClosureNotes] = useState('')
  const [settlementAmount, setSettlementAmount] = useState('')
  const [settlementTerms, setSettlementTerms] = useState('')
  const [step, setStep] = useState<'status' | 'details' | 'confirm'>(
    'status'
  )
  const queryClient = useQueryClient()

  const closeCaseMutation = useMutation({
    mutationFn: async () => {
      const payload: {
        status: ClosureStatus
        closureNotes?: string
        settlementAmount?: number
        settlementTerms?: string
      } = {
        status: selectedStatus!,
      }
      if (closureNotes.trim()) payload.closureNotes = closureNotes.trim()
      if (selectedStatus === 'SETTLED') {
        if (settlementAmount) payload.settlementAmount = Number(settlementAmount)
        if (settlementTerms.trim()) payload.settlementTerms = settlementTerms.trim()
      }
      const res = await api.post(apiEndpoints.case.closeCase(caseId), payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caseDetailsClient', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['allCases'] })
      handleClose()
    },
  })

  const handleClose = () => {
    setSelectedStatus(null)
    setClosureNotes('')
    setSettlementAmount('')
    setSettlementTerms('')
    setStep('status')
    onClose()
  }

  const handleNext = () => {
    if (step === 'status' && selectedStatus) {
      setStep('details')
    } else if (step === 'details') {
      setStep('confirm')
    }
  }

  const handleBack = () => {
    if (step === 'details') setStep('status')
    else if (step === 'confirm') setStep('details')
  }

  if (!isOpen) return null

  const selectedOption = closureOptions.find((o) => o.value === selectedStatus)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Close Case</h2>
              <p className="text-sm text-gray-500 truncate max-w-[280px]">
                {caseTitle}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            {['Outcome', 'Details', 'Confirm'].map((label, i) => {
              const stepIndex =
                step === 'status' ? 0 : step === 'details' ? 1 : 2
              const isActive = i === stepIndex
              const isCompleted = i < stepIndex
              return (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div
                    className={`
                      w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
                      ${isCompleted ? 'bg-primary text-white' : isActive ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}
                    `}
                  >
                    {isCompleted ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-gray-400'}`}
                  >
                    {label}
                  </span>
                  {i < 2 && (
                    <div
                      className={`flex-1 h-0.5 ${isCompleted ? 'bg-primary' : 'bg-gray-200'}`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Step 1: Select Outcome */}
          {step === 'status' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Select the final outcome of this case. This action cannot be undone.
              </p>
              {closureOptions.map((option) => {
                const Icon = option.icon
                const isSelected = selectedStatus === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => setSelectedStatus(option.value)}
                    className={`
                      w-full text-left p-4 rounded-xl border-2 transition-all duration-200
                      ${isSelected ? `${option.bgColor} ring-2 ring-offset-1 ring-current ${option.color}` : 'border-gray-200 bg-white hover:border-gray-300'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 ${isSelected ? option.color : 'text-gray-400'}`}
                      />
                      <div>
                        <h4
                          className={`font-semibold ${isSelected ? option.color : 'text-gray-900'}`}
                        >
                          {option.label}
                        </h4>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Step 2: Details */}
          {step === 'details' && (
            <div className="space-y-5">
              {/* Settlement fields (only for SETTLED) */}
              {selectedStatus === 'SETTLED' && (
                <>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="w-4 h-4" />
                      Settlement Amount
                    </label>
                    <input
                      type="number"
                      value={settlementAmount}
                      onChange={(e) => setSettlementAmount(e.target.value)}
                      placeholder="Enter settlement amount"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <FileText className="w-4 h-4" />
                      Settlement Terms
                    </label>
                    <textarea
                      value={settlementTerms}
                      onChange={(e) => setSettlementTerms(e.target.value)}
                      placeholder="Describe the agreed settlement terms..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                    />
                  </div>
                </>
              )}

              {/* Closure Notes (always shown) */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare className="w-4 h-4" />
                  Closure Notes
                </label>
                <textarea
                  value={closureNotes}
                  onChange={(e) => setClosureNotes(e.target.value)}
                  placeholder="Add notes about why this case is being closed..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Optional. These notes will be visible to both parties.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && selectedOption && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800">
                      This action cannot be undone
                    </h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Once a case is closed, it cannot be reopened. Please review the
                      details below carefully.
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Case</span>
                  <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                    {caseTitle}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Outcome</span>
                  <span
                    className={`text-sm font-semibold ${selectedOption.color}`}
                  >
                    {selectedOption.label}
                  </span>
                </div>
                {selectedStatus === 'SETTLED' && settlementAmount && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Settlement Amount
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      ₹{Number(settlementAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                {selectedStatus === 'SETTLED' && settlementTerms && (
                  <div>
                    <span className="text-sm text-gray-500">
                      Settlement Terms
                    </span>
                    <p className="text-sm text-gray-700 mt-1">
                      {settlementTerms}
                    </p>
                  </div>
                )}
                {closureNotes && (
                  <div>
                    <span className="text-sm text-gray-500">Closure Notes</span>
                    <p className="text-sm text-gray-700 mt-1">{closureNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          {step !== 'status' ? (
            <button
              onClick={handleBack}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}

          {step === 'confirm' ? (
            <button
              onClick={() => closeCaseMutation.mutate()}
              disabled={closeCaseMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {closeCaseMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Closing...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Close Case
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={step === 'status' && !selectedStatus}
              className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-midnight disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue
            </button>
          )}
        </div>

        {/* Error State */}
        {closeCaseMutation.isError && (
          <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              {(closeCaseMutation.error as any)?.response?.data?.error ||
                'Failed to close the case. Please try again.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CaseClosureModal
