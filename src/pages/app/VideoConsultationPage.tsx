import { FC, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { videoApi } from '@/services/api'
import DailyIframe, { DailyCall } from '@daily-co/daily-js'
import { Loader2 } from 'lucide-react'

// Define the response shape from our backend
interface MeetingResponse {
    meetingLink: string
    token: string
}

const VideoConsultationPage: FC = () => {
    const { appointmentId } = useParams<{ appointmentId: string }>()
    const navigate = useNavigate()
    const videoContainerRef = useRef<HTMLDivElement>(null)
    const callRef = useRef<DailyCall | null>(null)
    const joinedRef = useRef(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!appointmentId || joinedRef.current) return

        let cancelled = false

        const joinMeeting = async () => {
            try {
                setLoading(true)

                // 1. Fetch meeting link and token from our backend
                const res = await videoApi.getMeeting(appointmentId)
                const { meetingLink, token } = res.data as MeetingResponse

                if (cancelled) return

                if (!meetingLink || !videoContainerRef.current) {
                    throw new Error('Failed to retrieve meeting details')
                }

                // 2. Destroy any existing frame first (safety net)
                if (callRef.current) {
                    try {
                        await callRef.current.leave()
                        callRef.current.destroy()
                    } catch {
                        // ignore cleanup errors
                    }
                    callRef.current = null
                }

                // 3. Create the Daily iframe container
                const newCallObject = DailyIframe.createFrame(videoContainerRef.current, {
                    iframeStyle: {
                        width: '100%',
                        height: '100%',
                        border: '0',
                        borderRadius: '8px',
                    },
                    showLeaveButton: true,
                })

                callRef.current = newCallObject
                joinedRef.current = true

                // 4. Listen to events like leaving the call
                newCallObject.on('left-meeting', () => {
                    navigate(-1)
                })

                newCallObject.on('error', (e) => {
                    console.error('Daily error:', e)
                    setError('An error occurred with the video call.')
                })

                // 5. Join the call
                await newCallObject.join({ url: meetingLink, token })

                if (cancelled) {
                    newCallObject.leave().then(() => newCallObject.destroy())
                    callRef.current = null
                    return
                }

                setLoading(false)
            } catch (err: any) {
                if (cancelled) return
                console.error('Video consultation error:', err)
                setError(err.response?.data?.error || err.message || 'Failed to join the meeting')
                setLoading(false)
            }
        }

        joinMeeting()

        return () => {
            cancelled = true
            // Cleanup the call object when the component unmounts
            const call = callRef.current
            if (call) {
                call.leave().catch(() => { }).then(() => {
                    try { call.destroy() } catch { /* ignore */ }
                })
                callRef.current = null
            }
            joinedRef.current = false
        }
    }, [appointmentId, navigate])

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
                <div className="bg-red-50 text-red-600 p-6 rounded-lg max-w-md w-full text-center shadow-sm border border-red-100">
                    <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
                    <p className="text-sm mb-6">{error}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Consultation Room</h1>
                    <p className="text-sm text-gray-500">Your secure, private video session.</p>
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none"
                >
                    Back
                </button>
            </div>

            <div className="relative flex-grow w-full bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-200">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-75 z-10">
                        <Loader2 className="h-10 w-10 text-white animate-spin mb-4" />
                        <p className="text-white font-medium">Connecting to secure room...</p>
                    </div>
                )}
                <div ref={videoContainerRef} className="w-full h-full" />
            </div>
        </div>
    )
}

export default VideoConsultationPage
