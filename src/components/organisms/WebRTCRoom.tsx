import { FC, useEffect, useRef } from 'react'
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Loader2, AlertCircle } from 'lucide-react'
import useWebRTC, { RemotePeer } from '@/hooks/useWebRTC'

interface WebRTCRoomProps {
  /** The room id used for signaling. Must match the other peer. */
  roomId: string
  /** Called when the user clicks the leave button. Parent navigates away. */
  onLeave?: () => void
  className?: string
}

const WebRTCRoom: FC<WebRTCRoomProps> = ({ roomId, onLeave, className }) => {
  const {
    localStream,
    remotePeers,
    connecting,
    error,
    muted,
    cameraOff,
    toggleMute,
    toggleCamera,
  } = useWebRTC({ roomId, enabled: true })

  return (
    <div className={`relative w-full h-full bg-gray-900 ${className || ''}`}>
      {/* Loading / error overlay */}
      {connecting && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20 bg-black/60">
          <Loader2 className="w-8 h-8 animate-spin mb-2" />
          <p className="text-sm">Requesting camera & microphone…</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20 bg-black/70">
          <div className="bg-red-600/20 border border-red-500/40 rounded-lg p-4 max-w-sm text-center">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
            <p className="text-xs text-white/60 mt-2">Check that no other app is using the camera and that your browser has permission.</p>
          </div>
        </div>
      )}

      {/* Video grid — adapts from 1 to N peers */}
      <div className="absolute inset-0 grid gap-1 p-1" style={gridStyle(remotePeers.length + 1)}>
        {/* Local self-view */}
        <VideoTile stream={localStream} label="You" muted />
        {remotePeers.map((p) => (
          <VideoTile key={p.socketId} stream={p.stream} label={p.userId ? `User ${p.userId.slice(0, 6)}` : 'Participant'} />
        ))}
      </div>

      {/* Empty-state hint when alone in room */}
      {!connecting && !error && remotePeers.length === 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full">
          Waiting for the other party to join…
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-2 rounded-full">
        <ControlButton onClick={toggleMute} active={!muted} title={muted ? 'Unmute' : 'Mute'}>
          {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </ControlButton>
        <ControlButton onClick={toggleCamera} active={!cameraOff} title={cameraOff ? 'Camera on' : 'Camera off'}>
          {cameraOff ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
        </ControlButton>
        <button
          onClick={onLeave}
          className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-medium hover:bg-red-700"
          title="Leave"
        >
          <PhoneOff className="w-4 h-4" /> Leave
        </button>
      </div>
    </div>
  )
}

interface ControlButtonProps {
  onClick: () => void
  active: boolean
  title: string
  children: React.ReactNode
}

const ControlButton: FC<ControlButtonProps> = ({ onClick, active, title, children }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-2 rounded-full transition-colors ${active ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-red-600 text-white hover:bg-red-700'}`}
  >
    {children}
  </button>
)

interface VideoTileProps {
  stream: MediaStream | null
  label: string
  muted?: boolean
}

const VideoTile: FC<VideoTileProps> = ({ stream, label, muted }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={!!muted}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
        {label}
      </div>
    </div>
  )
}

// Choose a grid template based on participant count.
function gridStyle(count: number): React.CSSProperties {
  if (count <= 1) return { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' }
  if (count === 2) return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr' }
  if (count <= 4) return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }
  return { gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)' }
}

export default WebRTCRoom
