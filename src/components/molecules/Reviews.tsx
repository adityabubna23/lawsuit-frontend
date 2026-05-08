import { FC, useEffect, useState } from 'react'
import { Star, Loader2, Send } from 'lucide-react'
import { reviewsApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

interface ReviewEntry {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  client: {
    id: string
    name: string
    avatarUrl: string | null
  }
}

interface ReviewsProps {
  lawyerId: string
}

const Reviews: FC<ReviewsProps> = ({ lawyerId }) => {
  const [reviews, setReviews] = useState<ReviewEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{ averageRating: number; totalReviews: number } | null>(null)

  const user = useAuthStore((s) => s.user)
  const isClient = (user?.role || '').toUpperCase() === 'CLIENT'

  const [eligibility, setEligibility] = useState<{ canReview: boolean; reason?: string; appointmentId?: string; message?: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitOk, setSubmitOk] = useState(false)

  const loadReviews = async () => {
    setLoading(true)
    try {
      const res = await reviewsApi.list(lawyerId, { page: 1, limit: 20 })
      const raw = (res.data?.data ?? res.data) as any
      const items = (raw?.reviews ?? raw?.items ?? raw) as ReviewEntry[]
      setReviews(Array.isArray(items) ? items : [])
      if (raw?.stats) {
        setStats({
          averageRating: raw.stats.averageRating ?? 0,
          totalReviews: raw.stats.totalReviews ?? items?.length ?? 0,
        })
      } else if (Array.isArray(items) && items.length > 0) {
        const avg = items.reduce((s, r) => s + (r.rating || 0), 0) / items.length
        setStats({ averageRating: avg, totalReviews: items.length })
      } else {
        setStats(null)
      }
    } catch (err) {
      console.error('Failed to load reviews', err)
    } finally {
      setLoading(false)
    }
  }

  const loadEligibility = async () => {
    if (!isClient) return
    try {
      const res = await reviewsApi.getEligibility(lawyerId)
      const data = (res.data?.data ?? res.data) as { canReview: boolean; reason?: string; appointmentId?: string; message?: string }
      setEligibility(data)
    } catch {
      setEligibility({ canReview: false })
    }
  }

  useEffect(() => {
    if (!lawyerId) return
    loadReviews()
    loadEligibility()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lawyerId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating < 1 || rating > 5) {
      setFormError('Please select a rating')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      await reviewsApi.create(lawyerId, {
        rating,
        comment: comment.trim() || undefined,
        appointmentId: eligibility?.appointmentId,
      })
      setSubmitOk(true)
      setShowForm(false)
      setComment('')
      setRating(0)
      await Promise.all([loadReviews(), loadEligibility()])
      setTimeout(() => setSubmitOk(false), 2500)
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-gray-500">Loading reviews…</span>
      </div>
    )
  }

  const renderStars = (rating: number, size = 'w-4 h-4') => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold">Reviews</h3>
        {isClient && eligibility?.canReview && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Write a review
          </button>
        )}
      </div>

      {submitOk && (
        <div className="mt-3 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
          Thanks! Your review was submitted.
        </div>
      )}

      {/* Eligibility hint when client cannot review */}
      {isClient && eligibility && !eligibility.canReview && eligibility.message && (
        <div className="mt-3 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
          {eligibility.message}
        </div>
      )}

      {/* Inline review form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 border border-gray-200 rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(s)}
                  className="p-0.5"
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${(hover || rating) >= s ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Comment (optional)</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              placeholder="Share your experience…"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none text-sm"
            />
          </div>
          {formError && <div className="text-xs text-red-600">{formError}</div>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || rating < 1}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Submitting…' : 'Submit review'}
            </button>
          </div>
        </form>
      )}

      {/* Summary bar */}
      {stats && stats.totalReviews > 0 && (
        <div className="flex items-center gap-4 mt-6 mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-gray-900">{stats.averageRating.toFixed(1)}</span>
            {renderStars(Math.round(stats.averageRating))}
          </div>
          <span className="text-sm text-gray-500">
            Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No reviews yet.</p>
      ) : (
        <div className="space-y-6 mt-4">
          {reviews.map((review) => (
            <div key={review.id} className="flex gap-4">
              <img
                src={review.client?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.client?.name || 'User')}&size=80&background=random`}
                alt={review.client?.name || 'User'}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 text-sm">{review.client?.name || 'Anonymous'}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="mt-0.5">{renderStars(review.rating)}</div>
                {review.comment && (
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{review.comment}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Reviews
