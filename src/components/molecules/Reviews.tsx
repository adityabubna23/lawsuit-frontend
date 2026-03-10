import { FC, useEffect, useState } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { lawyersApi } from '@/services/api'

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

  useEffect(() => {
    if (!lawyerId) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const res = await lawyersApi.getProfile(lawyerId)
        const raw = (res as any).data?.data ?? (res as any).data ?? res

        if (!cancelled) {
          setReviews(raw.recentReviews || [])
          if (raw.stats) {
            setStats({
              averageRating: raw.stats.averageRating ?? raw.rating ?? 0,
              totalReviews: raw.stats.totalReviews ?? raw.totalReviews ?? 0,
            })
          }
        }
      } catch (err) {
        console.error('Failed to load reviews', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [lawyerId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-gray-500">Loading reviews…</span>
      </div>
    )
  }

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  )

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Reviews</h3>

      {/* Summary bar */}
      {stats && stats.totalReviews > 0 && (
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200">
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
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="flex gap-4">
              <img
                src={review.client.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.client.name)}&size=80&background=random`}
                alt={review.client.name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 text-sm">{review.client.name}</span>
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
