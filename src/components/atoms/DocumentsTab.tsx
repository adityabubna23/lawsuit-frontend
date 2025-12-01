import { FC, useState } from 'react'

interface Doc {
  id: string
  name: string
  url?: string
  uploadedAt: string
}

interface DocumentsTabProps {
  caseId: string
  initial?: Doc[]
}

const DocumentsTab: FC<DocumentsTabProps> = ({ caseId: _caseId, initial = [] }) => {
  const [docs, setDocs] = useState<Doc[]>(initial)

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const doc: Doc = { id: `doc_${Date.now()}`, name: file.name, url: URL.createObjectURL(file), uploadedAt: new Date().toISOString() }
    setDocs(s => [doc, ...s])
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">Documents</h3>
        <label className="inline-flex items-center px-3 py-2 bg-primary text-white rounded-md cursor-pointer">
          <input type="file" onChange={onUpload} className="hidden" />
          Upload
        </label>
      </div>

      {docs.length === 0 ? (
        <div className="text-sm text-gray-500">No documents uploaded yet.</div>
      ) : (
        <ul className="space-y-2">
          {docs.map(d => (
            <li key={d.id} className="flex justify-between items-center p-2 border rounded-md bg-white">
              <div>
                <div className="font-medium">{d.name}</div>
                <div className="text-xs text-gray-500">{new Date(d.uploadedAt).toLocaleString()}</div>
              </div>
              <a className="text-primary text-sm" href={d.url} target="_blank" rel="noreferrer">View / Download</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default DocumentsTab
