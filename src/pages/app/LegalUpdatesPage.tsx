import { FC, useEffect, useMemo, useState } from 'react'
import { Newspaper, Search, Loader2 } from 'lucide-react'
import { legalUpdatesApi } from '@/services/api'
import { unwrapList } from '@/utils/unwrap'

interface LegalUpdate {
  id: string
  title: string
  content: string
  category: string
  publishedAt: string
}

const categoryColor = (cat: string) => {
  const c = cat.toLowerCase()
  if (c.includes('amend')) return 'bg-amber-50 text-amber-700'
  if (c.includes('scheme')) return 'bg-blue-50 text-blue-700'
  if (c.includes('new')) return 'bg-green-50 text-green-700'
  return 'bg-gray-100 text-gray-700'
}

const LegalUpdatesPage: FC = () => {
  const [updates, setUpdates] = useState<LegalUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await legalUpdatesApi.list({
        category: activeCategory ?? undefined,
        search: search.trim() || undefined,
      })
      setUpdates(unwrapList<LegalUpdate>(res.data, 'updates'))
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load updates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    load()
  }

  const categories = useMemo(() => {
    const set = new Set<string>()
    updates.forEach((u) => u.category && set.add(u.category))
    return Array.from(set)
  }, [updates])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Newspaper className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Legal Updates</h1>
          <p className="text-sm text-gray-500">Stay current on new laws, amendments, and government schemes.</p>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or content…"
            className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Category filter */}
      {(categories.length > 0 || activeCategory) && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${activeCategory === null
              ? 'bg-primary text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${activeCategory === cat
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Updates list */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      ) : updates.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center shadow-sm">
          <Newspaper className="w-12 h-12 mx-auto text-gray-300" />
          <p className="mt-3 text-gray-500">No updates found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((u) => {
            const isOpen = expanded === u.id
            return (
              <article key={u.id} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <h3 className="text-lg font-semibold text-gray-900">{u.title}</h3>
                  <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${categoryColor(u.category)}`}>
                    {u.category}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(u.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <p className={`text-sm text-gray-700 mt-3 whitespace-pre-line leading-relaxed ${isOpen ? '' : 'line-clamp-4'}`}>
                  {u.content}
                </p>
                {u.content.length > 280 && (
                  <button
                    onClick={() => setExpanded(isOpen ? null : u.id)}
                    className="mt-2 text-sm text-primary hover:underline"
                  >
                    {isOpen ? 'Show less' : 'Read more'}
                  </button>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default LegalUpdatesPage
