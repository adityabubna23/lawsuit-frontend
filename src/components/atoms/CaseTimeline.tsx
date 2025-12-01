import { FC, useState } from 'react'

interface TimelineEvent {
  id: string
  title: string
  date: string
  description?: string
}

interface CaseTimelineProps {
  caseId: string
  initialEvents?: TimelineEvent[]
}

const CaseTimeline: FC<CaseTimelineProps> = ({ caseId: _caseId, initialEvents = [] }) => {
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents)
  const [text, setText] = useState('')

  const addEvent = () => {
    if (!text.trim()) return
    const e: TimelineEvent = { id: `evt_${Date.now()}`, title: text.trim(), date: new Date().toISOString() }
    setEvents((s) => [...s, e])
    setText('')
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-3">Timeline</h3>
      <div className="flex gap-3 overflow-x-auto py-2 px-1">
        {events.length === 0 ? (
          <div className="text-sm text-gray-500">No events yet</div>
        ) : (
          events.map(ev => (
            <div key={ev.id} className="min-w-[220px] bg-white border rounded-lg p-3 shadow-sm">
              <div className="text-sm text-gray-500">{new Date(ev.date).toLocaleString()}</div>
              <div className="font-medium mt-1">{ev.title}</div>
              {ev.description && <div className="text-sm text-gray-600 mt-1">{ev.description}</div>}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add timeline event (e.g. FIR filed)" className="flex-1 px-3 py-2 border rounded-md" />
        <button onClick={addEvent} className="px-4 py-2 bg-primary text-white rounded-md">Add</button>
      </div>
    </div>
  )
}

export default CaseTimeline
