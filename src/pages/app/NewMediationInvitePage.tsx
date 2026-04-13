import { FC, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { mediationApi } from '@/services/api'

const NewMediationInvitePage: FC = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    respondentName: '',
    respondentEmail: '',
    respondentPhone: '',
    disputeTitle: '',
    disputeDescription: '',
  })
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => mediationApi.createInvite(form),
    onSuccess: () => navigate('/app/mediations'),
    onError: (err: any) => setError(err?.response?.data?.error || 'Failed to send invite'),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    mutation.mutate()
  }

  const input = 'w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Start a Mediation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Send an invitation to the other party. If they accept, both of you will select a mediator to help
          resolve the dispute out of court.
        </p>
      </div>

      <form onSubmit={submit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="bg-blue-50 border border-blue-100 text-blue-800 text-sm rounded-md p-3">
          <strong>How it works:</strong> We'll email the person below an invitation link. If they don't have a
          LawSoft account, they can sign up with the invited email and respond. A mediation record is created
          only after they accept.
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Other party's name</label>
          <input
            className={input}
            value={form.respondentName}
            onChange={(e) => setForm({ ...form, respondentName: e.target.value })}
            placeholder="Jane Doe"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              required
              className={input}
              value={form.respondentEmail}
              onChange={(e) => setForm({ ...form, respondentEmail: e.target.value })}
              placeholder="jane@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
            <input
              className={input}
              value={form.respondentPhone}
              onChange={(e) => setForm({ ...form, respondentPhone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dispute title <span className="text-red-500">*</span></label>
          <input
            required
            minLength={3}
            className={input}
            value={form.disputeTitle}
            onChange={(e) => setForm({ ...form, disputeTitle: e.target.value })}
            placeholder="Unpaid invoice for services rendered"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dispute description <span className="text-red-500">*</span></label>
          <textarea
            required
            minLength={10}
            rows={5}
            className={input}
            value={form.disputeDescription}
            onChange={(e) => setForm({ ...form, disputeDescription: e.target.value })}
            placeholder="Briefly describe the dispute, the facts, and the outcome you are seeking."
          />
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded p-2">{error}</div>}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-60"
          >
            {mutation.isPending ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default NewMediationInvitePage
