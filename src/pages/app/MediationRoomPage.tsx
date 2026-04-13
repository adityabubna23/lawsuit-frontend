import { FC, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { mediationApi } from '@/services/api'
import DailyVideoPlayer from '@/components/organisms/DailyVideoPlayer'
import { useAuthStore } from '@/stores/authStore'

interface RoomData {
  roomUrl: string
  roomName: string
  token: string
  isMediator: boolean
}

const MediationRoomPage: FC = () => {
  const { id = '' } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const isLawyer = user?.role === 'LAWYER'
  const [room, setRoom] = useState<RoomData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    mediationApi
      .getRoom(id)
      .then((r) => {
        if (cancelled) return
        setRoom(r.data.data as RoomData)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e?.response?.data?.error || 'Unable to join session')
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id])

  const backPath = isLawyer ? `/lawyer/mediation/${id}` : `/app/mediation/${id}`

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 bg-gray-800 text-white">
        <div>
          <h1 className="font-semibold text-lg">Mediation Caucus Room</h1>
          <p className="text-xs text-gray-300">
            {room?.isMediator ? 'You are the mediator' : 'Confidential mediation session'}
          </p>
        </div>
        <Link
          to={backPath}
          className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-sm font-medium"
        >
          Leave Room
        </Link>
      </div>

      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mb-2" />
              <p className="text-sm">Joining session…</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="bg-white rounded-lg p-6 max-w-md text-center">
              <p className="text-red-600 font-medium">{error}</p>
              <button onClick={() => navigate(backPath)} className="mt-3 px-4 py-2 rounded-lg bg-primary text-white text-sm">
                Back
              </button>
            </div>
          </div>
        )}
        {room && (
          <DailyVideoPlayer
            roomUrl={room.roomUrl}
            token={room.token}
            className="w-full h-full"
            onLeft={() => navigate(backPath)}
            onError={(m) => setError(m)}
          />
        )}
      </div>
    </div>
  )
}

export default MediationRoomPage
