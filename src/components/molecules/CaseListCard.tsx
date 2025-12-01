import { FC } from 'react'

export interface CaseListCardProps {
  id: string
  title: string
  lawyerName?: string
  createdAt?: string
  status?: string
  details?: string
  onClick?: (id: string) => void
}

const CaseListCard: FC<CaseListCardProps> = ({ id, title, lawyerName, createdAt, status, details, onClick }) => {
  return (
    <div onClick={() => onClick?.(id)} className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm text-gray-500">Case ID: <span className="font-medium text-midnight">{id}</span></div>
          <div className="font-semibold text-lg mt-1">{title}</div>
          {lawyerName && <div className="text-sm text-gray-600 mt-1">Advocate: {lawyerName}</div>}
        </div>
        <div className="text-right">
          {createdAt && <div className="text-sm text-gray-500">{new Date(createdAt).toLocaleDateString()}</div>}
          {status && <div className={`mt-2 inline-block px-2 py-1 text-xs font-semibold rounded ${status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{status}</div>}
        </div>
      </div>

      {details && <div className="mt-3 text-sm text-gray-700">{details}</div>}
    </div>
  )
}

export default CaseListCard
