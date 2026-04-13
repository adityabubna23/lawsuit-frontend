import { FC, useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { mediationApi, usersApi } from '@/services/api'

const LawyerMediatorSettingsPage: FC = () => {
  const me = useQuery({
    queryKey: ['lawyer-me'],
    queryFn: async () => (await usersApi.getLawyerInformation()).data,
  })

  const [form, setForm] = useState({
    isMediator: false,
    mediatorBio: '',
    mediationFee: '' as string | number,
    mediationSpecializations: '' as string,
  })
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const d = me.data?.data || me.data?.lawyer || me.data
    if (d) {
      setForm({
        isMediator: !!d.isMediator,
        mediatorBio: d.mediatorBio || '',
        mediationFee: d.mediationFee ?? '',
        mediationSpecializations: Array.isArray(d.mediationSpecializations) ? d.mediationSpecializations.join(', ') : '',
      })
    }
  }, [me.data])

  const save = useMutation({
    mutationFn: () =>
      mediationApi.updateMediatorProfile({
        isMediator: form.isMediator,
        mediatorBio: form.mediatorBio || undefined,
        mediationFee: form.mediationFee === '' ? undefined : Number(form.mediationFee),
        mediationSpecializations: form.mediationSpecializations
          ? form.mediationSpecializations.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      }),
    onSuccess: () => {
      setSuccess(true)
      setError(null)
      setTimeout(() => setSuccess(false), 2000)
    },
    onError: (e: any) => setError(e?.response?.data?.error || 'Failed to save'),
  })

  const input = 'w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm'

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900">Mediator Profile</h1>
      <p className="text-sm text-gray-500 mt-1">
        Opt in to appear in the mediator directory. Parties will be able to select you to help resolve their disputes.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
        className="bg-white rounded-xl border border-gray-200 p-6 mt-6 space-y-4"
      >
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isMediator}
            onChange={(e) => setForm({ ...form, isMediator: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">Available as a mediator</p>
            <p className="text-xs text-gray-500">Parties in mediation will be able to select you.</p>
          </div>
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mediator bio</label>
          <textarea
            rows={4}
            className={input}
            value={form.mediatorBio}
            onChange={(e) => setForm({ ...form, mediatorBio: e.target.value })}
            placeholder="Describe your mediation experience, approach, and areas of expertise."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fee per session (₹)</label>
            <input
              type="number"
              min={0}
              className={input}
              value={form.mediationFee}
              onChange={(e) => setForm({ ...form, mediationFee: e.target.value })}
              placeholder="5000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specializations (comma separated)</label>
            <input
              className={input}
              value={form.mediationSpecializations}
              onChange={(e) => setForm({ ...form, mediationSpecializations: e.target.value })}
              placeholder="Commercial, Family, Employment"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">Saved.</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={save.isPending}
            className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-60"
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default LawyerMediatorSettingsPage
