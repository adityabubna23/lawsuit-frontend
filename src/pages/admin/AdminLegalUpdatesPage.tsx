import { FC, useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Loader2, X } from 'lucide-react'
import { adminApi, legalUpdatesApi } from '@/services/api'
import { unwrapList } from '@/utils/unwrap'

interface Update {
  id: string
  title: string
  content: string
  category: string
  publishedAt: string
}

const empty = { id: '', title: '', content: '', category: '', publishedAt: '' }

const AdminLegalUpdatesPage: FC = () => {
  const [list, setList] = useState<Update[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Update | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await legalUpdatesApi.list()
      // Server returns { success: true, updates: [...] }
      setList(unwrapList<Update>(res.data, 'updates'))
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to load', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleNew = () => {
    setEditing({ ...empty })
    setShowForm(true)
  }

  const handleEdit = (u: Update) => {
    setEditing({ ...u, publishedAt: u.publishedAt?.slice(0, 10) || '' })
    setShowForm(true)
  }

  const handleDelete = async (u: Update) => {
    if (!confirm(`Delete "${u.title}"? This cannot be undone.`)) return
    try {
      await adminApi.deleteLegalUpdate(u.id)
      showToast('Deleted', 'success')
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to delete', 'error')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      const payload = {
        title: editing.title.trim(),
        content: editing.content.trim(),
        category: editing.category.trim(),
        publishedAt: editing.publishedAt ? new Date(editing.publishedAt).toISOString() : undefined,
      }
      if (editing.id) {
        await adminApi.updateLegalUpdate(editing.id, payload)
      } else {
        await adminApi.createLegalUpdate(payload as any)
      }
      showToast(editing.id ? 'Updated' : 'Published', 'success')
      setShowForm(false)
      setEditing(null)
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Legal Updates</h1>
          <p className="text-sm text-gray-500">Publish legal news and amendments visible to all users.</p>
        </div>
        <button onClick={handleNew} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-gray-500">No updates published yet.</div>
      ) : (
        <div className="space-y-3">
          {list.map((u) => (
            <div key={u.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{u.title}</h3>
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{u.category}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(u.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2 whitespace-pre-line">{u.content}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handleEdit(u)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(u)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold">{editing.id ? 'Edit update' : 'Publish update'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <input
                  required
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                  <select
                    required
                    value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                  >
                    <option value="">Select…</option>
                    <option value="New Law">New Law</option>
                    <option value="Amendment">Amendment</option>
                    <option value="Scheme">Scheme</option>
                    <option value="Notice">Notice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Published date</label>
                  <input
                    type="date"
                    value={editing.publishedAt?.slice(0, 10) || ''}
                    onChange={(e) => setEditing({ ...editing, publishedAt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Content</label>
                <textarea
                  required
                  rows={8}
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Saving…' : editing.id ? 'Save' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed right-6 bottom-6 z-50">
          <div className={`px-5 py-3 rounded-xl shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminLegalUpdatesPage
