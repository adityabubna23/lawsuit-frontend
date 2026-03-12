import { FC } from 'react'
import {
  CheckCircle,
  XCircle,
  Scale,
  Lock,
  Calendar,
  DollarSign,
  FileText,
  MessageSquare,
} from 'lucide-react'

type ClosureStatus = 'CLOSED' | 'WON' | 'LOST' | 'SETTLED'

interface CaseClosureInfoProps {
  status: ClosureStatus
  closedAt: string | Date | null
  closureNotes: string | null
  settlementAmount: number | null
  settlementTerms: string | null
}

const statusConfig: Record<
  ClosureStatus,
  {
    label: string
    icon: typeof CheckCircle
    color: string
    bgColor: string
    borderColor: string
    gradientFrom: string
    gradientTo: string
  }
> = {
  WON: {
    label: 'Won',
    icon: CheckCircle,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    gradientFrom: 'from-green-500',
    gradientTo: 'to-emerald-600',
  },
  LOST: {
    label: 'Lost',
    icon: XCircle,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    gradientFrom: 'from-red-500',
    gradientTo: 'to-rose-600',
  },
  SETTLED: {
    label: 'Settled',
    icon: Scale,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-violet-600',
  },
  CLOSED: {
    label: 'Closed',
    icon: Lock,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    gradientFrom: 'from-gray-500',
    gradientTo: 'to-slate-600',
  },
}

const CaseClosureInfo: FC<CaseClosureInfoProps> = ({
  status,
  closedAt,
  closureNotes,
  settlementAmount,
  settlementTerms,
}) => {
  const config = statusConfig[status]
  if (!config) return null

  const Icon = config.icon

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="p-6 h-full">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Banner */}
        <div
          className={`bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo} rounded-xl p-6 text-white shadow-lg`}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm text-white/80 font-medium">Case Outcome</p>
              <h3 className="text-3xl font-bold">{config.label}</h3>
            </div>
          </div>
          {closedAt && (
            <div className="mt-4 flex items-center gap-2 text-white/90 text-sm">
              <Calendar className="w-4 h-4" />
              <span>Closed on {formatDate(closedAt)}</span>
            </div>
          )}
        </div>

        {/* Settlement Details (only for SETTLED cases) */}
        {status === 'SETTLED' && (settlementAmount || settlementTerms) && (
          <div className={`${config.bgColor} border ${config.borderColor} rounded-xl p-5`}>
            <h4 className={`font-semibold ${config.color} flex items-center gap-2 mb-4`}>
              <Scale className="w-5 h-5" />
              Settlement Details
            </h4>
            <div className="space-y-4">
              {settlementAmount != null && (
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Settlement Amount</p>
                    <p className="text-xl font-bold text-gray-900">
                      ₹{settlementAmount.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              )}
              {settlementTerms && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Settlement Terms</p>
                    <p className="text-sm text-gray-800 mt-1 leading-relaxed whitespace-pre-wrap">
                      {settlementTerms}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Closure Notes */}
        {closureNotes && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              Closure Notes
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {closureNotes}
            </p>
          </div>
        )}

        {/* Info notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-700">
            This case has been closed and is now read-only. All case documents, timeline events,
            and communication history remain accessible for reference.
          </p>
        </div>
      </div>
    </div>
  )
}

export default CaseClosureInfo
