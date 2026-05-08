import { useCallback, useEffect, useRef, useState } from 'react'
import socketService from '@/services/socketService'

export interface RemotePeer {
  socketId: string
  userId?: string
  stream: MediaStream | null
}

interface UseWebRTCOptions {
  roomId: string
  /** When true, the hook joins the room and acquires media. */
  enabled: boolean
  /** Optional STUN/TURN config; sensible default if omitted. */
  iceServers?: RTCIceServer[]
}

const DEFAULT_ICE: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

/**
 * WebRTC fallback hook.
 *
 * Multi-peer mesh — each remote socket gets its own RTCPeerConnection.
 * Existing peers send the offer when a new user joins (the joiner is callee
 * for each existing peer); this matches what the server's signaling expects.
 *
 * Cleans up media tracks + peer connections on unmount or when `enabled` flips false.
 */
export function useWebRTC({ roomId, enabled, iceServers }: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeer>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)

  // Refs to avoid stale closures inside long-lived listeners
  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const config = useRef<RTCConfiguration>({ iceServers: iceServers || DEFAULT_ICE })

  const updatePeer = useCallback((socketId: string, patch: Partial<RemotePeer>) => {
    setRemotePeers((prev) => {
      const next = new Map(prev)
      const cur = next.get(socketId) || { socketId, stream: null }
      next.set(socketId, { ...cur, ...patch })
      return next
    })
  }, [])

  const removePeer = useCallback((socketId: string) => {
    const pc = peersRef.current.get(socketId)
    if (pc) {
      try { pc.close() } catch { /* ignore */ }
      peersRef.current.delete(socketId)
    }
    setRemotePeers((prev) => {
      const next = new Map(prev)
      next.delete(socketId)
      return next
    })
  }, [])

  const createPeerConnection = useCallback((socketId: string, userId?: string): RTCPeerConnection => {
    // Reuse if exists
    const existing = peersRef.current.get(socketId)
    if (existing) return existing

    const pc = new RTCPeerConnection(config.current)

    // Add local tracks
    const local = localStreamRef.current
    if (local) {
      local.getTracks().forEach((track) => pc.addTrack(track, local))
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.rtcIceCandidate(roomId, socketId, event.candidate.toJSON())
      }
    }

    pc.ontrack = (event) => {
      const [stream] = event.streams
      if (stream) {
        updatePeer(socketId, { socketId, userId, stream })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
        // Let the user know but don't auto-remove — re-negotiation may recover.
      }
    }

    peersRef.current.set(socketId, pc)
    return pc
  }, [roomId, updatePeer])

  // Acquire local media + join room when enabled
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setConnecting(true)
    setError(null)

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        localStreamRef.current = stream
        setLocalStream(stream)

        // Now that we have local tracks, join the room. The signaling protocol
        // is: existing peers receive `video:user-joined` and create offers.
        socketService.rtcJoin(roomId)
      } catch (err: any) {
        if (cancelled) return
        setError(err?.message || 'Failed to access camera/microphone')
      } finally {
        if (!cancelled) setConnecting(false)
      }
    }
    start()

    return () => {
      cancelled = true
      // Stop tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop())
        localStreamRef.current = null
      }
      setLocalStream(null)
      // Close all peer connections
      peersRef.current.forEach((pc) => { try { pc.close() } catch { /* ignore */ } })
      peersRef.current.clear()
      setRemotePeers(new Map())
      // Tell the server we left
      socketService.rtcLeave(roomId)
    }
  }, [enabled, roomId])

  // Wire signaling listeners
  useEffect(() => {
    if (!enabled) return

    // A new peer joined — we (existing) initiate by sending an offer.
    const offUserJoined = socketService.onRtcUserJoined(async ({ roomId: r, socketId, userId }) => {
      if (r !== roomId) return
      // Ignore self-fire — should not happen since server excludes the sender, but be safe.
      if (socketId === socketService.getSocketId()) return
      try {
        const pc = createPeerConnection(socketId, userId)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socketService.rtcOffer(roomId, socketId, offer)
      } catch (err: any) {
        setError(err?.message || 'Failed to create offer')
      }
    })

    // Received an SDP offer — we are callee. Set remote, answer, send back.
    const offOffer = socketService.onRtcOffer(async ({ roomId: r, offer, from, userId }) => {
      if (r !== roomId) return
      try {
        const pc = createPeerConnection(from, userId)
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socketService.rtcAnswer(roomId, from, answer)
      } catch (err: any) {
        setError(err?.message || 'Failed to handle offer')
      }
    })

    // Received an answer to our offer.
    const offAnswer = socketService.onRtcAnswer(async ({ roomId: r, answer, from }) => {
      if (r !== roomId) return
      const pc = peersRef.current.get(from)
      if (!pc) return
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
      } catch (err: any) {
        setError(err?.message || 'Failed to set remote description')
      }
    })

    // Trickle ICE.
    const offIce = socketService.onRtcIceCandidate(async ({ roomId: r, candidate, from }) => {
      if (r !== roomId) return
      const pc = peersRef.current.get(from)
      if (!pc) return
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch {
        // Candidates can race with descriptions — silent retry usually unnecessary.
      }
    })

    // Peer left — clean up.
    const offLeft = socketService.onRtcUserLeft(({ roomId: r, socketId }) => {
      if (r !== roomId) return
      removePeer(socketId)
    })

    return () => {
      offUserJoined()
      offOffer()
      offAnswer()
      offIce()
      offLeft()
    }
  }, [enabled, roomId, createPeerConnection, removePeer])

  // Toggle helpers
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return
    const next = !muted
    localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !next })
    setMuted(next)
  }, [muted])

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return
    const next = !cameraOff
    localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = !next })
    setCameraOff(next)
  }, [cameraOff])

  return {
    localStream,
    remotePeers: Array.from(remotePeers.values()),
    connecting,
    error,
    muted,
    cameraOff,
    toggleMute,
    toggleCamera,
  }
}

export default useWebRTC
