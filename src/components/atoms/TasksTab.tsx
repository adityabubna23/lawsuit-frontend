import { FC, useState } from 'react'

interface Task {
  id: string
  title: string
  completed: boolean
}

interface TasksTabProps {
  caseId: string
  initial?: Task[]
}

const TasksTab: FC<TasksTabProps> = ({ caseId: _caseId, initial = [] }) => {
  const [tasks, setTasks] = useState<Task[]>(initial)
  const [text, setText] = useState('')

  const add = () => {
    if (!text.trim()) return
    const t: Task = { id: `task_${Date.now()}`, title: text.trim(), completed: false }
    setTasks(s => [t, ...s])
    setText('')
  }

  const toggle = (id: string) => setTasks(s => s.map(t => t.id === id ? { ...t, completed: !t.completed } : t))

  return (
    <div className="p-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-3">Tasks</h3>

      <div className="flex-1 overflow-y-auto mb-3">
        {tasks.length === 0 ? (
          <div className="text-sm text-gray-500">No tasks yet</div>
        ) : (
          <ul className="space-y-2">
            {tasks.map(t => (
              <li key={t.id} className="flex items-center justify-between p-2 border rounded-md bg-white">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={t.completed} onChange={() => toggle(t.id)} />
                  <div className={`text-sm ${t.completed ? 'line-through text-gray-400' : ''}`}>{t.title}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 px-3 py-2 border rounded-md" placeholder="Create a task for advocate" />
        <button onClick={add} className="px-4 py-2 bg-primary text-white rounded-md">Add</button>
      </div>
    </div>
  )
}

export default TasksTab
