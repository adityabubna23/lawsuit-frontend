import { FC, useEffect, useState } from 'react'
import { casesApi } from '@/services/api'
import CaseListCard from '@/components/molecules/CaseListCard'
import { useNavigate } from 'react-router-dom'

interface CaseItem {
  id: string
  title: string
  lawyer?: { id: string; name?: string }
  createdAt?: string
  status?: string
  details?: string
}

const CasesListPage: FC = () => {
  const [cases, setCases] = useState<CaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await casesApi.getAll()
        const data = (res as any).data?.data ?? (res as any).data ?? res
        setCases(data || [])
      } catch (err) {
        console.warn('Failed to load cases', err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-4 text-primary">My Cases</h1>
      {loading ? (
        <div className="text-gray-600">Loading cases…</div>
      ) : cases.length === 0 ? (
        <div className="text-sm text-gray-500">No cases found</div>
      ) : (
        <div className="grid gap-4">
          {cases.map((c) => (
            <CaseListCard
              key={c.id}
              id={c.id}
              title={c.title}
              lawyerName={c.lawyer?.name}
              createdAt={c.createdAt}
              status={c.status}
              details={c.details}
              onClick={(id) => navigate(`/app/case/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default CasesListPage