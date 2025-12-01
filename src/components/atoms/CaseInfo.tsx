import { FC } from 'react'

interface CaseInfoProps {
  caseId: string
  description?: string
}

const CaseInfo: FC<CaseInfoProps> = ({ caseId, description }) => {
  const hasDescription = !!(description && description.toString().trim().length)

  return (
    <div className="p-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-2">Case Information</h3>
      <p className="text-sm text-gray-600 mb-4">Case ID: <span className="font-medium text-midnight">{caseId}</span></p>
      <div className="text-sm text-gray-700 flex-1">{hasDescription ? description : 'No description provided for this case yet.'}</div>
    </div>
  )
}

export default CaseInfo
