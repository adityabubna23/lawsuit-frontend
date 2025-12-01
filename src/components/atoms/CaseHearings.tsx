import { FC } from 'react'

interface Hearing {
  id: string
  title: string
  date: string
  notes?: string
}

interface CaseHearingsProps {
  caseId: string
  hearings?: Hearing[]
}

const CaseHearings: FC<CaseHearingsProps> = ({ caseId: _caseId, hearings = [] }) => {
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-3">Hearings</h3>
      {hearings.length === 0 ? (
        <div className="text-sm text-gray-500">No hearings scheduled</div>
      ) : (
        <ul className="space-y-3">
          {hearings.map(h => (
            <li key={h.id} className="p-3 border rounded-md bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{h.title}</div>
                  <div className="text-sm text-gray-500">{new Date(h.date).toLocaleString()}</div>
                </div>
              </div>
              {h.notes && <div className="mt-2 text-sm text-gray-700">{h.notes}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default CaseHearings
