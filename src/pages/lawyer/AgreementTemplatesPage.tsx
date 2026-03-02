import { FC, useEffect, useState, useMemo } from 'react'
import { useAgreementTemplateStore } from '@/stores/agreementTemplateStore'
import { AgreementTemplate } from '@/types'

/* ─── Category presets ─── */
const CATEGORIES = [
    'All',
    'Retainer',
    'NDA',
    'Service Agreement',
    'Employment',
    'Partnership',
    'Lease',
    'Other',
]

/* ─── Helpers ─── */
const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })

const categoryColor = (cat?: string) => {
    const map: Record<string, string> = {
        Retainer: 'bg-blue-100 text-blue-700',
        NDA: 'bg-purple-100 text-purple-700',
        'Service Agreement': 'bg-teal-100 text-teal-700',
        Employment: 'bg-amber-100 text-amber-700',
        Partnership: 'bg-indigo-100 text-indigo-700',
        Lease: 'bg-rose-100 text-rose-700',
        Other: 'bg-gray-100 text-gray-600',
    }
    return map[cat ?? ''] ?? 'bg-gray-100 text-gray-600'
}

/* ─── Modal ─── */
interface ModalProps {
    open: boolean
    template?: AgreementTemplate | null
    onClose: () => void
    onSave: (data: { title: string; description?: string; content: string; category?: string }) => Promise<void>
    saving: boolean
}

const TemplateModal: FC<ModalProps> = ({ open, template, onClose, onSave, saving }) => {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [content, setContent] = useState('')
    const [category, setCategory] = useState('')

    useEffect(() => {
        if (template) {
            setTitle(template.title)
            setDescription(template.description ?? '')
            setContent(template.content)
            setCategory(template.category ?? '')
        } else {
            setTitle('')
            setDescription('')
            setContent('')
            setCategory('')
        }
    }, [template, open])

    if (!open) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSave({
            title: title.trim(),
            description: description.trim() || undefined,
            content,
            category: category || undefined,
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {template ? 'Edit Template' : 'Create New Template'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                            placeholder="e.g. Standard Retainer Agreement"
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition bg-white"
                        >
                            <option value="">Select category…</option>
                            {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                            placeholder="Short summary of this template"
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Template Content <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            required
                            rows={10}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition font-mono resize-y"
                            placeholder="Write or paste your agreement template text here..."
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving || !title.trim() || !content.trim()}
                        onClick={handleSubmit}
                        className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-lg transition shadow-sm"
                    >
                        {saving ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                    />
                                </svg>
                                Saving…
                            </span>
                        ) : template ? (
                            'Update Template'
                        ) : (
                            'Create Template'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

/* ─── Delete Confirm Dialog ─── */
const DeleteDialog: FC<{
    open: boolean
    name: string
    deleting: boolean
    onCancel: () => void
    onConfirm: () => void
}> = ({ open, name, deleting, onCancel, onConfirm }) => {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in-95">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">Delete Template</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Are you sure you want to delete <strong>"{name}"</strong>? This action cannot be undone.
                        </p>
                    </div>
                </div>
                <div className="mt-5 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={deleting}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={deleting}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-lg transition"
                    >
                        {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    )
}

/* ─── Template Card ─── */
const TemplateCard: FC<{
    template: AgreementTemplate
    onEdit: () => void
    onDelete: () => void
}> = ({ template, onEdit, onDelete }) => (
    <div className="group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 flex flex-col">
        {/* Card Body */}
        <div className="p-5 flex-1">
            <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-gray-900 line-clamp-1">{template.title}</h3>
                {template.category && (
                    <span className={`flex-shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full ${categoryColor(template.category)}`}>
                        {template.category}
                    </span>
                )}
            </div>
            {template.description && (
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">{template.description}</p>
            )}
            <p className="mt-3 text-sm text-gray-400 line-clamp-3 font-mono leading-relaxed whitespace-pre-wrap">
                {template.content.slice(0, 200)}
                {template.content.length > 200 && '…'}
            </p>
        </div>

        {/* Card Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
                {template.updatedAt !== template.createdAt
                    ? `Updated ${fmtDate(template.updatedAt)}`
                    : `Created ${fmtDate(template.createdAt)}`}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={onEdit}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                    title="Edit"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button
                    onClick={onDelete}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                    title="Delete"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
)

/* ═════════════════════════════════════════════════════
   Main Page
   ═════════════════════════════════════════════════════ */
const AgreementTemplatesPage: FC = () => {
    const { templates, loading, error, fetchTemplates, createTemplate, updateTemplate, deleteTemplate } =
        useAgreementTemplateStore()

    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState('All')

    /* Modal state */
    const [modalOpen, setModalOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<AgreementTemplate | null>(null)
    const [saving, setSaving] = useState(false)

    /* Delete state */
    const [deleteTarget, setDeleteTarget] = useState<AgreementTemplate | null>(null)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        fetchTemplates().catch(() => { })
    }, [fetchTemplates])

    /* Filtered list */
    const filtered = useMemo(() => {
        let list = templates
        if (activeCategory !== 'All') {
            list = list.filter((t) => t.category === activeCategory)
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase()
            list = list.filter(
                (t) =>
                    t.title.toLowerCase().includes(q) ||
                    t.description?.toLowerCase().includes(q) ||
                    t.content.toLowerCase().includes(q)
            )
        }
        return list
    }, [templates, activeCategory, search])

    /* Handlers */
    const openCreate = () => {
        setEditTarget(null)
        setModalOpen(true)
    }

    const openEdit = (t: AgreementTemplate) => {
        setEditTarget(t)
        setModalOpen(true)
    }

    const handleSave = async (data: { title: string; description?: string; content: string; category?: string }) => {
        setSaving(true)
        try {
            if (editTarget) {
                await updateTemplate(editTarget.id, data)
            } else {
                await createTemplate(data)
            }
            setModalOpen(false)
            setEditTarget(null)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await deleteTemplate(deleteTarget.id)
            setDeleteTarget(null)
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* ─── Page Header ─── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Agreement Templates</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Create and manage reusable templates for client agreements
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Template
                </button>
            </div>

            {/* ─── Search & Filter Bar ─── */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search templates…"
                        className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                    />
                </div>

                {/* Category pills */}
                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${activeCategory === cat
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300 hover:text-blue-600'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── Error ─── */}
            {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            )}

            {/* ─── Loading ─── */}
            {loading && templates.length === 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                            <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                            <div className="h-3 bg-gray-100 rounded w-5/6 mb-4" />
                            <div className="h-20 bg-gray-50 rounded" />
                        </div>
                    ))}
                </div>
            )}

            {/* ─── Empty State ─── */}
            {!loading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">
                        {search || activeCategory !== 'All' ? 'No templates match your filters' : 'No templates yet'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 max-w-sm">
                        {search || activeCategory !== 'All'
                            ? 'Try adjusting your search or category filter.'
                            : 'Get started by creating your first agreement template.'}
                    </p>
                    {!search && activeCategory === 'All' && (
                        <button
                            onClick={openCreate}
                            className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create First Template
                        </button>
                    )}
                </div>
            )}

            {/* ─── Template Grid ─── */}
            {filtered.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((t) => (
                        <TemplateCard
                            key={t.id}
                            template={t}
                            onEdit={() => openEdit(t)}
                            onDelete={() => setDeleteTarget(t)}
                        />
                    ))}
                </div>
            )}

            {/* ─── Modals ─── */}
            <TemplateModal
                open={modalOpen}
                template={editTarget}
                onClose={() => {
                    setModalOpen(false)
                    setEditTarget(null)
                }}
                onSave={handleSave}
                saving={saving}
            />

            <DeleteDialog
                open={!!deleteTarget}
                name={deleteTarget?.title ?? ''}
                deleting={deleting}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            />
        </div>
    )
}

export default AgreementTemplatesPage
